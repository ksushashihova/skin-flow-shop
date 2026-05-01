// Mock REST API layer.
// CONTRACT — реализуйте на своём backend как есть. См. оригинальный список в README.

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

export const TIERS: {
  id: BonusTier;
  label: string;
  min: number;
  rate: number;
  perks: string[];
}[] = [
  { id: "silver", label: "СЕРЕБРО", min: 0, rate: 0.05, perks: ["5% бонусов с каждого заказа"] },
  { id: "gold", label: "ЗОЛОТО", min: 10000, rate: 0.07, perks: ["7% бонусов", "Приоритетная поддержка"] },
  { id: "platinum", label: "ПЛАТИНА", min: 50000, rate: 0.10, perks: ["10% бонусов", "Бесплатная доставка", "Ранний доступ к новинкам"] },
];

export function tierFor(totalSpent: number): typeof TIERS[number] {
  return [...TIERS].reverse().find((t) => totalSpent >= t.min) ?? TIERS[0];
}

export interface Product {
  id: string;
  slug: string;
  name_ru: string;
  name_en: string;
  tagline_ru: string;
  tagline_en: string;
  description_ru: string;
  description_en: string;
  price: number;
  images: string[];
  stock: number;
  category: "lip" | "skin" | "body";
  videoUrl?: string;
  howToUse?: string;
}

export interface CartItem {
  id: string;
  productId?: string;
  bundleId?: string;
  quantity: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  image?: string;
}

export interface TrackingStage {
  key: "placed" | "packed" | "shipped" | "delivered";
  label: string;
  date?: string;
  done: boolean;
}

export interface Order {
  id: string;
  userId: string;
  userEmail: string;
  status: OrderStatus;
  totalPrice: number;
  items: OrderItem[];
  address: { city: string; addressLine: string; postalCode: string };
  paymentMethod: PaymentMethod;
  deliveryMethod: DeliveryMethod;
  deliveryPrice: number;
  bonusUsed: number;
  bonusEarned: number;
  promoUsed?: string;
  promoDiscount: number;
  trackingNumber?: string;
  estimatedDelivery?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  id: string;
  userId: string;
  city: string;
  addressLine: string;
  postalCode: string;
}

export interface Post {
  slug: string;
  title: string;
  excerpt: string;
  cover: string;
  category: string;
  date: string;
  body: string[];
}

export interface Review {
  id: string;
  productId: string;
  userId?: string;
  authorName: string;
  rating: number; // 1..5
  text: string;
  photos: string[];
  createdAt: string;
}

export interface Bundle {
  id: string;
  slug: string;
  name: string;
  description: string;
  productIds: string[];
  cover: string;
  discountPercent: number; // 0..100
}

export interface GiftCard {
  code: string;
  amount: number;
  design: "minimal" | "floral";
  recipientEmail: string;
  message?: string;
  buyerUserId?: string;
  remaining: number;
  createdAt: string;
}

export interface PromoCode {
  code: string;
  percent?: number; // % off
  amount?: number; // flat ₽
  description: string;
  usesLeft?: number;
}

export interface Subscriber {
  email: string;
  consent: boolean;
  promoCode: string;
  createdAt: string;
}

import { PRODUCTS as SEED_PRODUCTS } from "./products";
import { POSTS as SEED_POSTS } from "./posts";

const LS_KEY = "demo_state_v6";

interface DemoState {
  users: (User & { passwordHash: string })[];
  products: Product[];
  posts: Post[];
  cart: CartItem[];
  orders: Order[];
  addresses: Address[];
  reviews: Review[];
  bundles: Bundle[];
  giftCards: GiftCard[];
  promos: PromoCode[];
  subscribers: Subscriber[];
  sessionUserId: string | null;
}

function load(): DemoState {
  if (typeof window === "undefined") return seed();
  const raw = localStorage.getItem(LS_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as DemoState;
      // безопасные дефолты если состояние из старой версии
      parsed.reviews ??= seedReviews();
      parsed.bundles ??= seedBundles();
      parsed.giftCards ??= [];
      parsed.promos ??= seedPromos();
      parsed.subscribers ??= [];
      return parsed;
    } catch { /* ignore */ }
  }
  const initial = seed();
  localStorage.setItem(LS_KEY, JSON.stringify(initial));
  return initial;
}

