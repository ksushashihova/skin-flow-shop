// API layer backed by Lovable Cloud (Postgres + Supabase Auth).
// Public interface kept stable so all components keep working unchanged.
// Cart remains in localStorage (anonymous-friendly).
//
// Sensitive operations (createOrder, checkPromo, createGiftCard) are in
// src/lib/*.functions.ts as createServerFn handlers.

import { supabase } from "@/integrations/supabase/client";
import {
  createOrderFn,
  cancelOrderFn,
  checkPromoFn,
  createGiftCardFn,
  adminListUsersFn,
} from "./server.functions";

/* ===================== Types (unchanged) ===================== */

export type Role = "guest" | "user" | "admin";
export type OrderStatus = "new" | "paid" | "shipped" | "completed" | "cancelled";
export type PaymentMethod = "card_online" | "card_on_delivery" | "sbp" | "cash";
export type DeliveryMethod = "pickup" | "courier" | "post" | "cdek";
export type BonusTier = "silver" | "gold" | "platinum";

export interface User {
  id: string;
  email: string;
  role: Role;
  name: string;
  phone?: string;
  bonusBalance: number;
  totalSpent: number;
  createdAt: string;
}

export const BONUS_RATE = 0.05;

export const TIERS: { id: BonusTier; label: string; min: number; rate: number; perks: string[] }[] = [
  { id: "silver", label: "СЕРЕБРО", min: 0, rate: 0.05, perks: ["5% бонусов с каждого заказа"] },
  { id: "gold", label: "ЗОЛОТО", min: 10000, rate: 0.07, perks: ["7% бонусов", "Приоритетная поддержка"] },
  { id: "platinum", label: "ПЛАТИНА", min: 50000, rate: 0.10, perks: ["10% бонусов", "Бесплатная доставка", "Ранний доступ к новинкам"] },
];

export function tierFor(totalSpent: number): typeof TIERS[number] {
  return [...TIERS].reverse().find((t) => totalSpent >= t.min) ?? TIERS[0];
}

export interface Product {
  id: string; slug: string;
  name_ru: string; name_en: string;
  tagline_ru: string; tagline_en: string;
  description_ru: string; description_en: string;
  price: number; images: string[]; stock: number;
  category: string;
  videoUrl?: string; howToUse?: string;
}
export interface ProductCategory { id: string; name_ru: string; name_en: string }
export interface CartItem { id: string; productId?: string; bundleId?: string; quantity: number }
export interface OrderItem { productId: string; name: string; quantity: number; price: number; image?: string }
export interface TrackingStage { key: "placed"|"packed"|"shipped"|"delivered"; label: string; date?: string; done: boolean }
export interface Order {
  id: string; userId: string; userEmail: string;
  status: OrderStatus; totalPrice: number; items: OrderItem[];
  address: { city: string; addressLine: string; postalCode: string };
  paymentMethod: PaymentMethod; deliveryMethod: DeliveryMethod;
  deliveryPrice: number; bonusUsed: number; bonusEarned: number;
  promoUsed?: string; promoDiscount: number;
  trackingNumber?: string; estimatedDelivery?: string;
  createdAt: string; updatedAt: string;
}
export interface Address { id: string; userId: string; city: string; addressLine: string; postalCode: string }
export interface Post {
  slug: string; title: string; excerpt: string; cover: string;
  category: string; date: string; body: string[];
  images?: string[]; videoUrl?: string;
}
export interface Review { id: string; productId: string; userId?: string; authorName: string; rating: number; text: string; photos: string[]; createdAt: string }
export interface Bundle { id: string; slug: string; name: string; description: string; productIds: string[]; cover: string; discountPercent: number }
export interface GiftCard { code: string; amount: number; design: "minimal"|"floral"; recipientEmail: string; message?: string; buyerUserId?: string; remaining: number; createdAt: string }
export interface PromoCode { code: string; percent?: number; amount?: number; description: string; usesLeft?: number }
export interface Subscriber { email: string; consent: boolean; promoCode: string; createdAt: string }
export interface Banner { id: string; title: string; subtitle: string; image: string; ctaLabel: string; ctaHref: string; textColor: "light"|"dark"; enabled: boolean; order: number }

