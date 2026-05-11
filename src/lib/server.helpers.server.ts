// Server-only helpers used by createServerFn handlers.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const TIERS = [
  { id: "silver", min: 0, rate: 0.05 },
  { id: "gold", min: 10000, rate: 0.07 },
  { id: "platinum", min: 50000, rate: 0.10 },
] as const;
const tierFor = (s: number) => [...TIERS].reverse().find((t) => s >= t.min) ?? TIERS[0];

const DELIVERY_PRICES = { pickup: 0, courier: 390, post: 290, cdek: 350 } as const;

export interface OrderItem { productId: string; name: string; quantity: number; price: number; image?: string }

export async function resolvePromoOrGift(code: string, subtotal: number) {
  const { data: gc } = await supabaseAdmin.from("gift_cards").select("*").eq("code", code).gt("remaining", 0).maybeSingle();
  if (gc) {
    return {
      promo: { code: gc.code, amount: gc.remaining, description: `Подарочный сертификат на ${gc.remaining} ₽` },
      discount: Math.min(gc.remaining, subtotal),
    };
  }
  const { data: p } = await supabaseAdmin.from("promos").select("*").eq("code", code).maybeSingle();
  if (!p) return null;
  if (p.uses_left !== null && p.uses_left <= 0) throw new Error("Промокод исчерпан");
  let discount = 0;
  if (p.percent) discount = Math.round(subtotal * (p.percent / 100));
  if (p.amount) discount = Math.min(p.amount, subtotal);
  return {
    promo: { code: p.code, percent: p.percent ?? undefined, amount: p.amount ?? undefined, description: p.description, usesLeft: p.uses_left ?? undefined },
    discount,
  };
}

export async function expandCartToItems(cart: { productId?: string; bundleId?: string; quantity: number }[]): Promise<OrderItem[]> {
  const items: OrderItem[] = [];
  for (const c of cart) {
    if (c.productId) {
      const { data: p } = await supabaseAdmin.from("products").select("*").eq("id", c.productId).maybeSingle();
      if (!p) throw new Error("Товар недоступен");
      if (c.quantity > p.stock) throw new Error(`Недостаточно "${p.name_ru}": доступно ${p.stock}`);
      items.push({ productId: p.id, name: p.name_ru, quantity: c.quantity, price: p.price, image: (p.images || [])[0] });
    } else if (c.bundleId) {
      const { data: b } = await supabaseAdmin.from("bundles").select("*").eq("id", c.bundleId).maybeSingle();
      if (!b) throw new Error("Набор недоступен");
      const { data: bi } = await supabaseAdmin.from("bundle_items").select("*").eq("bundle_id", b.id).order("position");
      const productIds = (bi || []).map((x) => x.product_id);
      const { data: ps } = await supabaseAdmin.from("products").select("*").in("id", productIds);
      const products = ps || [];
      const full = products.reduce((s, x) => s + x.price, 0);
      const discounted = Math.round(full * (1 - b.discount_percent / 100));
      for (const p of products) {
        if (c.quantity > p.stock) throw new Error(`Недостаточно "${p.name_ru}": доступно ${p.stock}`);
        const share = full > 0 ? p.price / full : 0;
        items.push({
          productId: p.id, name: `${p.name_ru} · ${b.name}`,
          quantity: c.quantity, price: Math.round(discounted * share), image: (p.images || [])[0],
        });
      }
    }
  }
  return items;
}

export async function decrementStock(items: OrderItem[]) {
  for (const it of items) {
    const { data: p } = await supabaseAdmin.from("products").select("stock").eq("id", it.productId).maybeSingle();
    if (p) await supabaseAdmin.from("products").update({ stock: Math.max(0, p.stock - it.quantity) }).eq("id", it.productId);
  }
}

export async function computeOrderTotals(args: {
  items: OrderItem[]; deliveryMethod: "pickup"|"courier"|"post"|"cdek";
  totalSpent: number; bonusBalance: number; bonusUse: number; promoCode?: string;
}) {
  const subtotal = args.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const tier = tierFor(args.totalSpent);
  const baseDelivery = DELIVERY_PRICES[args.deliveryMethod];
  const deliveryPrice = tier.id === "platinum" ? 0 : baseDelivery;

  let promoDiscount = 0; let promoUsed: string | null = null;
  if (args.promoCode) {
    const code = args.promoCode.trim().toUpperCase();
    const r = await resolvePromoOrGift(code, subtotal).catch(() => null);
    if (r) {
      promoDiscount = r.discount;
      promoUsed = code;
      // decrement uses / gift remaining
      const { data: gc } = await supabaseAdmin.from("gift_cards").select("remaining").eq("code", code).maybeSingle();
      if (gc) {
        await supabaseAdmin.from("gift_cards").update({ remaining: Math.max(0, gc.remaining - promoDiscount) }).eq("code", code);
      } else {
        const { data: pr } = await supabaseAdmin.from("promos").select("uses_left").eq("code", code).maybeSingle();
        if (pr && pr.uses_left !== null) {
          await supabaseAdmin.from("promos").update({ uses_left: Math.max(0, pr.uses_left - 1) }).eq("code", code);
        }
      }
    }
  }
  const afterPromo = Math.max(0, subtotal - promoDiscount);
  const maxBonus = Math.min(args.bonusBalance, Math.floor(afterPromo * 0.5));
  const bonusUsed = Math.max(0, Math.min(args.bonusUse, maxBonus));
  const totalPrice = Math.max(0, afterPromo + deliveryPrice - bonusUsed);
  const bonusEarned = Math.round((afterPromo - bonusUsed) * tier.rate);
  return { subtotal, deliveryPrice, promoDiscount, promoUsed, bonusUsed, bonusEarned, totalPrice, tier: tier.id };
}

export function generateGiftCode(): string {
  const part = () => Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4).padEnd(4, "0");
  return `GIFT-${part()}-${part()}`;
}
export function buildTrackingNumber(): string {
  return String(Math.floor(Math.random() * 9000000000) + 1000000000);
}
export function estimatedDeliveryFor(method: "pickup"|"courier"|"post"|"cdek"): string {
  const days = method === "courier" ? 2 : method === "cdek" ? 5 : method === "post" ? 8 : 1;
  return new Date(Date.now() + 86400000 * days).toISOString();
}