function seed(): DemoState {
  return {
    users: seedUsers(),
    products: [...SEED_PRODUCTS],
    posts: [...SEED_POSTS],
    cart: [],
    orders: seedOrders(),
    addresses: [],
    reviews: seedReviews(),
    bundles: seedBundles(),
    giftCards: [],
    promos: seedPromos(),
    subscribers: [],
    sessionUserId: null,
  };
}

function save(s: DemoState) {
  if (typeof window !== "undefined") localStorage.setItem(LS_KEY, JSON.stringify(s));
}
function emitAuthChange() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("oblako-auth-change"));
}

function seedUsers(): (User & { passwordHash: string })[] {
  return [
    {
      id: "u_admin", email: "admin@demo.ru", role: "admin",
      name: "Администратор", phone: "+7 999 000 00 00",
      bonusBalance: 0, totalSpent: 0, passwordHash: "admin123",
      createdAt: new Date().toISOString(),
    },
    {
      id: "u_demo", email: "client@demo.ru", role: "user",
      name: "Анна", phone: "+7 916 123 45 67",
      bonusBalance: 250, totalSpent: 4980, passwordHash: "demo1234",
      createdAt: new Date().toISOString(),
    },
  ];
}
function seedOrders(): Order[] {
  const p = SEED_PRODUCTS[0];
  return [
    {
      id: "o_1001",
      userId: "u_demo",
      userEmail: "client@demo.ru",
      status: "shipped",
      totalPrice: 4980,
      items: [{ productId: p.id, name: p.name_ru, quantity: 2, price: p.price, image: p.images[0] }],
      address: { city: "Москва", addressLine: "ул. Тверская, 12", postalCode: "125009" },
      paymentMethod: "card_online",
      deliveryMethod: "courier",
      deliveryPrice: 0,
      bonusUsed: 0,
      bonusEarned: 249,
      promoDiscount: 0,
      trackingNumber: "1234567890",
      estimatedDelivery: new Date(Date.now() + 86400000 * 2).toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    },
  ];
}
function seedReviews(): Review[] {
  const ph = "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80";
  return [
    {
      id: "r_1", productId: "p_balm_peptide", authorName: "Анна В.",
      rating: 5, text: "Лучший бальзам — губы мягкие весь день, без липкости. Беру второй раз.",
      photos: [ph], createdAt: new Date(Date.now() - 86400000 * 16).toISOString(),
    },
    {
      id: "r_2", productId: "p_balm_peptide", authorName: "Мария К.",
      rating: 4, text: "Хорошо увлажняет, аромат ненавязчивый. Чуть бы матовее финиш.",
      photos: [], createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    },
    {
      id: "r_3", productId: "p_glaze_treatment", authorName: "Ольга",
      rating: 5, text: "Эффект glass skin реально есть, кожа сияет даже без макияжа.",
      photos: [ph], createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
  ];
}
function seedBundles(): Bundle[] {
  return [
    {
      id: "b_morning",
      slug: "morning-ritual",
      name: "Утренний ритуал",
      description: "Очищение, тонизация и увлажнение для свежего старта дня.",
      productIds: ["p_cleanser_gel", "p_glaze_treatment", "p_barrier_cream"],
      cover: "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&w=1200&q=80",
      discountPercent: 15,
    },
    {
      id: "b_night",
      slug: "night-recovery",
      name: "Ночное восстановление",
      description: "Глубокое восстановление кожи и губ во время сна.",
      productIds: ["p_night_oil", "p_eye_cream", "p_balm_peptide"],
      cover: "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab12?auto=format&fit=crop&w=1200&q=80",
      discountPercent: 12,
    },
  ];
}
function seedPromos(): PromoCode[] {
  return [
    { code: "WELCOME10", percent: 10, description: "Скидка 10% за подписку на рассылку" },
  ];
}

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

function strip(u: User & { passwordHash: string }): User {
  const { passwordHash: _ph, ...rest } = u;
  void _ph;
  return rest;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[а-яё]/g, (c) => {
      const map: Record<string, string> = {
        а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"y",
        к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",
        х:"h",ц:"ts",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya",
      };
      return map[c] ?? c;
    })
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || ("id-" + Math.random().toString(36).slice(2, 8));
}

