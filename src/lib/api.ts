// Mock REST API layer.
// CONTRACT — реализуйте на своём Next.js + Express + PostgreSQL backend как есть:
//
//   POST   /api/auth/register       { email, password, name, phone? }    -> { token, user }
//   POST   /api/auth/login          { email, password }                  -> { token, user }
//   GET    /api/users/me                                                 -> User
//   PUT    /api/users/me            { name?, phone? }                    -> User
//
//   GET    /api/products?query=&lang=                                    -> Product[]
//   GET    /api/products/:id                                             -> Product
//
//   GET    /api/cart                                                     -> CartItem[]
//   POST   /api/cart                { productId, quantity }              -> CartItem[]
//   PUT    /api/cart/:itemId        { quantity }                         -> CartItem[]
//   DELETE /api/cart/:itemId                                             -> CartItem[]
//
//   POST   /api/orders              { address, paymentMethod, deliveryMethod, consent } -> Order
//   GET    /api/orders                                                   -> Order[]
//   GET    /api/orders/:id                                               -> Order
//   POST   /api/orders/:id/cancel                                        -> Order
//
//   GET    /api/admin/orders                                             -> Order[]
//   PATCH  /api/admin/orders/:id    { status }                           -> Order
//   GET    /api/admin/users                                              -> User[]
//
//   POST   /api/admin/products      Product                              -> Product
//   PUT    /api/admin/products/:id  Partial<Product>                     -> Product
//   DELETE /api/admin/products/:id                                       -> { ok: true }
//
//   GET    /api/posts                                                    -> Post[]
//   GET    /api/posts/:slug                                              -> Post
//   POST   /api/admin/posts         Post                                 -> Post
//   PUT    /api/admin/posts/:slug   Partial<Post>                        -> Post
//   DELETE /api/admin/posts/:slug                                        -> { ok: true }

export type Role = "guest" | "user" | "admin";
export type OrderStatus = "new" | "paid" | "shipped" | "completed" | "cancelled";
export type PaymentMethod = "card_online" | "card_on_delivery" | "sbp" | "cash";
export type DeliveryMethod = "pickup" | "courier" | "post" | "cdek";

export interface User {
  id: string;
  email: string;
  role: Role;
  name: string;
  phone?: string;
  createdAt: string;
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
}

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  image?: string;
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

import { PRODUCTS as SEED_PRODUCTS } from "./products";
import { POSTS as SEED_POSTS } from "./posts";

const LS_KEY = "demo_state_v3";

interface DemoState {
  users: (User & { passwordHash: string })[];
  products: Product[];
  posts: Post[];
  cart: CartItem[];
  orders: Order[];
  addresses: Address[];
  sessionUserId: string | null;
}

