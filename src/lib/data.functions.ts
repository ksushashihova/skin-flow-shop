// All remaining data CRUD operations as server functions (Drizzle).
import { createServerFn } from "@tanstack/react-start";
import { requireAuth, requireAdmin } from "./auth-middleware.server";
import { db } from "@/db/index.server";
import {
  categories, products, banners, posts, reviews, bundles, bundleItems,
  orders, profiles, userRoles, promos, subscribers, consents, giftCards,
} from "@/db/schema";
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";

const toISO = (d: Date | string | null | undefined): string | undefined =>
  d ? (d instanceof Date ? d.toISOString() : d) : undefined;

/* ============ profiles / me ============ */
export const getMeFn = createServerFn({ method: "GET" })
  .handler(async () => {
    // Optional auth: returns null if not signed in
    const { auth } = await import("./auth.server");
    const { getRequest } = await import("@tanstack/react-start/server");
    const req = getRequest();
    if (!req?.headers) return null;
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) return null;
    const uid = session.user.id;
    const [p] = await db.select().from(profiles).where(eq(profiles.id, uid)).limit(1);
    if (!p) return null;
    const roles = await db.select({ role: userRoles.role }).from(userRoles).where(eq(userRoles.userId, uid));
    const role = roles.some((r) => r.role === "admin") ? "admin" : "user";
    return {
      id: p.id, email: p.email, role,
      name: p.name || "", phone: p.phone ?? undefined,
      bonusBalance: p.bonusBalance, totalSpent: p.totalSpent,
      createdAt: toISO(p.createdAt)!,
    };
  });

export const updateMeFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { name?: string; phone?: string }) => d)
  .handler(async ({ data, context }) => {
    const upd: Record<string, unknown> = {};
    if (data.name !== undefined) upd.name = data.name;
    if (data.phone !== undefined) upd.phone = data.phone;
    if (Object.keys(upd).length) {
      await db.update(profiles).set(upd).where(eq(profiles.id, context.userId));
    }
    return { ok: true as const };
  });

/* ============ products ============ */
export const listProductsFn = createServerFn({ method: "GET" })
  .inputValidator((d: { query?: string; categoryId?: string }) => d)
  .handler(async ({ data }) => {
  .handler(async ({ data }) => {
    const conds = [] as ReturnType<typeof eq>[];

    if (data.categoryId) conds.push(eq(products.categoryId, data.categoryId));
    if (data.query?.trim()) {
      const q = `%${data.query.trim()}%`;
      conds.push(
        or(
          ilike(products.nameRu, q),
          ilike(products.nameEn, q),
          ilike(products.taglineRu, q),
          ilike(products.taglineEn, q),
        )!,
      );
    }

    console.log("[listProductsFn] input:", data);

    const rows = await db
      .select()
      .from(products)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(products.createdAt));

    console.log("[listProductsFn] rows count:", rows.length);
    return rows.map((r) => ({
      id: r.id, slug: r.slug,
      name_ru: r.nameRu, name_en: r.nameEn,
      tagline_ru: r.taglineRu, tagline_en: r.taglineEn,
      description_ru: r.descriptionRu, description_en: r.descriptionEn,
      price: r.price, images: r.images || [], stock: r.stock, category: r.categoryId,
      videoUrl: r.videoUrl ?? undefined, howToUse: r.howToUse ?? undefined,
    }));
  });

export const getProductFn = createServerFn({ method: "GET" })
  .inputValidator((d: { idOrSlug: string }) => d)
  .handler(async ({ data }) => {
    const [r] = await db.select().from(products)
      .where(or(eq(products.id, data.idOrSlug), eq(products.slug, data.idOrSlug)))
      .limit(1);
    if (!r) return null;
    return {
      id: r.id, slug: r.slug,
      name_ru: r.nameRu, name_en: r.nameEn,
      tagline_ru: r.taglineRu, tagline_en: r.taglineEn,
      description_ru: r.descriptionRu, description_en: r.descriptionEn,
      price: r.price, images: r.images || [], stock: r.stock, category: r.categoryId,
      videoUrl: r.videoUrl ?? undefined, howToUse: r.howToUse ?? undefined,
    };
  });

export const adminCreateProductFn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: Record<string, unknown> & { slug?: string }) => d)
  .handler(async ({ data }) => {
    const id = "p_" + Math.random().toString(36).slice(2, 8);
    const slug = ((data.slug as string) || "").trim() || id;
    const [r] = await db.insert(products).values({
      id, slug,
      nameRu: data.name_ru as string, nameEn: data.name_en as string,
      taglineRu: (data.tagline_ru as string) ?? "", taglineEn: (data.tagline_en as string) ?? "",
      descriptionRu: (data.description_ru as string) ?? "", descriptionEn: (data.description_en as string) ?? "",
      price: Number(data.price ?? 0),
      images: (data.images as string[]) ?? [],
      stock: Number(data.stock ?? 0),
      categoryId: data.category as string,
      videoUrl: (data.videoUrl as string) ?? null,
      howToUse: (data.howToUse as string) ?? null,
    }).returning();
    return {
      id: r.id, slug: r.slug, name_ru: r.nameRu, name_en: r.nameEn,
      tagline_ru: r.taglineRu, tagline_en: r.taglineEn,
      description_ru: r.descriptionRu, description_en: r.descriptionEn,
      price: r.price, images: r.images || [], stock: r.stock, category: r.categoryId,
      videoUrl: r.videoUrl ?? undefined, howToUse: r.howToUse ?? undefined,
    };
  });