function genCode(prefix: string): string {
  const part = () => Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4).padEnd(4, "0");
  return `${prefix}-${part()}-${part()}`;
}

export const DELIVERY_PRICES: Record<DeliveryMethod, number> = {
  pickup: 0, courier: 390, post: 290, cdek: 350,
};

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
  const created = o.createdAt;
  const order = ["new", "paid", "shipped", "completed"] as const;
  const idx = (s: OrderStatus) => order.indexOf(s as typeof order[number]);
  const cur = o.status === "cancelled" ? -1 : idx(o.status);
  const fmt = (iso?: string) => iso ? new Date(iso).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) : undefined;
  return [
    { key: "placed", label: "Оформлен", date: fmt(created), done: cur >= 0 },
    { key: "packed", label: "Собран", date: cur >= 1 ? fmt(o.updatedAt) : undefined, done: cur >= 1 },
    { key: "shipped", label: "В пути", date: cur >= 2 ? fmt(o.updatedAt) : undefined, done: cur >= 2 },
    { key: "delivered", label: "Доставлен", date: cur >= 3 ? fmt(o.updatedAt) : undefined, done: cur >= 3 },
  ];
}

function bundlePrice(b: Bundle, products: Product[]): { full: number; discounted: number } {
  const full = b.productIds.reduce((s, id) => {
    const p = products.find((x) => x.id === id);
    return s + (p?.price ?? 0);
  }, 0);
  return { full, discounted: Math.round(full * (1 - b.discountPercent / 100)) };
}

