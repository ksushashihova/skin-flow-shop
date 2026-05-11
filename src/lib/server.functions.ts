// Server functions for sensitive operations (Drizzle + better-auth).
import { createServerFn } from "@tanstack/react-start";
import { requireAuth, requireAdmin } from "./auth-middleware.server";
import { db } from "@/db/index.server";
import { orders, profiles, products, giftCards, userRoles } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import {
  computeOrderTotals,
  resolvePromoOrGift,
  expandCartToItems,
  decrementStock,
  generateGiftCode,
  buildTrackingNumber,
  estimatedDeliveryFor,
  type OrderItem,
} from "./server.helpers.server";

const toISO = (d: Date | string | null | undefined): string | undefined =>
  d ? (d instanceof Date ? d.toISOString() : d) : undefined;

/* ----------- checkPromo ----------- */
export const checkPromoFn = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; subtotal: number }) => d)
  .handler(async ({ data }) => {
    const code = (data.code || "").trim().toUpperCase();
    if (!code) throw new Error("Введите код");
    const r = await resolvePromoOrGift(code, data.subtotal);
    if (!r) throw new Error("Промокод не найден");
    return r;
  });

/* ----------- createOrder ----------- */
export const createOrderFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: {
    address: { city: string; addressLine: string; postalCode: string };
    paymentMethod: "card_online"|"card_on_delivery"|"sbp"|"cash";
    deliveryMethod: "pickup"|"courier"|"post"|"cdek";
    consent: boolean; bonusUse: number; promoCode?: string;
    cart: { id: string; productId?: string; bundleId?: string; quantity: number }[];
  }) => d)
  .handler(async ({ data, context }) => {
    if (!data.consent) throw new Error("Необходимо согласие на обработку персональных данных");
    if (!data.cart.length) throw new Error("Корзина пуста");
    const userId = context.userId;

    const [profile] = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
    if (!profile) throw new Error("Профиль не найден");

    const items = await expandCartToItems(data.cart);

    const { totalPrice, deliveryPrice, promoDiscount, promoUsed, bonusUsed, bonusEarned } =
      await computeOrderTotals({
        items, deliveryMethod: data.deliveryMethod, totalSpent: profile.totalSpent,
        bonusBalance: profile.bonusBalance, bonusUse: data.bonusUse, promoCode: data.promoCode,
      });

    const tracking = data.deliveryMethod === "pickup" ? null : buildTrackingNumber();
    const eta = estimatedDeliveryFor(data.deliveryMethod);

    const [order] = await db.insert(orders).values({
      userId, userEmail: profile.email,
      status: "new", totalPrice,
      items: items as unknown as object,
      city: data.address.city, addressLine: data.address.addressLine, postalCode: data.address.postalCode,
      paymentMethod: data.paymentMethod, deliveryMethod: data.deliveryMethod,
      deliveryPrice, bonusUsed, bonusEarned,
      promoUsed, promoDiscount,
      trackingNumber: tracking, estimatedDelivery: eta,
    }).returning();

    await decrementStock(items);

    await db.update(profiles).set({
      bonusBalance: Math.max(0, profile.bonusBalance - bonusUsed),
      totalSpent: profile.totalSpent + totalPrice,
    }).where(eq(profiles.id, userId));

    return {
      id: order.id, userId, userEmail: profile.email,
      status: "new" as const, totalPrice, items,
      address: { city: data.address.city, addressLine: data.address.addressLine, postalCode: data.address.postalCode },
      paymentMethod: data.paymentMethod, deliveryMethod: data.deliveryMethod, deliveryPrice,
      bonusUsed, bonusEarned, promoUsed: promoUsed ?? undefined, promoDiscount,
      trackingNumber: tracking ?? undefined, estimatedDelivery: toISO(eta),
      createdAt: toISO(order.createdAt)!, updatedAt: toISO(order.updatedAt)!,
    };
  });