export const adminUpdateProductFn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { id: string; patch: Record<string, unknown> }) => d)
  .handler(async ({ data }) => {
    const p = data.patch;
    const upd: Record<string, unknown> = {};
    if (p.slug !== undefined) upd.slug = p.slug;
    if (p.name_ru !== undefined) upd.nameRu = p.name_ru;
    if (p.name_en !== undefined) upd.nameEn = p.name_en;
    if (p.tagline_ru !== undefined) upd.taglineRu = p.tagline_ru;
    if (p.tagline_en !== undefined) upd.taglineEn = p.tagline_en;
    if (p.description_ru !== undefined) upd.descriptionRu = p.description_ru;
    if (p.description_en !== undefined) upd.descriptionEn = p.description_en;
    if (p.price !== undefined) upd.price = p.price;
    if (p.images !== undefined) upd.images = p.images;
    if (p.stock !== undefined) upd.stock = p.stock;
    if (p.category !== undefined) upd.categoryId = p.category;
    if (p.videoUrl !== undefined) upd.videoUrl = p.videoUrl;
    if (p.howToUse !== undefined) upd.howToUse = p.howToUse;
    const [r] = await db.update(products).set(upd).where(eq(products.id, data.id)).returning();
    return {
      id: r.id, slug: r.slug, name_ru: r.nameRu, name_en: r.nameEn,
      tagline_ru: r.taglineRu, tagline_en: r.taglineEn,
      description_ru: r.descriptionRu, description_en: r.descriptionEn,
      price: r.price, images: r.images || [], stock: r.stock, category: r.categoryId,
      videoUrl: r.videoUrl ?? undefined, howToUse: r.howToUse ?? undefined,
    };
  });

export const adminDeleteProductFn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    await db.delete(products).where(eq(products.id, data.id));
    return { ok: true as const };
  });

/* ============ categories ============ */
export const listCategoriesFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const rows = await db.select().from(categories).orderBy(asc(categories.sortOrder));
    return rows.map((r) => ({ id: r.id, name_ru: r.nameRu, name_en: r.nameEn }));
  });

export const adminCreateCategoryFn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { name_ru: string; name_en: string; id?: string }) => d)
  .handler(async ({ data }) => {
    const id = (data.id || data.name_ru || "cat").toLowerCase().trim()
      .replace(/[^a-z0-9а-я]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 32) || "cat_" + Math.random().toString(36).slice(2, 6);
    const [r] = await db.insert(categories).values({ id, nameRu: data.name_ru, nameEn: data.name_en || data.name_ru }).returning();
    return { id: r.id, name_ru: r.nameRu, name_en: r.nameEn };
  });