function load(): DemoState {
  if (typeof window === "undefined") {
    return {
      users: seedUsers(),
      products: [...SEED_PRODUCTS],
      posts: [...SEED_POSTS],
      cart: [], orders: [], addresses: [], sessionUserId: null,
    };
  }
  const raw = localStorage.getItem(LS_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as DemoState;
      if (!parsed.products) parsed.products = [...SEED_PRODUCTS];
      if (!parsed.posts) parsed.posts = [...SEED_POSTS];
      return parsed;
    } catch { /* ignore */ }
  }
  const initial: DemoState = {
    users: seedUsers(),
    products: [...SEED_PRODUCTS],
    posts: [...SEED_POSTS],
    cart: [],
    orders: seedOrders(),
    addresses: [],
    sessionUserId: null,
  };
  localStorage.setItem(LS_KEY, JSON.stringify(initial));
  return initial;
}
function save(s: DemoState) {
  if (typeof window !== "undefined") localStorage.setItem(LS_KEY, JSON.stringify(s));
}
function seedUsers(): (User & { passwordHash: string })[] {
  return [
    {
      id: "u_admin",
      email: "admin@demo.ru",
      role: "admin",
      name: "Администратор",
      phone: "+7 999 000 00 00",
      passwordHash: "admin123",
      createdAt: new Date().toISOString(),
    },
    {
      id: "u_demo",
      email: "client@demo.ru",
      role: "user",
      name: "Анна",
      phone: "+7 916 123 45 67",
      passwordHash: "demo1234",
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
      items: [
        { productId: p.id, name: p.name_ru, quantity: 2, price: p.price, image: p.images[0] },
      ],
      address: { city: "Москва", addressLine: "ул. Тверская, 12", postalCode: "125009" },
      paymentMethod: "card_online",
      deliveryMethod: "courier",
      deliveryPrice: 0,
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
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

export const DELIVERY_PRICES: Record<DeliveryMethod, number> = {
  pickup: 0,
  courier: 390,
  post: 290,
  cdek: 350,
};

export const api = {
  async register(email: string, password: string, name: string, phone?: string) {
    await delay();
    const s = load();
    if (s.users.find((u) => u.email === email)) throw new Error("Пользователь с таким email уже существует");
    const u = {
      id: "u_" + Math.random().toString(36).slice(2, 8),
      email, role: "user" as Role, name, phone, passwordHash: password,
      createdAt: new Date().toISOString(),
    };
    s.users.push(u);
    s.sessionUserId = u.id;
    save(s);
    return { token: "demo." + u.id, user: strip(u) };
  },

  async login(email: string, password: string) {
    await delay();
    const s = load();
    const u = s.users.find((x) => x.email === email && x.passwordHash === password);
    if (!u) throw new Error("Неверный email или пароль");
    s.sessionUserId = u.id;
    save(s);
    return { token: "demo." + u.id, user: strip(u) };
  },

  async logout() {
    const s = load();
    s.sessionUserId = null;
    save(s);
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

  async getCart(): Promise<CartItem[]> {
    return load().cart;
  },
  async addToCart(productId: string, quantity = 1): Promise<CartItem[]> {
    const s = load();
    const product = s.products.find((p) => p.id === productId);
    if (!product) throw new Error("Товар не найден");
    const existing = s.cart.find((c) => c.productId === productId);
    const desired = (existing?.quantity ?? 0) + quantity;
    if (desired > product.stock) throw new Error(`Доступно только ${product.stock} шт.`);
    if (existing) existing.quantity += quantity;
    else s.cart.push({ id: "ci_" + Math.random().toString(36).slice(2, 8), productId, quantity });
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

  async createOrder(
    address: { city: string; addressLine: string; postalCode: string },
    paymentMethod: PaymentMethod,
    deliveryMethod: DeliveryMethod,
    consent: boolean,
  ): Promise<Order> {
    await delay(350);
    if (!consent) throw new Error("Необходимо согласие на обработку персональных данных");
    const s = load();
    if (!s.sessionUserId) throw new Error("Войдите, чтобы оформить заказ");
    if (s.cart.length === 0) throw new Error("Корзина пуста");
    const user = s.users.find((u) => u.id === s.sessionUserId)!;
    const items: OrderItem[] = s.cart.map((c) => {
      const p = s.products.find((p) => p.id === c.productId)!;
      return { productId: p.id, name: p.name_ru, quantity: c.quantity, price: p.price, image: p.images[0] };
    });
    // проверка остатков
    for (const it of items) {
      const p = s.products.find((p) => p.id === it.productId)!;
      if (it.quantity > p.stock) throw new Error(`Недостаточно "${p.name_ru}": доступно ${p.stock}`);
    }
    // списание остатков
    for (const it of items) {
      const p = s.products.find((p) => p.id === it.productId)!;
      p.stock = Math.max(0, p.stock - it.quantity);
    }
    const deliveryPrice = DELIVERY_PRICES[deliveryMethod];
    const order: Order = {
      id: "o_" + Date.now().toString(36),
      userId: user.id,
      userEmail: user.email,
      status: "new",
      totalPrice: items.reduce((sum, i) => sum + i.price * i.quantity, 0) + deliveryPrice,
      items,
      address,
      paymentMethod,
      deliveryMethod,
      deliveryPrice,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    s.orders.unshift(order);
    s.cart = [];
    save(s);
    console.info("[demo] email подтверждения отправлен на", user.email);
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
    }
    o.status = "cancelled";
    o.updatedAt = new Date().toISOString();
    save(s);
    return o;
  },

  async adminListOrders(): Promise<Order[]> {
    return load().orders;
  },
  async adminUpdateOrder(id: string, status: OrderStatus): Promise<Order> {
    const s = load();
    const o = s.orders.find((x) => x.id === id);
    if (!o) throw new Error("Заказ не найден");
    o.status = status;
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
    const product: Product = {
      ...input,
      id: "p_" + Math.random().toString(36).slice(2, 8),
      slug,
    };
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
  async listPosts(): Promise<Post[]> {
    return load().posts;
  },
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
};
