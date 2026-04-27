// Mock REST API layer.
// CONTRACT — реализуйте на своём Next.js + Express + PostgreSQL backend как есть:
//
//   POST   /api/auth/register       { email, password, name }            -> { token, user }
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
//   POST   /api/orders              { addressId, consent: true }         -> Order
//   GET    /api/orders                                                   -> Order[]
//   GET    /api/orders/:id                                               -> Order
//
//   GET    /api/admin/orders                                             -> Order[]
//   PATCH  /api/admin/orders/:id    { status }                           -> Order
//   GET    /api/admin/users                                              -> User[]

export type Role = "guest" | "user" | "admin";
export type OrderStatus = "new" | "paid" | "shipped" | "completed" | "cancelled";

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
  price: number; // RUB
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
}

export interface Order {
  id: string;
  userId: string;
  userEmail: string;
  status: OrderStatus;
  totalPrice: number;
  items: OrderItem[];
  address: { city: string; addressLine: string; postalCode: string };
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

import { PRODUCTS } from "./products";

// ---------- in-memory store (демо) ----------
const LS_KEY = "demo_state_v1";

interface DemoState {
  users: (User & { passwordHash: string })[];
  cart: CartItem[];
  orders: Order[];
  addresses: Address[];
  sessionUserId: string | null;
}

function load(): DemoState {
  if (typeof window === "undefined") {
    return { users: seedUsers(), cart: [], orders: [], addresses: [], sessionUserId: null };
  }
  const raw = localStorage.getItem(LS_KEY);
  if (raw) {
    try { return JSON.parse(raw) as DemoState; } catch {/* ignore */}
  }
  const initial: DemoState = {
    users: seedUsers(),
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
      passwordHash: "admin123",
      createdAt: new Date().toISOString(),
    },
    {
      id: "u_demo",
      email: "client@demo.ru",
      role: "user",
      name: "Анна",
      passwordHash: "demo1234",
      createdAt: new Date().toISOString(),
    },
  ];
}
function seedOrders(): Order[] {
  return [
    {
      id: "o_1001",
      userId: "u_demo",
      userEmail: "client@demo.ru",
      status: "shipped",
      totalPrice: 4980,
      items: [
        { productId: PRODUCTS[0].id, name: PRODUCTS[0].name_ru, quantity: 2, price: PRODUCTS[0].price },
      ],
      address: { city: "Москва", addressLine: "ул. Тверская, 12", postalCode: "125009" },
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
  ];
}

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

function strip(u: User & { passwordHash: string }): User {
  const { passwordHash: _ph, ...rest } = u;
  void _ph;
  return rest;
}

// ---------- Auth ----------
export const api = {
  async register(email: string, password: string, name: string): Promise<{ token: string; user: User }> {
    await delay();
    const s = load();
    if (s.users.find((u) => u.email === email)) throw new Error("Пользователь с таким email уже существует");
    const u = {
      id: "u_" + Math.random().toString(36).slice(2, 8),
      email, role: "user" as Role, name, passwordHash: password,
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

  // ---------- Products ----------
  async listProducts(query = ""): Promise<Product[]> {
    await delay(150);
    const q = query.trim().toLowerCase();
    if (!q) return PRODUCTS;
    return PRODUCTS.filter((p) =>
      [p.name_ru, p.name_en, p.tagline_ru, p.tagline_en].some((t) => t.toLowerCase().includes(q))
    );
  },
  async getProduct(id: string): Promise<Product | null> {
    await delay(120);
    return PRODUCTS.find((p) => p.id === id || p.slug === id) ?? null;
  },

  // ---------- Cart ----------
  async getCart(): Promise<CartItem[]> {
    return load().cart;
  },
  async addToCart(productId: string, quantity = 1): Promise<CartItem[]> {
    const s = load();
    const existing = s.cart.find((c) => c.productId === productId);
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

  // ---------- Orders ----------
  async createOrder(address: { city: string; addressLine: string; postalCode: string }, consent: boolean): Promise<Order> {
    await delay(400);
    if (!consent) throw new Error("Необходимо согласие на обработку персональных данных");
    const s = load();
    if (!s.sessionUserId) throw new Error("Войдите, чтобы оформить заказ");
    if (s.cart.length === 0) throw new Error("Корзина пуста");
    const user = s.users.find((u) => u.id === s.sessionUserId)!;
    const items: OrderItem[] = s.cart.map((c) => {
      const p = PRODUCTS.find((p) => p.id === c.productId)!;
      return { productId: p.id, name: p.name_ru, quantity: c.quantity, price: p.price };
    });
    const order: Order = {
      id: "o_" + Date.now().toString(36),
      userId: user.id,
      userEmail: user.email,
      status: "new",
      totalPrice: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      items,
      address,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    s.orders.unshift(order);
    s.cart = [];
    save(s);
    // здесь backend отправляет email через SMTP
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

  // ---------- Admin ----------
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
};
