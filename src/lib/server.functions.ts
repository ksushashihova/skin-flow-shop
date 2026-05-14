// Server functions for sensitive operations (Drizzle + better-auth).
import { createServerFn } from "@tanstack/react-start";
import { requireAuth, requireAdmin } from "./auth-middleware.server";
import { db } from "@/db/index.server";
import { orders, profiles, products, giftCards, userRoles } from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { sendMail } from "./mailer.server";
import {
  computeOrderTotals,
  resolvePromoOrGift,
  expandCartToItems,
  generateGiftCode,
  buildTrackingNumber,
  estimatedDeliveryFor,
  type OrderItem,
} from "./server.helpers.server";

const toISO = (d: Date | string | null | undefined): string | undefined =>
  d ? (d instanceof Date ? d.toISOString() : d) : undefined;

/* ----------- checkPromo ----------- */
export const checkPromoFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { code: string; subtotal: number }) => {
    const code = String(d?.code ?? "").slice(0, 64);
    const subtotal = Math.max(0, Math.min(10_000_000, Number(d?.subtotal) || 0));
    return { code, subtotal };
  })
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

    const items = await expandCartToItems(data.cart);
    const tracking = data.deliveryMethod === "pickup" ? null : buildTrackingNumber();
    const eta = estimatedDeliveryFor(data.deliveryMethod);

    // Атомарная операция: списать stock + создать заказ + обновить профиль.
    const order = await db.transaction(async (tx) => {
      const [profile] = await tx.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
      if (!profile) throw new Error("Профиль не найден");

      const totals = await computeOrderTotals({
        items, deliveryMethod: data.deliveryMethod, totalSpent: profile.totalSpent,
        bonusBalance: profile.bonusBalance, bonusUse: data.bonusUse, promoCode: data.promoCode,
      });

      // Проверяем и списываем сток одним UPDATE с CHECK; если не хватает — RAISE.
      for (const it of items) {
        const r = await tx.execute(sql`
          UPDATE oblako.products SET stock = stock - ${it.quantity}
          WHERE id = ${it.productId} AND stock >= ${it.quantity}
          RETURNING id
        `);
        if ((r as unknown as { length: number }).length === 0) {
          throw new Error(`Недостаточно товара: ${it.name}`);
        }
      }

      const [row] = await tx.insert(orders).values({
        userId, userEmail: profile.email,
        status: "new", totalPrice: totals.totalPrice,
        items: items as unknown as object,
        city: data.address.city, addressLine: data.address.addressLine, postalCode: data.address.postalCode,
        paymentMethod: data.paymentMethod, deliveryMethod: data.deliveryMethod,
        deliveryPrice: totals.deliveryPrice,
        bonusUsed: totals.bonusUsed, bonusEarned: totals.bonusEarned,
        promoUsed: totals.promoUsed, promoDiscount: totals.promoDiscount,
        trackingNumber: tracking, estimatedDelivery: eta,
      }).returning();

      await tx.update(profiles).set({
        bonusBalance: Math.max(0, profile.bonusBalance - totals.bonusUsed) + totals.bonusEarned,
        totalSpent: profile.totalSpent + totals.totalPrice,
      }).where(eq(profiles.id, userId));

      return { row, totals, profile };
    });

    // Письмо-подтверждение (best-effort, не ждём SMTP, чтобы оформление не зависало).
    try {
      const lines = items.map((i) => `${i.name} × ${i.quantity} — ${i.price * i.quantity} ₽`).join("<br>");
      void sendMail({
        to: order.profile.email,
        subject: `Заказ №${order.row.id.slice(0, 8)} оформлен — ОБЛАКО`,
        html: `<h2>Спасибо за заказ!</h2><p>Сумма: <b>${order.totals.totalPrice} ₽</b></p><p>${lines}</p>${tracking ? `<p>Трек-номер: <b>${tracking}</b></p>` : ""}`,
      }).catch((e) => console.error("[order email]", e));
    } catch (e) { console.error("[order email]", e); }

    return {
      id: order.row.id, userId, userEmail: order.profile.email,
      status: "new" as const, totalPrice: order.totals.totalPrice, items,
      address: { city: data.address.city, addressLine: data.address.addressLine, postalCode: data.address.postalCode },
      paymentMethod: data.paymentMethod, deliveryMethod: data.deliveryMethod, deliveryPrice: order.totals.deliveryPrice,
      bonusUsed: order.totals.bonusUsed, bonusEarned: order.totals.bonusEarned,
      promoUsed: order.totals.promoUsed ?? undefined, promoDiscount: order.totals.promoDiscount,
      trackingNumber: tracking ?? undefined, estimatedDelivery: toISO(eta),
      createdAt: toISO(order.row.createdAt)!, updatedAt: toISO(order.row.updatedAt)!,
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
  .middleware([requireAuth])
  .inputValidator((d: { amount: number; design: "minimal"|"floral"; recipientEmail: string; message?: string }) => {
    const amount = Math.floor(Number(d?.amount) || 0);
    if (amount < 500 || amount > 100_000) throw new Error("Номинал от 500 до 100 000 ₽");
    const design = d?.design === "floral" ? "floral" : "minimal";
    const recipientEmail = String(d?.recipientEmail ?? "").trim().slice(0, 255);
    const message = d?.message ? String(d.message).slice(0, 300) : undefined;
    return { amount, design, recipientEmail, message };
  })
  .handler(async ({ data }) => {
    if (!data.amount || data.amount < 500) throw new Error("Минимальный номинал — 500 ₽");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.recipientEmail)) throw new Error("Некорректный email получателя");
    const code = generateGiftCode();
    const [row] = await db.insert(giftCards).values({
      code, amount: data.amount, remaining: data.amount,
      design: data.design, recipientEmail: data.recipientEmail,
      message: data.message?.slice(0, 300) ?? null,
    }).returning();
    try {
      void sendMail({
        to: row.recipientEmail,
        subject: `Подарочный сертификат ${row.code} — ОБЛАКО`,
        html: `<h2>Ваш подарочный сертификат ОБЛАКО</h2><p>Номинал: <b>${row.amount} ₽</b></p><p>Промокод: <b>${row.code}</b></p>${row.message ? `<p>${row.message}</p>` : ""}<p>Введите промокод при оформлении заказа.</p>`,
      }).catch((e) => console.error("[gift card email]", e));
    } catch (e) { console.error("[gift card email]", e); }
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