/* ===================== Helpers ===================== */

export const DELIVERY_PRICES: Record<DeliveryMethod, number> = { pickup: 0, courier: 390, post: 290, cdek: 350 };
const TRACKING_LINKS: Partial<Record<DeliveryMethod, (n: string) => string>> = {
  cdek: (n) => `https://www.cdek.ru/ru/tracking/?order_id=${encodeURIComponent(n)}`,
  post: (n) => `https://www.pochta.ru/tracking#${encodeURIComponent(n)}`,
};
export function trackingUrlFor(o: Order): string | null {
  if (!o.trackingNumber) return null;
  const fn = TRACKING_LINKS[o.deliveryMethod];
  return fn ? fn(o.trackingNumber) : null;
}
export function trackingStagesFor(o: Order): TrackingStage[] {
  const order = ["new", "paid", "shipped", "completed"] as const;
  const idx = (s: OrderStatus) => order.indexOf(s as typeof order[number]);
  const cur = o.status === "cancelled" ? -1 : idx(o.status);
  const fmt = (iso?: string) => iso ? new Date(iso).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) : undefined;
  return [
    { key: "placed", label: "Оформлен", date: fmt(o.createdAt), done: cur >= 0 },
    { key: "packed", label: "Собран", date: cur >= 1 ? fmt(o.updatedAt) : undefined, done: cur >= 1 },
    { key: "shipped", label: "В пути", date: cur >= 2 ? fmt(o.updatedAt) : undefined, done: cur >= 2 },
    { key: "delivered", label: "Доставлен", date: cur >= 3 ? fmt(o.updatedAt) : undefined, done: cur >= 3 },
  ];
}

function emit(name: string) { if (typeof window !== "undefined") window.dispatchEvent(new Event(name)); }
const emitAuthChange = () => emit("oblako-auth-change");
const emitCartChange = () => emit("oblako-cart-change");

/* ----- mappers ----- */

type ProductRow = {
  id: string; slug: string; name_ru: string; name_en: string;
  tagline_ru: string; tagline_en: string; description_ru: string; description_en: string;
  price: number; images: string[]; stock: number; category_id: string;
  video_url: string | null; how_to_use: string | null;
};
const mapProduct = (r: ProductRow): Product => ({
  id: r.id, slug: r.slug,
  name_ru: r.name_ru, name_en: r.name_en,
  tagline_ru: r.tagline_ru, tagline_en: r.tagline_en,
  description_ru: r.description_ru, description_en: r.description_en,
  price: r.price, images: r.images || [], stock: r.stock, category: r.category_id,
  videoUrl: r.video_url ?? undefined, howToUse: r.how_to_use ?? undefined,
});
const productToRow = (p: Partial<Product>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  if (p.slug !== undefined) out.slug = p.slug;
  if (p.name_ru !== undefined) out.name_ru = p.name_ru;
  if (p.name_en !== undefined) out.name_en = p.name_en;
  if (p.tagline_ru !== undefined) out.tagline_ru = p.tagline_ru;
  if (p.tagline_en !== undefined) out.tagline_en = p.tagline_en;
  if (p.description_ru !== undefined) out.description_ru = p.description_ru;
  if (p.description_en !== undefined) out.description_en = p.description_en;
  if (p.price !== undefined) out.price = p.price;
  if (p.images !== undefined) out.images = p.images;
  if (p.stock !== undefined) out.stock = p.stock;
  if (p.category !== undefined) out.category_id = p.category;
  if (p.videoUrl !== undefined) out.video_url = p.videoUrl;
  if (p.howToUse !== undefined) out.how_to_use = p.howToUse;
  return out;
};

