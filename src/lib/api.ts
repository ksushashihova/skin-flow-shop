// API layer backed by Drizzle/PostgreSQL via TanStack Start server functions
// and better-auth on the client. Public surface kept stable.
// Cart remains in localStorage (anonymous-friendly).

import { authClient, requestPasswordReset as authRequestReset, resetPassword as authResetPassword } from "./auth-client";
import {
  createOrderFn, cancelOrderFn, checkPromoFn, createGiftCardFn, adminListUsersFn,
} from "./server.functions";
import {
  getMeFn, updateMeFn,
  listProductsFn, getProductFn, getProductStockFn,
  adminCreateProductFn, adminUpdateProductFn, adminDeleteProductFn,
  listCategoriesFn, adminCreateCategoryFn, adminUpdateCategoryFn, adminDeleteCategoryFn,
  listOrdersFn, getOrderFn, adminListOrdersFn, adminUpdateOrderFn, adminUpdateOrderTrackingFn, adminGetUserOrdersFn,
  listPostsFn, getPostFn, adminCreatePostFn, adminUpdatePostFn, adminDeletePostFn,
  listReviewsFn, addReviewFn, adminListReviewsFn, adminDeleteReviewFn,
  listBundlesFn, getBundleFn, adminCreateBundleFn, adminUpdateBundleFn, adminDeleteBundleFn,
  listBannersFn, adminCreateBannerFn, adminUpdateBannerFn, adminDeleteBannerFn,
  adminListPromosFn, adminCreatePromoFn, adminDeletePromoFn,
  subscribeFn, adminListSubscribersFn, adminListGiftCardsFn,
} from "./data.functions";

/* ===================== Types (unchanged) ===================== */

export type Role = "guest" | "user" | "admin";
export type OrderStatus = "new" | "paid" | "shipped" | "completed" | "cancelled";
export type PaymentMethod = "card_online" | "card_on_delivery" | "sbp" | "cash";
export type DeliveryMethod = "pickup" | "courier" | "post" | "cdek";
export type BonusTier = "silver" | "gold" | "platinum";

