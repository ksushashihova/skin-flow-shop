// Server-only helpers used by createServerFn handlers (Drizzle-based).
import { db } from "@/db/index.server";
import { products, bundles, bundleItems, promos, giftCards } from "@/db/schema";
import { eq, gt, inArray } from "drizzle-orm";

const TIERS = [
  { id: "silver", min: 0, rate: 0.05 },
  { id: "gold", min: 10000, rate: 0.07 },
  { id: "platinum", min: 50000, rate: 0.10 },
] as const;
const tierFor = (s: number) => [...TIERS].reverse().find((t) => s >= t.min) ?? TIERS[0];

const DELIVERY_PRICES = { pickup: 0, courier: 390, post: 290, cdek: 350 } as const;

export interface OrderItem { productId: string; name: string; quantity: number; price: number; image?: string }

export async function resolvePromoOrGift(code: string, subtotal: number) {
  const [gc] = await db.select().from(giftCards).where(eq(giftCards.code, code)).limit(1);
  if (gc && gc.remaining > 0) {
    return {
      promo: { code: gc.code, amount: gc.remaining, description: `Подарочный сертификат на ${gc.remaining} ₽` },
      discount: Math.min(gc.remaining, subtotal),
    };
  }
  const [p] = await db.select().from(promos).where(eq(promos.code, code)).limit(1);
  if (!p) return null;
  if (p.usesLeft !== null && p.usesLeft <= 0) throw new Error("Промокод исчерпан");
  let discount = 0;
  if (p.percent) discount = Math.round(subtotal * (p.percent / 100));
  if (p.amount) discount = Math.min(p.amount, subtotal);
  return {
    promo: { code: p.code, percent: p.percent ?? undefined, amount: p.amount ?? undefined, description: p.description, usesLeft: p.usesLeft ?? undefined },
    discount,
  };
}

export async function expandCartToItems(cart: { productId?: string; bundleId?: string; quantity: number }[]): Promise<OrderItem[]> {
  const items: OrderItem[] = [];
  for (const c of cart) {
    if (c.productId) {
      const [p] = await db.select().from(products).where(eq(products.id, c.productId)).limit(1);
      if (!p) throw new Error("Товар недоступен");
      if (c.quantity > p.stock) throw new Error(`Недостаточно "${p.nameRu}": доступно ${p.stock}`);
      items.push({ productId: p.id, name: p.nameRu, quantity: c.quantity, price: p.price, image: (p.images || [])[0] });
    } else if (c.bundleId) {
      const [b] = await db.select().from(bundles).where(eq(bundles.id, c.bundleId)).limit(1);
      if (!b) throw new Error("Набор недоступен");
      const bi = await db.select().from(bundleItems).where(eq(bundleItems.bundleId, b.id));
      const productIds = bi.map((x) => x.productId);
      const ps = productIds.length ? await db.select().from(products).where(inArray(products.id, productIds)) : [];
      const full = ps.reduce((s, x) => s + x.price, 0);
      const discounted = Math.round(full * (1 - b.discountPercent / 100));
      for (const p of ps) {
        if (c.quantity > p.stock) throw new Error(`Недостаточно "${p.nameRu}": доступно ${p.stock}`);
        const share = full > 0 ? p.price / full : 0;
        items.push({
          productId: p.id, name: `${p.nameRu} · ${b.name}`,
          quantity: c.quantity, price: Math.round(discounted * share), image: (p.images || [])[0],
        });
      }
    }
  }
  return items;
}

export async function decrementStock(items: OrderItem[]) {
  for (const it of items) {
    const [p] = await db.select({ stock: products.stock }).from(products).where(eq(products.id, it.productId)).limit(1);
    if (p) await db.update(products).set({ stock: Math.max(0, p.stock - it.quantity) }).where(eq(products.id, it.productId));
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
      const [gc] = await db.select({ remaining: giftCards.remaining }).from(giftCards).where(eq(giftCards.code, code)).limit(1);
      if (gc) {
        await db.update(giftCards).set({ remaining: Math.max(0, gc.remaining - promoDiscount) }).where(eq(giftCards.code, code));
      } else {
        const [pr] = await db.select({ usesLeft: promos.usesLeft }).from(promos).where(eq(promos.code, code)).limit(1);
        if (pr && pr.usesLeft !== null) {
          await db.update(promos).set({ usesLeft: Math.max(0, pr.usesLeft - 1) }).where(eq(promos.code, code));
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
export function estimatedDeliveryFor(method: "pickup"|"courier"|"post"|"cdek"): Date {
  const days = method === "courier" ? 2 : method === "cdek" ? 5 : method === "post" ? 8 : 1;
  return new Date(Date.now() + 86400000 * days);
}

// Use unused import ref to keep tree-shaking honest
void gt;