type BannerRow = { id: string; title: string; subtitle: string; image: string; cta_label: string; cta_href: string; text_color: "light"|"dark"; enabled: boolean; sort_order: number };
const mapBanner = (r: BannerRow): Banner => ({
  id: r.id, title: r.title, subtitle: r.subtitle, image: r.image,
  ctaLabel: r.cta_label, ctaHref: r.cta_href,
  textColor: r.text_color, enabled: r.enabled, order: r.sort_order,
});
const bannerToRow = (b: Partial<Banner>): Record<string, unknown> => {
  const o: Record<string, unknown> = {};
  if (b.title !== undefined) o.title = b.title;
  if (b.subtitle !== undefined) o.subtitle = b.subtitle;
  if (b.image !== undefined) o.image = b.image;
  if (b.ctaLabel !== undefined) o.cta_label = b.ctaLabel;
  if (b.ctaHref !== undefined) o.cta_href = b.ctaHref;
  if (b.textColor !== undefined) o.text_color = b.textColor;
  if (b.enabled !== undefined) o.enabled = b.enabled;
  if (b.order !== undefined) o.sort_order = b.order;
  return o;
};

type PostRow = { slug: string; title: string; excerpt: string; cover: string; category: string; published_at: string; body: string[]; images: string[]; video_url: string | null };
const mapPost = (r: PostRow): Post => ({
  slug: r.slug, title: r.title, excerpt: r.excerpt, cover: r.cover,
  category: r.category, date: r.published_at, body: r.body || [],
  images: r.images || [], videoUrl: r.video_url ?? undefined,
});
const postToRow = (p: Partial<Post>): Record<string, unknown> => {
  const o: Record<string, unknown> = {};
  if (p.title !== undefined) o.title = p.title;
  if (p.excerpt !== undefined) o.excerpt = p.excerpt;
  if (p.cover !== undefined) o.cover = p.cover;
  if (p.category !== undefined) o.category = p.category;
  if (p.body !== undefined) o.body = p.body;
  if (p.images !== undefined) o.images = p.images;
  if (p.videoUrl !== undefined) o.video_url = p.videoUrl;
  if (p.date !== undefined) o.published_at = p.date;
  return o;
};

type ReviewRow = { id: string; product_id: string; user_id: string | null; author_name: string; rating: number; text: string; photos: string[]; created_at: string };
const mapReview = (r: ReviewRow): Review => ({
  id: r.id, productId: r.product_id, userId: r.user_id ?? undefined,
  authorName: r.author_name, rating: r.rating, text: r.text,
  photos: r.photos || [], createdAt: r.created_at,
});

type OrderRow = {
  id: string; user_id: string; user_email: string; status: OrderStatus;
  total_price: number; items: OrderItem[]; city: string; address_line: string; postal_code: string;
  payment_method: PaymentMethod; delivery_method: DeliveryMethod; delivery_price: number;
  bonus_used: number; bonus_earned: number; promo_used: string | null; promo_discount: number;
  tracking_number: string | null; estimated_delivery: string | null;
  created_at: string; updated_at: string;
};
const mapOrder = (r: OrderRow): Order => ({
  id: r.id, userId: r.user_id, userEmail: r.user_email, status: r.status,
  totalPrice: r.total_price, items: r.items as OrderItem[],
  address: { city: r.city, addressLine: r.address_line, postalCode: r.postal_code },
  paymentMethod: r.payment_method, deliveryMethod: r.delivery_method, deliveryPrice: r.delivery_price,
  bonusUsed: r.bonus_used, bonusEarned: r.bonus_earned,
  promoUsed: r.promo_used ?? undefined, promoDiscount: r.promo_discount,
  trackingNumber: r.tracking_number ?? undefined,
  estimatedDelivery: r.estimated_delivery ?? undefined,
  createdAt: r.created_at, updatedAt: r.updated_at,
});

/* ----- bundles helper ----- */
function bundlePriceCalc(b: Bundle, products: Product[]): { full: number; discounted: number } {
  const full = b.productIds.reduce((s, id) => {
    const p = products.find((x) => x.id === id);
    return s + (p?.price ?? 0);
  }, 0);
  return { full, discounted: Math.round(full * (1 - b.discountPercent / 100)) };
}