export const adminUpdateCategoryFn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { id: string; patch: { name_ru?: string; name_en?: string } }) => d)
  .handler(async ({ data }) => {
    const upd: Record<string, unknown> = {};
    if (data.patch.name_ru !== undefined) upd.nameRu = data.patch.name_ru;
    if (data.patch.name_en !== undefined) upd.nameEn = data.patch.name_en;
    const [r] = await db.update(categories).set(upd).where(eq(categories.id, data.id)).returning();
    return { id: r.id, name_ru: r.nameRu, name_en: r.nameEn };
  });

export const adminDeleteCategoryFn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(products).where(eq(products.categoryId, data.id));
    if (count > 0) throw new Error("Нельзя удалить категорию: к ней привязаны товары");
    await db.delete(categories).where(eq(categories.id, data.id));
    return { ok: true as const };
  });

/* ============ orders ============ */
const mapOrder = (r: typeof orders.$inferSelect) => ({
  id: r.id, userId: r.userId, userEmail: r.userEmail, status: r.status,
  totalPrice: r.totalPrice,
  items: r.items as unknown as { productId: string; name: string; quantity: number; price: number; image?: string }[],
  address: { city: r.city, addressLine: r.addressLine, postalCode: r.postalCode },
  paymentMethod: r.paymentMethod, deliveryMethod: r.deliveryMethod, deliveryPrice: r.deliveryPrice,
  bonusUsed: r.bonusUsed, bonusEarned: r.bonusEarned,
  promoUsed: r.promoUsed ?? undefined, promoDiscount: r.promoDiscount,
  trackingNumber: r.trackingNumber ?? undefined,
  estimatedDelivery: toISO(r.estimatedDelivery),
  createdAt: toISO(r.createdAt)!, updatedAt: toISO(r.updatedAt)!,
});

export const listOrdersFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const rows = await db.select().from(orders).where(eq(orders.userId, context.userId)).orderBy(desc(orders.createdAt));
    return rows.map(mapOrder);
  });

export const getOrderFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const [r] = await db.select().from(orders).where(eq(orders.id, data.id)).limit(1);
    if (!r) return null;
    if (r.userId !== context.userId) {
      // admin can read any
      const isAdmin = (await db.select().from(userRoles).where(and(eq(userRoles.userId, context.userId), eq(userRoles.role, "admin"))).limit(1)).length > 0;
      if (!isAdmin) throw new Error("Нет доступа");
    }
    return mapOrder(r);
  });

export const adminListOrdersFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const rows = await db.select().from(orders).orderBy(desc(orders.createdAt));
    return rows.map(mapOrder);
  });

export const adminUpdateOrderFn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { id: string; status: "new"|"paid"|"shipped"|"completed"|"cancelled" }) => d)
  .handler(async ({ data }) => {
    const [r] = await db.update(orders).set({ status: data.status }).where(eq(orders.id, data.id)).returning();
    return mapOrder(r);
  });

export const adminUpdateOrderTrackingFn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { id: string; trackingNumber: string; estimatedDelivery?: string }) => d)
  .handler(async ({ data }) => {
    const upd: Record<string, unknown> = { trackingNumber: data.trackingNumber };
    if (data.estimatedDelivery) upd.estimatedDelivery = new Date(data.estimatedDelivery);
    const [r] = await db.update(orders).set(upd).where(eq(orders.id, data.id)).returning();
    return mapOrder(r);
  });

export const adminGetUserOrdersFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data }) => {
    const rows = await db.select().from(orders).where(eq(orders.userId, data.userId)).orderBy(desc(orders.createdAt));
    return rows.map(mapOrder);
  });

/* ============ posts ============ */
const mapPost = (r: typeof posts.$inferSelect) => ({
  slug: r.slug, title: r.title, excerpt: r.excerpt, cover: r.cover,
  category: r.category, date: toISO(r.publishedAt)!, body: r.body || [],
  images: r.images || [], videoUrl: r.videoUrl ?? undefined,
});

export const listPostsFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const rows = await db.select().from(posts).orderBy(desc(posts.publishedAt));
    return rows.map(mapPost);
  });