export const api = {
  // -------- auth --------
  async register(email: string, password: string, name: string, phone?: string) {
    await delay();
    const s = load();
    if (s.users.find((u) => u.email === email)) throw new Error("Пользователь с таким email уже существует");
    const u = {
      id: "u_" + Math.random().toString(36).slice(2, 8),
      email, role: "user" as Role, name, phone,
      bonusBalance: 0, totalSpent: 0, passwordHash: password,
      createdAt: new Date().toISOString(),
    };
    s.users.push(u);
    s.sessionUserId = u.id;
    save(s);
    emitAuthChange();
    return { token: "demo." + u.id, user: strip(u) };
  },
  async login(email: string, password: string) {
    await delay();
    const s = load();
    const u = s.users.find((x) => x.email === email && x.passwordHash === password);
    if (!u) throw new Error("Неверный email или пароль");
    s.sessionUserId = u.id;
    save(s);
    emitAuthChange();
    return { token: "demo." + u.id, user: strip(u) };
  },
  async logout() {
    const s = load();
    s.sessionUserId = null;
    save(s);
    emitAuthChange();
  },
  async me(): Promise<User | null> {
    const s = load();
    if (!s.sessionUserId) return null;
    const u = s.users.find((x) => x.id === s.sessionUserId);
    return u ? strip(u) : null;
  },
  async updateMe(patch: Partial<Pick<User, "name" | "phone">>): Promise<User> {
    const s = load();
    const u = s.users.find((x) => x.id === s.sessionUserId);
    if (!u) throw new Error("Не авторизован");
    Object.assign(u, patch);
    save(s);
    return strip(u);
  },

  // -------- products --------
  async listProducts(query = ""): Promise<Product[]> {
    await delay(120);
    const s = load();
    const q = query.trim().toLowerCase();
    if (!q) return s.products;
    return s.products.filter((p) =>
      [p.name_ru, p.name_en, p.tagline_ru, p.tagline_en].some((t) => t.toLowerCase().includes(q))
    );
  },
  async getProduct(id: string): Promise<Product | null> {
    await delay(100);
    const s = load();
    return s.products.find((p) => p.id === id || p.slug === id) ?? null;
  },

  // -------- cart --------
  async getCart(): Promise<CartItem[]> {
    return load().cart;
  },
  async addToCart(productId: string, quantity = 1): Promise<CartItem[]> {
    const s = load();
    const product = s.products.find((p) => p.id === productId);
    if (!product) throw new Error("Товар не найден");
    const existing = s.cart.find((c) => c.productId === productId && !c.bundleId);
    const desired = (existing?.quantity ?? 0) + quantity;
    if (desired > product.stock) throw new Error(`Доступно только ${product.stock} шт.`);
    if (existing) existing.quantity += quantity;
    else s.cart.push({ id: "ci_" + Math.random().toString(36).slice(2, 8), productId, quantity });
    save(s);
    return s.cart;
  },
  async addBundleToCart(bundleId: string, quantity = 1): Promise<CartItem[]> {
    const s = load();
    const b = s.bundles.find((x) => x.id === bundleId);
    if (!b) throw new Error("Набор не найден");
    const existing = s.cart.find((c) => c.bundleId === bundleId);
    if (existing) existing.quantity += quantity;
    else s.cart.push({ id: "ci_" + Math.random().toString(36).slice(2, 8), bundleId, quantity });
    save(s);
    return s.cart;
  },
  async updateCart(itemId: string, quantity: number): Promise<CartItem[]> {
    const s = load();
    const item = s.cart.find((c) => c.id === itemId);
    if (item) {
      if (quantity <= 0) s.cart = s.cart.filter((c) => c.id !== itemId);
      else item.quantity = quantity;
    }
    save(s);
    return s.cart;
  },
  async removeFromCart(itemId: string): Promise<CartItem[]> {
    const s = load();
    s.cart = s.cart.filter((c) => c.id !== itemId);
    save(s);
    return s.cart;
  },

  // -------- promo --------
  async checkPromo(code: string, subtotal: number): Promise<{ promo: PromoCode; discount: number }> {
    const s = load();
    const c = code.trim().toUpperCase();
    if (!c) throw new Error("Введите код");
    // gift card?
    const gc = s.giftCards.find((g) => g.code === c && g.remaining > 0);
    if (gc) {
      const promo: PromoCode = { code: gc.code, amount: gc.remaining, description: `Подарочный сертификат на ${gc.remaining} ₽` };
      return { promo, discount: Math.min(gc.remaining, subtotal) };
    }
    const p = s.promos.find((x) => x.code === c);
    if (!p) throw new Error("Промокод не найден");
    if (p.usesLeft !== undefined && p.usesLeft <= 0) throw new Error("Промокод исчерпан");
    let discount = 0;
    if (p.percent) discount = Math.round(subtotal * (p.percent / 100));
    if (p.amount) discount = Math.min(p.amount, subtotal);
    return { promo: p, discount };
  },

  // -------- orders --------
  async createOrder(
    address: { city: string; addressLine: string; postalCode: string },
    paymentMethod: PaymentMethod,
    deliveryMethod: DeliveryMethod,
    consent: boolean,
    bonusUse: number = 0,
    promoCode?: string,
  ): Promise<Order> {
    await delay(350);
    if (!consent) throw new Error("Необходимо согласие на обработку персональных данных");
    const s = load();
    if (!s.sessionUserId) throw new Error("Войдите, чтобы оформить заказ");
    if (s.cart.length === 0) throw new Error("Корзина пуста");
    const user = s.users.find((u) => u.id === s.sessionUserId)!;

    // развернуть наборы в позиции
    const items: OrderItem[] = [];
    for (const c of s.cart) {
      if (c.productId) {
        const p = s.products.find((p) => p.id === c.productId);
        if (!p) throw new Error("Товар недоступен");
        if (c.quantity > p.stock) throw new Error(`Недостаточно "${p.name_ru}": доступно ${p.stock}`);
        items.push({ productId: p.id, name: p.name_ru, quantity: c.quantity, price: p.price, image: p.images[0] });
      } else if (c.bundleId) {
        const b = s.bundles.find((x) => x.id === c.bundleId);
        if (!b) throw new Error("Набор недоступен");
        const { discounted, full } = bundlePrice(b, s.products);
        for (const pid of b.productIds) {
          const p = s.products.find((x) => x.id === pid);
          if (!p) throw new Error("Товар из набора недоступен");
          if (c.quantity > p.stock) throw new Error(`Недостаточно "${p.name_ru}": доступно ${p.stock}`);
          // распределяем скидку пропорционально
          const share = full > 0 ? p.price / full : 0;
          items.push({
            productId: p.id,
            name: `${p.name_ru} · ${b.name}`,
            quantity: c.quantity,
            price: Math.round(discounted * share),
            image: p.images[0],
          });
        }
      }
    }
    // списание остатков
    for (const it of items) {
      const p = s.products.find((p) => p.id === it.productId)!;
      p.stock = Math.max(0, p.stock - it.quantity);
    }

    const tier = tierFor(user.totalSpent);
    const baseDelivery = DELIVERY_PRICES[deliveryMethod];
    const deliveryPrice = tier.id === "platinum" ? 0 : baseDelivery;
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    // promo / gift card
    let promoDiscount = 0;
    let promoUsed: string | undefined;
    if (promoCode) {
      const code = promoCode.trim().toUpperCase();
      const gc = s.giftCards.find((g) => g.code === code && g.remaining > 0);
      if (gc) {
        promoDiscount = Math.min(gc.remaining, subtotal);
        gc.remaining -= promoDiscount;
        promoUsed = code;
      } else {
        const p = s.promos.find((x) => x.code === code);
        if (p && (p.usesLeft === undefined || p.usesLeft > 0)) {
          if (p.percent) promoDiscount = Math.round(subtotal * (p.percent / 100));
          if (p.amount) promoDiscount = Math.min(p.amount, subtotal);
          if (p.usesLeft !== undefined) p.usesLeft -= 1;
          promoUsed = code;
        }
      }
    }

    const afterPromo = Math.max(0, subtotal - promoDiscount);
    const maxBonus = Math.min(user.bonusBalance, Math.floor(afterPromo * 0.5));
    const bonusUsed = Math.max(0, Math.min(bonusUse, maxBonus));
    const totalPrice = Math.max(0, afterPromo + deliveryPrice - bonusUsed);
    // Бонусы НЕ начисляются сразу — только после доставки заказа.
    // Списание бонусов происходит сразу при оформлении.
    const bonusEarned = Math.round((afterPromo - bonusUsed) * tier.rate);
    user.bonusBalance = Math.max(0, user.bonusBalance - bonusUsed);
    user.totalSpent += totalPrice;

    const order: Order = {
      id: "o_" + Date.now().toString(36),
      userId: user.id, userEmail: user.email,
      status: "new", totalPrice, items, address,
      paymentMethod, deliveryMethod, deliveryPrice,
      bonusUsed, bonusEarned, promoUsed, promoDiscount,
      trackingNumber: deliveryMethod === "pickup" ? undefined : String(Math.floor(Math.random() * 9000000000) + 1000000000),
      estimatedDelivery: new Date(Date.now() + 86400000 * (deliveryMethod === "courier" ? 2 : deliveryMethod === "cdek" ? 5 : deliveryMethod === "post" ? 8 : 1)).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    s.orders.unshift(order);
    s.cart = [];
    save(s);
    emitAuthChange();
    return order;
  },
  async listOrders(): Promise<Order[]> {
    const s = load();
    if (!s.sessionUserId) return [];
    return s.orders.filter((o) => o.userId === s.sessionUserId);
  },
  async getOrder(id: string): Promise<Order | null> {
    const s = load();
    return s.orders.find((o) => o.id === id) ?? null;
  },
  async cancelOrder(id: string): Promise<Order> {
    const s = load();
    const o = s.orders.find((x) => x.id === id);
    if (!o) throw new Error("Заказ не найден");
    if (o.userId !== s.sessionUserId) throw new Error("Нет доступа");
    if (o.status === "shipped" || o.status === "completed") {
      throw new Error("Этот заказ уже нельзя отменить");
    }
    if (o.status !== "cancelled") {
      for (const it of o.items) {
        const p = s.products.find((p) => p.id === it.productId);
        if (p) p.stock += it.quantity;
      }
      const u = s.users.find((x) => x.id === o.userId);
      if (u) {
        u.bonusBalance = Math.max(0, u.bonusBalance - o.bonusEarned + o.bonusUsed);
        u.totalSpent = Math.max(0, u.totalSpent - o.totalPrice);
      }
    }
    o.status = "cancelled";
    o.updatedAt = new Date().toISOString();
    save(s);
    emitAuthChange();
    return o;
  },

  // -------- admin orders/users --------
  async adminListOrders(): Promise<Order[]> {
    return load().orders;
  },
  async adminUpdateOrder(id: string, status: OrderStatus): Promise<Order> {
    const s = load();
    const o = s.orders.find((x) => x.id === id);
    if (!o) throw new Error("Заказ не найден");
    const prev = o.status;
    o.status = status;
    o.updatedAt = new Date().toISOString();
    const u = s.users.find((x) => x.id === o.userId);
    if (u) {
      // Начисляем бонусы только при первом переходе в "completed" (получен)
      if (status === "completed" && prev !== "completed" && o.bonusEarned > 0) {
        u.bonusBalance += o.bonusEarned;
      }
      // Если откатываем completed -> другой статус — снимаем начисленные бонусы
      if (prev === "completed" && status !== "completed" && o.bonusEarned > 0) {
        u.bonusBalance = Math.max(0, u.bonusBalance - o.bonusEarned);
      }
    }
    save(s);
    emitAuthChange();
    return o;
  },
  async adminUpdateOrderTracking(id: string, trackingNumber: string, estimatedDelivery?: string): Promise<Order> {
    const s = load();
    const o = s.orders.find((x) => x.id === id);
    if (!o) throw new Error("Заказ не найден");
    o.trackingNumber = trackingNumber;
    if (estimatedDelivery) o.estimatedDelivery = estimatedDelivery;
    o.updatedAt = new Date().toISOString();
    save(s);
    return o;
  },
  async adminListUsers(): Promise<User[]> {
    return load().users.map(strip);
  },
  async adminGetUserOrders(userId: string): Promise<Order[]> {
    return load().orders.filter((o) => o.userId === userId);
  },

  // -------- products CRUD --------
  async adminCreateProduct(input: Omit<Product, "id" | "slug"> & { slug?: string }): Promise<Product> {
    const s = load();
    const slug = input.slug?.trim() || slugify(input.name_ru || input.name_en);
    const product: Product = { ...input, id: "p_" + Math.random().toString(36).slice(2, 8), slug };
    s.products.unshift(product);
    save(s);
    return product;
  },
  async adminUpdateProduct(id: string, patch: Partial<Product>): Promise<Product> {
    const s = load();
    const p = s.products.find((x) => x.id === id);
    if (!p) throw new Error("Товар не найден");
    Object.assign(p, patch);
    save(s);
    return p;
  },
  async adminDeleteProduct(id: string): Promise<{ ok: true }> {
    const s = load();
    s.products = s.products.filter((p) => p.id !== id);
    save(s);
    return { ok: true };
  },

  // -------- posts CRUD --------
  async listPosts(): Promise<Post[]> { return load().posts; },
  async getPost(slug: string): Promise<Post | null> {
    return load().posts.find((p) => p.slug === slug) ?? null;
  },
  async adminCreatePost(input: Omit<Post, "slug"> & { slug?: string }): Promise<Post> {
    const s = load();
    const slug = input.slug?.trim() || slugify(input.title);
    if (s.posts.find((p) => p.slug === slug)) throw new Error("Статья с таким slug уже существует");
    const post: Post = { ...input, slug };
    s.posts.unshift(post);
    save(s);
    return post;
  },
  async adminUpdatePost(slug: string, patch: Partial<Post>): Promise<Post> {
    const s = load();
    const p = s.posts.find((x) => x.slug === slug);
    if (!p) throw new Error("Статья не найдена");
    Object.assign(p, patch);
    save(s);
    return p;
  },
  async adminDeletePost(slug: string): Promise<{ ok: true }> {
    const s = load();
    s.posts = s.posts.filter((p) => p.slug !== slug);
    save(s);
    return { ok: true };
  },

  // -------- reviews --------
  async listReviews(productId: string): Promise<Review[]> {
    return load().reviews.filter((r) => r.productId === productId);
  },
  async addReview(input: Omit<Review, "id" | "createdAt" | "userId">): Promise<Review> {
    const s = load();
    const review: Review = {
      ...input,
      id: "r_" + Math.random().toString(36).slice(2, 8),
      userId: s.sessionUserId ?? undefined,
      createdAt: new Date().toISOString(),
    };
    s.reviews.unshift(review);
    save(s);
    return review;
  },
  async adminDeleteReview(id: string): Promise<{ ok: true }> {
    const s = load();
    s.reviews = s.reviews.filter((r) => r.id !== id);
    save(s);
    return { ok: true };
  },
  async adminListReviews(): Promise<Review[]> { return load().reviews; },

  // -------- bundles --------
  async listBundles(): Promise<Bundle[]> { return load().bundles; },
  async getBundle(idOrSlug: string): Promise<Bundle | null> {
    const s = load();
    return s.bundles.find((b) => b.id === idOrSlug || b.slug === idOrSlug) ?? null;
  },
  bundlePrice(b: Bundle, products: Product[]) { return bundlePrice(b, products); },
  async adminCreateBundle(input: Omit<Bundle, "id" | "slug"> & { slug?: string }): Promise<Bundle> {
    const s = load();
    const slug = input.slug?.trim() || slugify(input.name);
    const b: Bundle = { ...input, id: "b_" + Math.random().toString(36).slice(2, 8), slug };
    s.bundles.unshift(b);
    save(s);
    return b;
  },
  async adminUpdateBundle(id: string, patch: Partial<Bundle>): Promise<Bundle> {
    const s = load();
    const b = s.bundles.find((x) => x.id === id);
    if (!b) throw new Error("Набор не найден");
    Object.assign(b, patch);
    save(s);
    return b;
  },
  async adminDeleteBundle(id: string): Promise<{ ok: true }> {
    const s = load();
    s.bundles = s.bundles.filter((b) => b.id !== id);
    save(s);
    return { ok: true };
  },

  // -------- gift cards --------
  async createGiftCard(input: { amount: number; design: GiftCard["design"]; recipientEmail: string; message?: string }): Promise<GiftCard> {
    if (!input.amount || input.amount < 500) throw new Error("Минимальный номинал — 500 ₽");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.recipientEmail)) throw new Error("Некорректный email получателя");
    const s = load();
    const code = genCode("GIFT");
    const gc: GiftCard = {
      code, amount: input.amount, remaining: input.amount,
      design: input.design, recipientEmail: input.recipientEmail,
      message: input.message?.slice(0, 300),
      buyerUserId: s.sessionUserId ?? undefined,
      createdAt: new Date().toISOString(),
    };
    s.giftCards.unshift(gc);
    save(s);
    console.info("[demo] сертификат отправлен на", input.recipientEmail, "code:", code);
    return gc;
  },
  async adminListGiftCards(): Promise<GiftCard[]> { return load().giftCards; },

  // -------- newsletter --------
  async subscribe(email: string, consent: boolean): Promise<{ subscriber: Subscriber; promo: PromoCode }> {
    if (!consent) throw new Error("Необходимо согласие на обработку данных");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Некорректный email");
    const s = load();
    if (s.subscribers.find((x) => x.email === email)) throw new Error("Вы уже подписаны");
    const promo = s.promos.find((p) => p.code === "WELCOME10")!;
    const sub: Subscriber = { email, consent, promoCode: promo.code, createdAt: new Date().toISOString() };
    s.subscribers.unshift(sub);
    save(s);
    return { subscriber: sub, promo };
  },
  async adminListSubscribers(): Promise<Subscriber[]> { return load().subscribers; },
};