export interface User {
  id: string; email: string; role: Role;
  name: string; phone?: string;
  bonusBalance: number; totalSpent: number; createdAt: string;
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

function bundlePriceCalc(b: Bundle, products: Product[]): { full: number; discounted: number } {
  const full = b.productIds.reduce((s, id) => {
    const p = products.find((x) => x.id === id);
    return s + (p?.price ?? 0);
  }, 0);
  return { full, discounted: Math.round(full * (1 - b.discountPercent / 100)) };
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

/* ===================== api ===================== */

export const api = {
  /* ----- auth (better-auth) ----- */
  async register(email: string, password: string, name: string, phone?: string) {
    const res = await authClient.signUp.email({ email, password, name });
    if (res.error) throw new Error(res.error.message || "Не удалось зарегистрироваться");
    if (phone) {
      try { await updateMeFn({ data: { phone } }); } catch { /* ignore */ }
    }
    emitAuthChange();
    const u = await getMeFn();
    return { token: "", user: u! };
  },
  async login(email: string, password: string) {
    const res = await authClient.signIn.email({ email, password });
    if (res.error) throw new Error(res.error.message || "Неверный email или пароль");
    emitAuthChange();
    const u = await getMeFn();
    return { token: "", user: u! };
  },
  async logout() {
    await authClient.signOut();
    emitAuthChange();
  },
  async loginWithGoogle() {
    throw new Error("Вход через Google недоступен");
  },
  async me(): Promise<User | null> {
    return (await getMeFn()) as User | null;
  },
  async updateMe(patch: Partial<Pick<User, "name" | "phone">>): Promise<User> {
    await updateMeFn({ data: patch });
    return (await getMeFn()) as User;
  },

  /* ----- products ----- */
  async listProducts(query = "", categoryId?: string): Promise<Product[]> {
    return (await listProductsFn({ data: { query, categoryId } })) as Product[];
  },
  async getProduct(idOrSlug: string): Promise<Product | null> {
    return (await getProductFn({ data: { idOrSlug } })) as Product | null;
  },

  /* ----- categories ----- */
  async listCategories(): Promise<ProductCategory[]> {
    return (await listCategoriesFn()) as ProductCategory[];
  },
  async adminCreateCategory(input: { name_ru: string; name_en: string; id?: string }): Promise<ProductCategory> {
    return (await adminCreateCategoryFn({ data: input })) as ProductCategory;
  },
  async adminUpdateCategory(id: string, patch: Partial<Omit<ProductCategory, "id">>): Promise<ProductCategory> {
    return (await adminUpdateCategoryFn({ data: { id, patch } })) as ProductCategory;
  },
  async adminDeleteCategory(id: string): Promise<void> {
    await adminDeleteCategoryFn({ data: { id } });
  },

  /* ----- cart (localStorage) ----- */
  async getCart(): Promise<CartItem[]> { return loadCart(); },
  async addToCart(productId: string, quantity = 1): Promise<CartItem[]> {
    const p = await getProductStockFn({ data: { id: productId } });
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
    return (await checkPromoFn({ data: { code, subtotal } })) as { promo: PromoCode; discount: number };
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
    return result as unknown as Order;
  },
  async listOrders(): Promise<Order[]> {
    try {
      return (await listOrdersFn()) as Order[];
    } catch {
      return [];
    }
  },
  async getOrder(id: string): Promise<Order | null> {
    try {
      return (await getOrderFn({ data: { id } })) as Order | null;
    } catch {
      return null;
    }
  },
  async cancelOrder(id: string): Promise<Order> {
    const o = await cancelOrderFn({ data: { id } });
    emitAuthChange();
    return o as unknown as Order;
  },

  /* ----- admin orders/users ----- */
  async adminListOrders(): Promise<Order[]> {
    return (await adminListOrdersFn()) as Order[];
  },
  async adminUpdateOrder(id: string, status: OrderStatus): Promise<Order> {
    return (await adminUpdateOrderFn({ data: { id, status } })) as Order;
  },
  async adminUpdateOrderTracking(id: string, trackingNumber: string, estimatedDelivery?: string): Promise<Order> {
    return (await adminUpdateOrderTrackingFn({ data: { id, trackingNumber, estimatedDelivery } })) as Order;
  },
  async adminListUsers(): Promise<User[]> {
    return (await adminListUsersFn()) as User[];
  },
  async adminGetUserOrders(userId: string): Promise<Order[]> {
    return (await adminGetUserOrdersFn({ data: { userId } })) as Order[];
  },

  /* ----- products CRUD ----- */
  async adminCreateProduct(input: Omit<Product, "id" | "slug"> & { slug?: string }): Promise<Product> {
    return (await adminCreateProductFn({ data: input as unknown as Record<string, unknown> })) as Product;
  },
  async adminUpdateProduct(id: string, patch: Partial<Product>): Promise<Product> {
    return (await adminUpdateProductFn({ data: { id, patch: patch as unknown as Record<string, unknown> } })) as Product;
  },
  async adminDeleteProduct(id: string): Promise<{ ok: true }> {
    return await adminDeleteProductFn({ data: { id } });
  },

  /* ----- posts ----- */
  async listPosts(): Promise<Post[]> {
    return (await listPostsFn()) as Post[];
  },
  async getPost(slug: string): Promise<Post | null> {
    return (await getPostFn({ data: { slug } })) as Post | null;
  },
  async adminCreatePost(input: Omit<Post, "slug"> & { slug?: string }): Promise<Post> {
    return (await adminCreatePostFn({ data: input as unknown as Record<string, unknown> })) as Post;
  },
  async adminUpdatePost(slug: string, patch: Partial<Post>): Promise<Post> {
    return (await adminUpdatePostFn({ data: { slug, patch: patch as unknown as Record<string, unknown> } })) as Post;
  },
  async adminDeletePost(slug: string): Promise<{ ok: true }> {
    return await adminDeletePostFn({ data: { slug } });
  },

  /* ----- reviews ----- */
  async listReviews(productId: string): Promise<Review[]> {
    return (await listReviewsFn({ data: { productId } })) as Review[];
  },
  async addReview(input: Omit<Review, "id" | "createdAt" | "userId">): Promise<Review> {
    return (await addReviewFn({ data: { productId: input.productId, authorName: input.authorName, rating: input.rating, text: input.text, photos: input.photos || [] } })) as Review;
  },
  async adminDeleteReview(id: string): Promise<{ ok: true }> {
    return await adminDeleteReviewFn({ data: { id } });
  },
  async adminListReviews(): Promise<Review[]> {
    return (await adminListReviewsFn()) as Review[];
  },

  /* ----- bundles ----- */
  async listBundles(): Promise<Bundle[]> { return (await listBundlesFn()) as Bundle[]; },
  async getBundle(idOrSlug: string): Promise<Bundle | null> {
    return (await getBundleFn({ data: { idOrSlug } })) as Bundle | null;
  },
  bundlePrice(b: Bundle, products: Product[]) { return bundlePriceCalc(b, products); },
  async adminCreateBundle(input: Omit<Bundle, "id" | "slug"> & { slug?: string }): Promise<Bundle> {
    return (await adminCreateBundleFn({ data: input })) as Bundle;
  },
  async adminUpdateBundle(id: string, patch: Partial<Bundle>): Promise<Bundle> {
    return (await adminUpdateBundleFn({ data: { id, patch: patch as unknown as Record<string, unknown> } })) as Bundle;
  },
  async adminDeleteBundle(id: string): Promise<{ ok: true }> {
    return await adminDeleteBundleFn({ data: { id } });
  },

  /* ----- gift cards ----- */
  async createGiftCard(input: { amount: number; design: GiftCard["design"]; recipientEmail: string; message?: string }): Promise<GiftCard> {
    return (await createGiftCardFn({ data: input })) as GiftCard;
  },
  async adminListGiftCards(): Promise<GiftCard[]> {
    return (await adminListGiftCardsFn()) as GiftCard[];
  },

  /* ----- newsletter ----- */
  async subscribe(email: string, consent: boolean): Promise<{ subscriber: Subscriber; promo: PromoCode }> {
    return (await subscribeFn({ data: { email, consent } })) as { subscriber: Subscriber; promo: PromoCode };
  },
  async adminListSubscribers(): Promise<Subscriber[]> {
    return (await adminListSubscribersFn()) as Subscriber[];
  },

  /* ----- promos ----- */
  async adminListPromos(): Promise<PromoCode[]> {
    return (await adminListPromosFn()) as PromoCode[];
  },
  async adminCreatePromo(input: PromoCode): Promise<PromoCode> {
    return (await adminCreatePromoFn({ data: input })) as PromoCode;
  },
  async adminDeletePromo(code: string): Promise<{ ok: true }> {
    return await adminDeletePromoFn({ data: { code } });
  },

  /* ----- banners ----- */
  async listBanners(): Promise<Banner[]> {
    return (await listBannersFn()) as Banner[];
  },
  async adminListBanners(): Promise<Banner[]> {
    return (await listBannersFn()) as Banner[];
  },
  async adminCreateBanner(input: Omit<Banner, "id">): Promise<Banner> {
    return (await adminCreateBannerFn({ data: input as unknown as Record<string, unknown> })) as Banner;
  },
  async adminUpdateBanner(id: string, patch: Partial<Banner>): Promise<Banner> {
    return (await adminUpdateBannerFn({ data: { id, patch: patch as unknown as Record<string, unknown> } })) as Banner;
  },
  async adminDeleteBanner(id: string): Promise<{ ok: true }> {
    return await adminDeleteBannerFn({ data: { id } });
  },
};