export const getPostFn = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => d)
  .handler(async ({ data }) => {
    const [r] = await db.select().from(posts).where(eq(posts.slug, data.slug)).limit(1);
    return r ? mapPost(r) : null;
  });

const postPatchToRow = (p: Record<string, unknown>) => {
  const o: Record<string, unknown> = {};
  if (p.title !== undefined) o.title = p.title;
  if (p.excerpt !== undefined) o.excerpt = p.excerpt;
  if (p.cover !== undefined) o.cover = p.cover;
  if (p.category !== undefined) o.category = p.category;
  if (p.body !== undefined) o.body = p.body;
  if (p.images !== undefined) o.images = p.images;
  if (p.videoUrl !== undefined) o.videoUrl = p.videoUrl;
  if (p.date !== undefined) o.publishedAt = new Date(p.date as string);
  return o;
};

export const adminCreatePostFn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: Record<string, unknown> & { slug?: string }) => d)
  .handler(async ({ data }) => {
    const slug = ((data.slug as string) || "").trim() || "post-" + Math.random().toString(36).slice(2, 8);
    const row = postPatchToRow(data);
    const [r] = await db.insert(posts).values({
      slug,
      title: (row.title as string) ?? "",
      excerpt: (row.excerpt as string) ?? "",
      cover: (row.cover as string) ?? "",
      category: (row.category as string) ?? "",
      body: (row.body as string[]) ?? [],
      images: (row.images as string[]) ?? [],
      videoUrl: (row.videoUrl as string) ?? null,
      publishedAt: (row.publishedAt as Date) ?? new Date(),
    }).returning();
    return mapPost(r);
  });

export const adminUpdatePostFn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { slug: string; patch: Record<string, unknown> }) => d)
  .handler(async ({ data }) => {
    const [r] = await db.update(posts).set(postPatchToRow(data.patch)).where(eq(posts.slug, data.slug)).returning();
    return mapPost(r);
  });

export const adminDeletePostFn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { slug: string }) => d)
  .handler(async ({ data }) => {
    await db.delete(posts).where(eq(posts.slug, data.slug));
    return { ok: true as const };
  });

/* ============ reviews ============ */
const mapReview = (r: typeof reviews.$inferSelect) => ({
  id: r.id, productId: r.productId, userId: r.userId ?? undefined,
  authorName: r.authorName, rating: r.rating, text: r.text,
  photos: r.photos || [], createdAt: toISO(r.createdAt)!,
});

export const listReviewsFn = createServerFn({ method: "GET" })
  .inputValidator((d: { productId: string }) => d)
  .handler(async ({ data }) => {
    const rows = await db.select().from(reviews).where(eq(reviews.productId, data.productId)).orderBy(desc(reviews.createdAt));
    return rows.map(mapReview);
  });

export const addReviewFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { productId: string; authorName: string; rating: number; text: string; photos: string[] }) => d)
  .handler(async ({ data, context }) => {
    const id = "r_" + Math.random().toString(36).slice(2, 8);
    const [r] = await db.insert(reviews).values({
      id, productId: data.productId, userId: context.userId,
      authorName: data.authorName, rating: data.rating, text: data.text, photos: data.photos || [],
    }).returning();
    return mapReview(r);
  });

export const adminListReviewsFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const rows = await db.select().from(reviews).orderBy(desc(reviews.createdAt));
    return rows.map(mapReview);
  });

export const adminDeleteReviewFn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    await db.delete(reviews).where(eq(reviews.id, data.id));
    return { ok: true as const };
  });

/* ============ bundles ============ */
async function loadBundles() {
  const [bs, bis] = await Promise.all([
    db.select().from(bundles).orderBy(desc(bundles.createdAt)),
    db.select().from(bundleItems).orderBy(asc(bundleItems.position)),
  ]);
  return bs.map((b) => ({
    id: b.id, slug: b.slug, name: b.name, description: b.description,
    cover: b.cover, discountPercent: b.discountPercent,
    productIds: bis.filter((i) => i.bundleId === b.id).map((i) => i.productId),
  }));
}