async function loadBundlesWithItems(): Promise<Bundle[]> {
  const [{ data: bundlesData }, { data: itemsData }] = await Promise.all([
    supabase.from("bundles").select("*").order("created_at", { ascending: false }),
    supabase.from("bundle_items").select("*").order("position", { ascending: true }),
  ]);
  const items = (itemsData || []) as { bundle_id: string; product_id: string; position: number }[];
  return ((bundlesData || []) as { id: string; slug: string; name: string; description: string; cover: string; discount_percent: number }[]).map((b) => ({
    id: b.id, slug: b.slug, name: b.name, description: b.description,
    cover: b.cover, discountPercent: b.discount_percent,
    productIds: items.filter((i) => i.bundle_id === b.id).map((i) => i.product_id),
  }));
}

/* ===================== Cart (localStorage) ===================== */

const CART_KEY = "oblako_cart_v1";
function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); } catch { return []; }
}
function saveCart(items: CartItem[]) {
  if (typeof window !== "undefined") localStorage.setItem(CART_KEY, JSON.stringify(items));
  emitCartChange();
}

/* ===================== Auth helpers ===================== */

async function getCurrentUser(): Promise<User | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const uid = session.user.id;
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", uid),
  ]);
  if (!profile) return null;
  const role: Role = (roles || []).some((r) => r.role === "admin") ? "admin" : "user";
  return {
    id: profile.id, email: profile.email, role,
    name: profile.name || "", phone: profile.phone ?? undefined,
    bonusBalance: profile.bonus_balance, totalSpent: profile.total_spent,
    createdAt: profile.created_at,
  };
}

/* ===================== api ===================== */