/* ----------- cancelOrder ----------- */
export const cancelOrderFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const [o] = await db.select().from(orders).where(eq(orders.id, data.id)).limit(1);
    if (!o) throw new Error("Заказ не найден");
    if (o.userId !== userId) throw new Error("Нет доступа");
    if (o.status === "shipped" || o.status === "completed") throw new Error("Этот заказ уже нельзя отменить");
    if (o.status !== "cancelled") {
      const items = (o.items as unknown as OrderItem[]) || [];
      for (const it of items) {
        const [p] = await db.select({ stock: products.stock }).from(products).where(eq(products.id, it.productId)).limit(1);
        if (p) await db.update(products).set({ stock: p.stock + it.quantity }).where(eq(products.id, it.productId));
      }
      const [prof] = await db.select({ bonusBalance: profiles.bonusBalance, totalSpent: profiles.totalSpent }).from(profiles).where(eq(profiles.id, userId)).limit(1);
      if (prof) {
        await db.update(profiles).set({
          bonusBalance: prof.bonusBalance + o.bonusUsed,
          totalSpent: Math.max(0, prof.totalSpent - o.totalPrice),
        }).where(eq(profiles.id, userId));
      }
    }
    const [u] = await db.update(orders).set({ status: "cancelled" }).where(eq(orders.id, data.id)).returning();
    return {
      id: u.id, userId: u.userId, userEmail: u.userEmail,
      status: "cancelled" as const, totalPrice: u.totalPrice,
      items: u.items as unknown as OrderItem[],
      address: { city: u.city, addressLine: u.addressLine, postalCode: u.postalCode },
      paymentMethod: u.paymentMethod, deliveryMethod: u.deliveryMethod, deliveryPrice: u.deliveryPrice,
      bonusUsed: u.bonusUsed, bonusEarned: u.bonusEarned,
      promoUsed: u.promoUsed ?? undefined, promoDiscount: u.promoDiscount,
      trackingNumber: u.trackingNumber ?? undefined,
      estimatedDelivery: toISO(u.estimatedDelivery),
      createdAt: toISO(u.createdAt)!, updatedAt: toISO(u.updatedAt)!,
    };
  });

/* ----------- createGiftCard ----------- */
export const createGiftCardFn = createServerFn({ method: "POST" })
  .inputValidator((d: { amount: number; design: "minimal"|"floral"; recipientEmail: string; message?: string }) => d)
  .handler(async ({ data }) => {
    if (!data.amount || data.amount < 500) throw new Error("Минимальный номинал — 500 ₽");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.recipientEmail)) throw new Error("Некорректный email получателя");
    const code = generateGiftCode();
    const [row] = await db.insert(giftCards).values({
      code, amount: data.amount, remaining: data.amount,
      design: data.design, recipientEmail: data.recipientEmail,
      message: data.message?.slice(0, 300) ?? null,
    }).returning();
    return {
      code: row.code, amount: row.amount, remaining: row.remaining,
      design: row.design as "minimal"|"floral", recipientEmail: row.recipientEmail,
      message: row.message ?? undefined,
      buyerUserId: row.buyerUserId ?? undefined,
      createdAt: toISO(row.createdAt)!,
    };
  });

/* ----------- adminListUsers ----------- */
export const adminListUsersFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const profs = await db.select().from(profiles).orderBy(desc(profiles.createdAt));
    const roles = await db.select({ userId: userRoles.userId, role: userRoles.role }).from(userRoles);
    const adminIds = new Set(roles.filter((r) => r.role === "admin").map((r) => r.userId));
    return profs.map((p) => ({
      id: p.id, email: p.email,
      role: (adminIds.has(p.id) ? "admin" : "user") as "admin" | "user",
      name: p.name || "", phone: p.phone ?? undefined,
      bonusBalance: p.bonusBalance, totalSpent: p.totalSpent,
      createdAt: toISO(p.createdAt)!,
    }));
  });

void and;