export const listBundlesFn = createServerFn({ method: "GET" }).handler(async () => loadBundles());
export const getBundleFn = createServerFn({ method: "GET" })
  .inputValidator((d: { idOrSlug: string }) => d)
  .handler(async ({ data }) => {
    const all = await loadBundles();
    return all.find((b) => b.id === data.idOrSlug || b.slug === data.idOrSlug) ?? null;
  });

export const adminCreateBundleFn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { name: string; description: string; cover: string; discountPercent: number; productIds: string[]; slug?: string }) => d)
  .handler(async ({ data }) => {
    const id = "b_" + Math.random().toString(36).slice(2, 8);
    const slug = data.slug?.trim() || id;
    await db.insert(bundles).values({
      id, slug, name: data.name, description: data.description,
      cover: data.cover, discountPercent: data.discountPercent,
    });
    if (data.productIds.length) {
      await db.insert(bundleItems).values(data.productIds.map((pid, i) => ({ bundleId: id, productId: pid, position: i })));
    }
    return { id, slug, name: data.name, description: data.description, cover: data.cover, discountPercent: data.discountPercent, productIds: data.productIds };
  });

export const adminUpdateBundleFn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { id: string; patch: Record<string, unknown> }) => d)
  .handler(async ({ data }) => {
    const p = data.patch;
    const upd: Record<string, unknown> = {};
    if (p.name !== undefined) upd.name = p.name;
    if (p.description !== undefined) upd.description = p.description;
    if (p.cover !== undefined) upd.cover = p.cover;
    if (p.discountPercent !== undefined) upd.discountPercent = p.discountPercent;
    if (p.slug !== undefined) upd.slug = p.slug;
    if (Object.keys(upd).length) await db.update(bundles).set(upd).where(eq(bundles.id, data.id));
    if (Array.isArray(p.productIds)) {
      await db.delete(bundleItems).where(eq(bundleItems.bundleId, data.id));
      const ids = p.productIds as string[];
      if (ids.length) {
        await db.insert(bundleItems).values(ids.map((pid, i) => ({ bundleId: data.id, productId: pid, position: i })));
      }
    }
    const all = await loadBundles();
    return all.find((b) => b.id === data.id)!;
  });

export const adminDeleteBundleFn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    await db.delete(bundleItems).where(eq(bundleItems.bundleId, data.id));
    await db.delete(bundles).where(eq(bundles.id, data.id));
    return { ok: true as const };
  });

/* ============ banners ============ */
const mapBanner = (r: typeof banners.$inferSelect) => ({
  id: r.id, title: r.title, subtitle: r.subtitle, image: r.image,
  ctaLabel: r.ctaLabel, ctaHref: r.ctaHref, textColor: r.textColor,
  enabled: r.enabled, order: r.sortOrder,
});
const bannerPatchToRow = (b: Record<string, unknown>) => {
  const o: Record<string, unknown> = {};
  if (b.title !== undefined) o.title = b.title;
  if (b.subtitle !== undefined) o.subtitle = b.subtitle;
  if (b.image !== undefined) o.image = b.image;
  if (b.ctaLabel !== undefined) o.ctaLabel = b.ctaLabel;
  if (b.ctaHref !== undefined) o.ctaHref = b.ctaHref;
  if (b.textColor !== undefined) o.textColor = b.textColor;
  if (b.enabled !== undefined) o.enabled = b.enabled;
  if (b.order !== undefined) o.sortOrder = b.order;
  return o;
};

export const listBannersFn = createServerFn({ method: "GET" }).handler(async () => {
  const rows = await db.select().from(banners).orderBy(asc(banners.sortOrder));
  return rows.map(mapBanner);
});
export const adminCreateBannerFn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: Record<string, unknown>) => d)
  .handler(async ({ data }) => {
    const id = "bn_" + Math.random().toString(36).slice(2, 8);
    const row = bannerPatchToRow(data);
    const [r] = await db.insert(banners).values({
      id,
      title: (row.title as string) ?? "",
      subtitle: (row.subtitle as string) ?? "",
      image: (row.image as string) ?? "",
      ctaLabel: (row.ctaLabel as string) ?? "",
      ctaHref: (row.ctaHref as string) ?? "/",
      textColor: (row.textColor as "light"|"dark") ?? "light",
      enabled: (row.enabled as boolean) ?? true,
      sortOrder: (row.sortOrder as number) ?? 0,
    }).returning();
    return mapBanner(r);
  });