export const api = {
  /* ----- auth ----- */
  async register(email: string, password: string, name: string, phone?: string) {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}/account`,
        data: { name, phone: phone ?? "" },
      },
    });
    if (error) throw new Error(error.message);
    if (!data.session) {
      // email confirmation required
      throw new Error("Проверьте почту, чтобы подтвердить регистрацию");
    }
    emitAuthChange();
    const u = await getCurrentUser();
    return { token: data.session.access_token, user: u! };
  },
  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    emitAuthChange();
    const u = await getCurrentUser();
    return { token: data.session!.access_token, user: u! };
  },
  async logout() {
    await supabase.auth.signOut();
    emitAuthChange();
  },
  async loginWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/account` },
    });
    if (error) throw new Error(error.message);
  },
  async me(): Promise<User | null> {
    return getCurrentUser();
  },
  async updateMe(patch: Partial<Pick<User, "name" | "phone">>): Promise<User> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Не авторизован");
    const upd: Record<string, unknown> = {};
    if (patch.name !== undefined) upd.name = patch.name;
    if (patch.phone !== undefined) upd.phone = patch.phone;
    const { error } = await supabase.from("profiles").update(upd).eq("id", session.user.id);
    if (error) throw new Error(error.message);
    return (await getCurrentUser())!;
  },

  /* ----- products ----- */
  async listProducts(query = "", categoryId?: string): Promise<Product[]> {
    let q = supabase.from("products").select("*").order("created_at", { ascending: false });
    if (categoryId) q = q.eq("category_id", categoryId);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    let list = ((data || []) as ProductRow[]).map(mapProduct);
    const s = query.trim().toLowerCase();
    if (s) {
      list = list.filter((p) =>
        [p.name_ru, p.name_en, p.tagline_ru, p.tagline_en].some((t) => t.toLowerCase().includes(s)),
      );
    }
    return list;
  },
  async getProduct(idOrSlug: string): Promise<Product | null> {
    const { data } = await supabase.from("products").select("*").or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`).maybeSingle();
    return data ? mapProduct(data as ProductRow) : null;
  },

  /* ----- categories ----- */
  async listCategories(): Promise<ProductCategory[]> {
    const { data } = await supabase.from("categories").select("*").order("sort_order");
    return ((data || []) as { id: string; name_ru: string; name_en: string }[]).map((r) => ({
      id: r.id, name_ru: r.name_ru, name_en: r.name_en,
    }));
  },
  async adminCreateCategory(input: { name_ru: string; name_en: string; id?: string }): Promise<ProductCategory> {
    const id = (input.id || input.name_ru || "cat").toLowerCase().trim()
      .replace(/[^a-z0-9а-я]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 32) || "cat_" + Math.random().toString(36).slice(2, 6);
    const { data, error } = await supabase.from("categories").insert({ id, name_ru: input.name_ru, name_en: input.name_en || input.name_ru }).select().single();
    if (error) throw new Error(error.message);
    return data as ProductCategory;
  },
  async adminUpdateCategory(id: string, patch: Partial<Omit<ProductCategory, "id">>): Promise<ProductCategory> {
    const { data, error } = await supabase.from("categories").update(patch).eq("id", id).select().single();
    if (error) throw new Error(error.message);
    return data as ProductCategory;
  },
  async adminDeleteCategory(id: string): Promise<void> {
    const { count } = await supabase.from("products").select("id", { count: "exact", head: true }).eq("category_id", id);
    if ((count ?? 0) > 0) throw new Error("Нельзя удалить категорию: к ней привязаны товары");
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  /* ----- cart (localStorage) ----- */
  async getCart(): Promise<CartItem[]> { return loadCart(); },
  async addToCart(productId: string, quantity = 1): Promise<CartItem[]> {
    const { data: p } = await supabase.from("products").select("stock").eq("id", productId).maybeSingle();
    if (!p) throw new Error("Товар не найден");
    const cart = loadCart();
    const existing = cart.find((c) => c.productId === productId && !c.bundleId);
    const desired = (existing?.quantity ?? 0) + quantity;
    if (desired > p.stock) throw new Error(`Доступно только ${p.stock} шт.`);
    if (existing) existing.quantity += quantity;
    else cart.push({ id: "ci_" + Math.random().toString(36).slice(2, 8), productId, quantity });
    saveCart(cart);
    return cart;
  },
  async addBundleToCart(bundleId: string, quantity = 1): Promise<CartItem[]> {
    const cart = loadCart();
    const existing = cart.find((c) => c.bundleId === bundleId);
    if (existing) existing.quantity += quantity;
    else cart.push({ id: "ci_" + Math.random().toString(36).slice(2, 8), bundleId, quantity });
    saveCart(cart);
    return cart;
  },
  async updateCart(itemId: string, quantity: number): Promise<CartItem[]> {
    let cart = loadCart();
    if (quantity <= 0) cart = cart.filter((c) => c.id !== itemId);
    else cart = cart.map((c) => c.id === itemId ? { ...c, quantity } : c);
    saveCart(cart);
    return cart;
  },
  async removeFromCart(itemId: string): Promise<CartItem[]> {
    const cart = loadCart().filter((c) => c.id !== itemId);
    saveCart(cart);
    return cart;
  },

  /* ----- promo / orders ----- */
  async checkPromo(code: string, subtotal: number): Promise<{ promo: PromoCode; discount: number }> {
    return checkPromoFn({ data: { code, subtotal } });
  },
  async createOrder(
    address: { city: string; addressLine: string; postalCode: string },
    paymentMethod: PaymentMethod, deliveryMethod: DeliveryMethod,
    consent: boolean, bonusUse: number = 0, promoCode?: string,
  ): Promise<Order> {
    const cart = loadCart();
    const result = await createOrderFn({ data: { address, paymentMethod, deliveryMethod, consent, bonusUse, promoCode, cart } });
    saveCart([]);
    emitAuthChange();
    return result as Order;
  },
  async listOrders(): Promise<Order[]> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return [];
    const { data, error } = await supabase.from("orders").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return ((data || []) as OrderRow[]).map(mapOrder);
  },
  async getOrder(id: string): Promise<Order | null> {
    const { data } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
    return data ? mapOrder(data as OrderRow) : null;
  },
  async cancelOrder(id: string): Promise<Order> {
    const o = await cancelOrderFn({ data: { id } });
    emitAuthChange();
    return o as Order;
  },

  /* ----- admin orders/users ----- */
  async adminListOrders(): Promise<Order[]> {
    const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    return ((data || []) as OrderRow[]).map(mapOrder);
  },
  async adminUpdateOrder(id: string, status: OrderStatus): Promise<Order> {
    const { data, error } = await supabase.from("orders").update({ status }).eq("id", id).select().single();
    if (error) throw new Error(error.message);
    return mapOrder(data as OrderRow);
  },
  async adminUpdateOrderTracking(id: string, trackingNumber: string, estimatedDelivery?: string): Promise<Order> {
    const upd: Record<string, unknown> = { tracking_number: trackingNumber };
    if (estimatedDelivery) upd.estimated_delivery = estimatedDelivery;
    const { data, error } = await supabase.from("orders").update(upd).eq("id", id).select().single();
    if (error) throw new Error(error.message);
    return mapOrder(data as OrderRow);
  },
  async adminListUsers(): Promise<User[]> {
    return adminListUsersFn() as Promise<User[]>;
  },
  async adminGetUserOrders(userId: string): Promise<Order[]> {
    const { data } = await supabase.from("orders").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    return ((data || []) as OrderRow[]).map(mapOrder);
  },

  /* ----- products CRUD ----- */
  async adminCreateProduct(input: Omit<Product, "id" | "slug"> & { slug?: string }): Promise<Product> {
    const id = "p_" + Math.random().toString(36).slice(2, 8);
    const slug = input.slug?.trim() || id;
    const row = { id, slug, ...productToRow(input) };
    const { data, error } = await supabase.from("products").insert(row).select().single();
    if (error) throw new Error(error.message);
    return mapProduct(data as ProductRow);
  },
  async adminUpdateProduct(id: string, patch: Partial<Product>): Promise<Product> {
    const { data, error } = await supabase.from("products").update(productToRow(patch)).eq("id", id).select().single();
    if (error) throw new Error(error.message);
    return mapProduct(data as ProductRow);
  },
  async adminDeleteProduct(id: string): Promise<{ ok: true }> {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  /* ----- posts ----- */
  async listPosts(): Promise<Post[]> {
    const { data } = await supabase.from("posts").select("*").order("published_at", { ascending: false });
    return ((data || []) as PostRow[]).map(mapPost);
  },
  async getPost(slug: string): Promise<Post | null> {
    const { data } = await supabase.from("posts").select("*").eq("slug", slug).maybeSingle();
    return data ? mapPost(data as PostRow) : null;
  },
  async adminCreatePost(input: Omit<Post, "slug"> & { slug?: string }): Promise<Post> {
    const slug = input.slug?.trim() || "post-" + Math.random().toString(36).slice(2, 8);
    const { data, error } = await supabase.from("posts").insert({ slug, ...postToRow(input) }).select().single();
    if (error) throw new Error(error.message);
    return mapPost(data as PostRow);
  },
  async adminUpdatePost(slug: string, patch: Partial<Post>): Promise<Post> {
    const { data, error } = await supabase.from("posts").update(postToRow(patch)).eq("slug", slug).select().single();
    if (error) throw new Error(error.message);
    return mapPost(data as PostRow);
  },
  async adminDeletePost(slug: string): Promise<{ ok: true }> {
    const { error } = await supabase.from("posts").delete().eq("slug", slug);
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  /* ----- reviews ----- */
  async listReviews(productId: string): Promise<Review[]> {
    const { data } = await supabase.from("reviews").select("*").eq("product_id", productId).order("created_at", { ascending: false });
    return ((data || []) as ReviewRow[]).map(mapReview);
  },
  async addReview(input: Omit<Review, "id" | "createdAt" | "userId">): Promise<Review> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Войдите, чтобы оставить отзыв");
    const id = "r_" + Math.random().toString(36).slice(2, 8);
    const { data, error } = await supabase.from("reviews").insert({
      id, product_id: input.productId, user_id: session.user.id,
      author_name: input.authorName, rating: input.rating, text: input.text, photos: input.photos || [],
    }).select().single();
    if (error) throw new Error(error.message);
    return mapReview(data as ReviewRow);
  },
  async adminDeleteReview(id: string): Promise<{ ok: true }> {
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  },
  async adminListReviews(): Promise<Review[]> {
    const { data } = await supabase.from("reviews").select("*").order("created_at", { ascending: false });
    return ((data || []) as ReviewRow[]).map(mapReview);
  },

  /* ----- bundles ----- */
  async listBundles(): Promise<Bundle[]> { return loadBundlesWithItems(); },
  async getBundle(idOrSlug: string): Promise<Bundle | null> {
    const all = await loadBundlesWithItems();
    return all.find((b) => b.id === idOrSlug || b.slug === idOrSlug) ?? null;
  },
  bundlePrice(b: Bundle, products: Product[]) { return bundlePriceCalc(b, products); },
  async adminCreateBundle(input: Omit<Bundle, "id" | "slug"> & { slug?: string }): Promise<Bundle> {
    const id = "b_" + Math.random().toString(36).slice(2, 8);
    const slug = input.slug?.trim() || id;
    const { error } = await supabase.from("bundles").insert({
      id, slug, name: input.name, description: input.description,
      cover: input.cover, discount_percent: input.discountPercent,
    });
    if (error) throw new Error(error.message);
    if (input.productIds.length) {
      await supabase.from("bundle_items").insert(
        input.productIds.map((pid, i) => ({ bundle_id: id, product_id: pid, position: i })),
      );
    }
    return { id, slug, name: input.name, description: input.description, cover: input.cover, discountPercent: input.discountPercent, productIds: input.productIds };
  },
  async adminUpdateBundle(id: string, patch: Partial<Bundle>): Promise<Bundle> {
    const upd: Record<string, unknown> = {};
    if (patch.name !== undefined) upd.name = patch.name;
    if (patch.description !== undefined) upd.description = patch.description;
    if (patch.cover !== undefined) upd.cover = patch.cover;
    if (patch.discountPercent !== undefined) upd.discount_percent = patch.discountPercent;
    if (patch.slug !== undefined) upd.slug = patch.slug;
    if (Object.keys(upd).length) {
      const { error } = await supabase.from("bundles").update(upd).eq("id", id);
      if (error) throw new Error(error.message);
    }
    if (patch.productIds) {
      await supabase.from("bundle_items").delete().eq("bundle_id", id);
      if (patch.productIds.length) {
        await supabase.from("bundle_items").insert(
          patch.productIds.map((pid, i) => ({ bundle_id: id, product_id: pid, position: i })),
        );
      }
    }
    return (await this.getBundle(id))!;
  },
  async adminDeleteBundle(id: string): Promise<{ ok: true }> {
    await supabase.from("bundle_items").delete().eq("bundle_id", id);
    const { error } = await supabase.from("bundles").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  /* ----- gift cards ----- */
  async createGiftCard(input: { amount: number; design: GiftCard["design"]; recipientEmail: string; message?: string }): Promise<GiftCard> {
    return createGiftCardFn({ data: input }) as Promise<GiftCard>;
  },
  async adminListGiftCards(): Promise<GiftCard[]> {
    const { data } = await supabase.from("gift_cards").select("*").order("created_at", { ascending: false });
    return ((data || []) as { code: string; amount: number; remaining: number; design: GiftCard["design"]; recipient_email: string; message: string | null; buyer_user_id: string | null; created_at: string }[]).map((r) => ({
      code: r.code, amount: r.amount, remaining: r.remaining, design: r.design,
      recipientEmail: r.recipient_email, message: r.message ?? undefined,
      buyerUserId: r.buyer_user_id ?? undefined, createdAt: r.created_at,
    }));
  },

  /* ----- newsletter ----- */
  async subscribe(email: string, consent: boolean): Promise<{ subscriber: Subscriber; promo: PromoCode }> {
    if (!consent) throw new Error("Необходимо согласие на обработку данных");
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) throw new Error("Некорректный email");
    const { error } = await supabase.from("subscribers").insert({ email, consent, promo_code: "WELCOME10" });
    if (error) {
      if (error.code === "23505") throw new Error("Вы уже подписаны");
      throw new Error(error.message);
    }
    // Log consent (best-effort)
    await supabase.from("consents").insert({ email, kind: "marketing" }).then(() => undefined, () => undefined);
    return {
      subscriber: { email, consent, promoCode: "WELCOME10", createdAt: new Date().toISOString() },
      promo: { code: "WELCOME10", percent: 10, description: "Скидка 10% за подписку на рассылку" },
    };
  },
  async adminListSubscribers(): Promise<Subscriber[]> {
    const { data } = await supabase.from("subscribers").select("*").order("created_at", { ascending: false });
    return ((data || []) as { email: string; consent: boolean; promo_code: string | null; created_at: string }[]).map((r) => ({
      email: r.email, consent: r.consent, promoCode: r.promo_code || "", createdAt: r.created_at,
    }));
  },

  /* ----- promos ----- */
  async adminListPromos(): Promise<PromoCode[]> {
    const { data } = await supabase.from("promos").select("*").order("created_at", { ascending: false });
    return ((data || []) as { code: string; percent: number | null; amount: number | null; description: string; uses_left: number | null }[]).map((r) => ({
      code: r.code, percent: r.percent ?? undefined, amount: r.amount ?? undefined,
      description: r.description, usesLeft: r.uses_left ?? undefined,
    }));
  },
  async adminCreatePromo(input: PromoCode): Promise<PromoCode> {
    const code = input.code.trim().toUpperCase();
    if (!code) throw new Error("Код промокода обязателен");
    if (!input.percent && !input.amount) throw new Error("Укажите процент или фиксированную сумму");
    const { error } = await supabase.from("promos").insert({
      code, percent: input.percent ?? null, amount: input.amount ?? null,
      description: input.description || `Скидка ${input.percent ? input.percent + "%" : input.amount + " ₽"}`,
      uses_left: input.usesLeft ?? null,
    });
    if (error) {
      if (error.code === "23505") throw new Error("Промокод с таким кодом уже существует");
      throw new Error(error.message);
    }
    return { ...input, code };
  },
  async adminDeletePromo(code: string): Promise<{ ok: true }> {
    const { error } = await supabase.from("promos").delete().eq("code", code);
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  /* ----- banners ----- */
  async listBanners(): Promise<Banner[]> {
    const { data } = await supabase.from("banners").select("*").order("sort_order");
    return ((data || []) as BannerRow[]).map(mapBanner);
  },
  async adminListBanners(): Promise<Banner[]> {
    const { data } = await supabase.from("banners").select("*").order("sort_order");
    return ((data || []) as BannerRow[]).map(mapBanner);
  },
  async adminCreateBanner(input: Omit<Banner, "id">): Promise<Banner> {
    const id = "bn_" + Math.random().toString(36).slice(2, 8);
    const { data, error } = await supabase.from("banners").insert({ id, ...bannerToRow(input) }).select().single();
    if (error) throw new Error(error.message);
    return mapBanner(data as BannerRow);
  },
  async adminUpdateBanner(id: string, patch: Partial<Banner>): Promise<Banner> {
    const { data, error } = await supabase.from("banners").update(bannerToRow(patch)).eq("id", id).select().single();
    if (error) throw new Error(error.message);
    return mapBanner(data as BannerRow);
  },
  async adminDeleteBanner(id: string): Promise<{ ok: true }> {
    const { error } = await supabase.from("banners").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  },
};
