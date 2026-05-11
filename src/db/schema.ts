import {
  pgTable, text, integer, boolean, timestamp, jsonb, uuid, pgEnum, primaryKey, unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/* ============ enums ============ */
export const appRole = pgEnum("app_role", ["admin", "user"]);
export const orderStatus = pgEnum("order_status", [
  "pending", "paid", "processing", "shipped", "delivered", "cancelled", "refunded",
]);
export const deliveryMethod = pgEnum("delivery_method", ["pickup", "courier", "post", "cdek"]);

/* ============ better-auth core tables ============ */
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  name: text("name").notNull().default(""),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  password: text("password"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ============ app domain tables ============ */
export const profiles = pgTable("profiles", {
  id: text("id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  name: text("name").notNull().default(""),
  phone: text("phone"),
  bonusBalance: integer("bonus_balance").notNull().default(0),
  totalSpent: integer("total_spent").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userRoles = pgTable("user_roles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  role: appRole("role").notNull(),
}, (t) => ({
  uniq: unique().on(t.userId, t.role),
}));

export const categories = pgTable("categories", {
  id: text("id").primaryKey(),
  nameRu: text("name_ru").notNull(),
  nameEn: text("name_en").notNull(),
  position: integer("position").notNull().default(0),
});

export const products = pgTable("products", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  nameRu: text("name_ru").notNull(),
  nameEn: text("name_en").notNull(),
  descriptionRu: text("description_ru").notNull().default(""),
  descriptionEn: text("description_en").notNull().default(""),
  price: integer("price").notNull(),
  oldPrice: integer("old_price"),
  categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
  images: jsonb("images").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  ingredients: jsonb("ingredients").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  benefits: jsonb("benefits").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  howTo: text("how_to").notNull().default(""),
  volume: text("volume").notNull().default(""),
  stock: integer("stock").notNull().default(0),
  rating: integer("rating").notNull().default(50), // *10
  reviewsCount: integer("reviews_count").notNull().default(0),
  isNew: boolean("is_new").notNull().default(false),
  isBestseller: boolean("is_bestseller").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const banners = pgTable("banners", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  titleRu: text("title_ru").notNull(),
  titleEn: text("title_en").notNull(),
  subtitleRu: text("subtitle_ru").notNull().default(""),
  subtitleEn: text("subtitle_en").notNull().default(""),
  image: text("image").notNull(),
  ctaUrl: text("cta_url").notNull().default("/shop"),
  position: integer("position").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

export const posts = pgTable("posts", {
  slug: text("slug").primaryKey(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull().default(""),
  body: text("body").notNull().default(""),
  cover: text("cover").notNull(),
  category: text("category").notNull().default(""),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
});

export const promos = pgTable("promos", {
  code: text("code").primaryKey(),
  description: text("description").notNull().default(""),
  percent: integer("percent"),
  amount: integer("amount"),
  usesLeft: integer("uses_left"),
});

export const giftCards = pgTable("gift_cards", {
  code: text("code").primaryKey(),
  initial: integer("initial").notNull(),
  remaining: integer("remaining").notNull(),
  recipientEmail: text("recipient_email"),
  message: text("message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bundles = pgTable("bundles", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  image: text("image").notNull(),
  discountPercent: integer("discount_percent").notNull().default(0),
});

export const bundleItems = pgTable("bundle_items", {
  bundleId: text("bundle_id").notNull().references(() => bundles.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  position: integer("position").notNull().default(0),
}, (t) => ({
  pk: primaryKey({ columns: [t.bundleId, t.productId] }),
}));

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  number: text("number").notNull().unique(),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  status: orderStatus("status").notNull().default("pending"),
  items: jsonb("items").$type<Array<{ productId: string; name: string; quantity: number; price: number; image?: string }>>().notNull(),
  subtotal: integer("subtotal").notNull(),
  deliveryMethod: deliveryMethod("delivery_method").notNull(),
  deliveryPrice: integer("delivery_price").notNull().default(0),
  deliveryAddress: text("delivery_address"),
  promoCode: text("promo_code"),
  promoDiscount: integer("promo_discount").notNull().default(0),
  bonusUsed: integer("bonus_used").notNull().default(0),
  bonusEarned: integer("bonus_earned").notNull().default(0),
  totalPrice: integer("total_price").notNull(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone").notNull(),
  trackingNumber: text("tracking_number"),
  estimatedDelivery: timestamp("estimated_delivery", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