export const adminUpdateBannerFn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { id: string; patch: Record<string, unknown> }) => d)
  .handler(async ({ data }) => {
    const [r] = await db.update(banners).set(bannerPatchToRow(data.patch)).where(eq(banners.id, data.id)).returning();
    return mapBanner(r);
  });
export const adminDeleteBannerFn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    await db.delete(banners).where(eq(banners.id, data.id));
    return { ok: true as const };
  });

/* ============ promos / subscribers / gift cards (admin lists) ============ */
export const adminListPromosFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const rows = await db.select().from(promos).orderBy(desc(promos.createdAt));
    return rows.map((r) => ({
      code: r.code, percent: r.percent ?? undefined, amount: r.amount ?? undefined,
      description: r.description, usesLeft: r.usesLeft ?? undefined,
    }));
  });
export const adminCreatePromoFn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { code: string; percent?: number; amount?: number; description?: string; usesLeft?: number }) => d)
  .handler(async ({ data }) => {
    const code = data.code.trim().toUpperCase();
    if (!code) throw new Error("Код промокода обязателен");
    if (!data.percent && !data.amount) throw new Error("Укажите процент или фиксированную сумму");
    try {
      await db.insert(promos).values({
        code, percent: data.percent ?? null, amount: data.amount ?? null,
        description: data.description || `Скидка ${data.percent ? data.percent + "%" : data.amount + " ₽"}`,
        usesLeft: data.usesLeft ?? null,
      });
    } catch (e) {
      const msg = (e as { code?: string; message?: string }).code === "23505"
        ? "Промокод с таким кодом уже существует"
        : (e as Error).message;
      throw new Error(msg);
    }
    return { code, percent: data.percent, amount: data.amount, description: data.description ?? "", usesLeft: data.usesLeft };
  });
export const adminDeletePromoFn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { code: string }) => d)
  .handler(async ({ data }) => {
    await db.delete(promos).where(eq(promos.code, data.code));
    return { ok: true as const };
  });

export const subscribeFn = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; consent: boolean }) => d)
  .handler(async ({ data }) => {
    if (!data.consent) throw new Error("Необходимо согласие на обработку данных");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw new Error("Некорректный email");
    try {
      await db.insert(subscribers).values({ email: data.email, consent: data.consent, promoCode: "WELCOME10" });
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === "23505") throw new Error("Вы уже подписаны");
      throw new Error((e as Error).message);
    }
    try { await db.insert(consents).values({ email: data.email, kind: "marketing" }); } catch { /* ignore */ }
    return {
      subscriber: { email: data.email, consent: data.consent, promoCode: "WELCOME10", createdAt: new Date().toISOString() },
      promo: { code: "WELCOME10", percent: 10, description: "Скидка 10% за подписку на рассылку" },
    };
  });

export const adminListSubscribersFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const rows = await db.select().from(subscribers).orderBy(desc(subscribers.createdAt));
    return rows.map((r) => ({
      email: r.email, consent: r.consent, promoCode: r.promoCode || "", createdAt: toISO(r.createdAt)!,
    }));
  });

export const adminListGiftCardsFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const rows = await db.select().from(giftCards).orderBy(desc(giftCards.createdAt));
    return rows.map((r) => ({
      code: r.code, amount: r.amount, remaining: r.remaining,
      design: r.design as "minimal"|"floral",
      recipientEmail: r.recipientEmail, message: r.message ?? undefined,
      buyerUserId: r.buyerUserId ?? undefined, createdAt: toISO(r.createdAt)!,
    }));
  });

/* ============ product stock check (used by addToCart) ============ */
export const getProductStockFn = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const [r] = await db.select({ stock: products.stock }).from(products).where(eq(products.id, data.id)).limit(1);
    return r ? { stock: r.stock } : null;
  });

void inArray;
