// Server functions for sensitive operations.
// Kept as a thin wrapper file: only createServerFn declarations and imports.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  computeOrderTotals,
  resolvePromoOrGift,
  expandCartToItems,
  decrementStock,
  generateGiftCode,
  buildTrackingNumber,
  estimatedDeliveryFor,
} from "./server.helpers.server";

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
  .middleware([requireSupabaseAuth])
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

    // Profile snapshot
    const { data: profile } = await supabaseAdmin.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (!profile) throw new Error("Профиль не найден");

    const items = await expandCartToItems(data.cart);

    const { totalPrice, deliveryPrice, subtotal, promoDiscount, promoUsed, bonusUsed, bonusEarned, tier } =
      await computeOrderTotals({
        items, deliveryMethod: data.deliveryMethod, totalSpent: profile.total_spent,
        bonusBalance: profile.bonus_balance, bonusUse: data.bonusUse, promoCode: data.promoCode,
      });
    void subtotal; void tier;

    const tracking = data.deliveryMethod === "pickup" ? null : buildTrackingNumber();
    const eta = estimatedDeliveryFor(data.deliveryMethod);

    const { data: order, error } = await supabaseAdmin.from("orders").insert({
      user_id: userId, user_email: profile.email,
      status: "new", total_price: totalPrice,
      items: items as unknown as never,
      city: data.address.city, address_line: data.address.addressLine, postal_code: data.address.postalCode,
      payment_method: data.paymentMethod, delivery_method: data.deliveryMethod,
      delivery_price: deliveryPrice, bonus_used: bonusUsed, bonus_earned: bonusEarned,
      promo_used: promoUsed, promo_discount: promoDiscount,
      tracking_number: tracking, estimated_delivery: eta,
    }).select().single();
    if (error) throw new Error(error.message);

    await decrementStock(items);

    // Update bonus balance / total spent (bonusEarned накисляется при completed; здесь только списание)
    await supabaseAdmin.from("profiles").update({
      bonus_balance: Math.max(0, profile.bonus_balance - bonusUsed),
      total_spent: profile.total_spent + totalPrice,
    }).eq("id", userId);

    return {
      id: order!.id, userId, userEmail: profile.email,
      status: "new" as const, totalPrice, items,
      address: { city: data.address.city, addressLine: data.address.addressLine, postalCode: data.address.postalCode },
      paymentMethod: data.paymentMethod, deliveryMethod: data.deliveryMethod, deliveryPrice,
      bonusUsed, bonusEarned, promoUsed: promoUsed ?? undefined, promoDiscount,
      trackingNumber: tracking ?? undefined, estimatedDelivery: eta ?? undefined,
      createdAt: order!.created_at, updatedAt: order!.updated_at,
    };
  });

/* ----------- cancelOrder ----------- */
export const cancelOrderFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { data: o } = await supabaseAdmin.from("orders").select("*").eq("id", data.id).maybeSingle();
    if (!o) throw new Error("Заказ не найден");
    if (o.user_id !== userId) throw new Error("Нет доступа");
    if (o.status === "shipped" || o.status === "completed") throw new Error("Этот заказ уже нельзя отменить");
    if (o.status !== "cancelled") {
      // restock
      const items = (o.items as unknown as { productId: string; quantity: number }[]) || [];
      for (const it of items) {
        const { data: p } = await supabaseAdmin.from("products").select("stock").eq("id", it.productId).maybeSingle();
        if (p) await supabaseAdmin.from("products").update({ stock: p.stock + it.quantity }).eq("id", it.productId);
      }
      // refund bonuses & decrement totalSpent
      const { data: prof } = await supabaseAdmin.from("profiles").select("bonus_balance, total_spent").eq("id", userId).maybeSingle();
      if (prof) {
        await supabaseAdmin.from("profiles").update({
          bonus_balance: prof.bonus_balance + o.bonus_used,
          total_spent: Math.max(0, prof.total_spent - o.total_price),
        }).eq("id", userId);
      }
    }
    const { data: updated } = await supabaseAdmin.from("orders").update({ status: "cancelled" }).eq("id", data.id).select().single();
    const u = updated!;
    return {
      id: u.id, userId: u.user_id, userEmail: u.user_email,
      status: "cancelled" as const, totalPrice: u.total_price,
      items: (u.items as unknown as { productId: string; name: string; quantity: number; price: number; image?: string }[]),
      address: { city: u.city, addressLine: u.address_line, postalCode: u.postal_code },
      paymentMethod: u.payment_method, deliveryMethod: u.delivery_method, deliveryPrice: u.delivery_price,
      bonusUsed: u.bonus_used, bonusEarned: u.bonus_earned,
      promoUsed: u.promo_used ?? undefined, promoDiscount: u.promo_discount,
      trackingNumber: u.tracking_number ?? undefined,
      estimatedDelivery: u.estimated_delivery ?? undefined,
      createdAt: u.created_at, updatedAt: u.updated_at,
    };
  });

/* ----------- createGiftCard ----------- */
export const createGiftCardFn = createServerFn({ method: "POST" })
  .inputValidator((d: { amount: number; design: "minimal"|"floral"; recipientEmail: string; message?: string }) => d)
  .handler(async ({ data }) => {
    if (!data.amount || data.amount < 500) throw new Error("Минимальный номинал — 500 ₽");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.recipientEmail)) throw new Error("Некорректный email получателя");
    const code = generateGiftCode();
    const { data: row, error } = await supabaseAdmin.from("gift_cards").insert({
      code, amount: data.amount, remaining: data.amount,
      design: data.design, recipient_email: data.recipientEmail,
      message: data.message?.slice(0, 300) ?? null,
    }).select().single();
    if (error) throw new Error(error.message);
    return {
      code: row!.code, amount: row!.amount, remaining: row!.remaining,
      design: row!.design as "minimal"|"floral", recipientEmail: row!.recipient_email,
      message: row!.message ?? undefined,
      buyerUserId: row!.buyer_user_id ?? undefined,
      createdAt: row!.created_at,
    };
  });

/* ----------- adminListUsers ----------- */
export const adminListUsersFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    const { data: roleCheck } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!roleCheck) throw new Error("Нет доступа");
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("user_roles").select("user_id, role"),
    ]);
    const adminIds = new Set((roles || []).filter((r) => r.role === "admin").map((r) => r.user_id));
    return ((profiles || []) as { id: string; email: string; name: string; phone: string | null; bonus_balance: number; total_spent: number; created_at: string }[]).map((p) => ({
      id: p.id, email: p.email,
      role: (adminIds.has(p.id) ? "admin" : "user") as "admin" | "user",
      name: p.name || "", phone: p.phone ?? undefined,
      bonusBalance: p.bonus_balance, totalSpent: p.total_spent,
      createdAt: p.created_at,
    }));
  });
