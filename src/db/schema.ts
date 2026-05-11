import {
  pgSchema, text, integer, boolean, timestamp, jsonb, uuid, primaryKey, unique, index, check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/* ============ schema ============ */
// Все таблицы проекта живут в отдельной схеме `oblako`,
// чтобы не пересекаться с другими проектами в той же БД (public).
export const oblako = pgSchema("oblako");

/* ============ enums ============ */
export const appRole = oblako.enum("app_role", ["admin", "user"]);
export const orderStatus = oblako.enum("order_status", ["new", "paid", "shipped", "completed", "cancelled"]);
export const paymentMethod = oblako.enum("payment_method", ["card_online", "card_on_delivery", "sbp", "cash"]);
export const deliveryMethod = oblako.enum("delivery_method", ["pickup", "courier", "post", "cdek"]);
export const bannerTextColor = oblako.enum("banner_text_color", ["light", "dark"]);

/* ============ better-auth core (text IDs) ============ */
export const user = oblako.table("user", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  name: text("name").notNull().default(""),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = oblako.table("session", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const account = oblako.table("account", {
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

export const verification = oblako.table("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ============ catalog ============ */
export const categories = oblako.table("categories", {
  id: text("id").primaryKey(),
  nameRu: text("name_ru").notNull(),
  nameEn: text("name_en").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const products = oblako.table("products", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  nameRu: text("name_ru").notNull(),
  nameEn: text("name_en").notNull(),
  taglineRu: text("tagline_ru").notNull().default(""),
  taglineEn: text("tagline_en").notNull().default(""),
  descriptionRu: text("description_ru").notNull().default(""),
  descriptionEn: text("description_en").notNull().default(""),
  price: integer("price").notNull(),
  images: text("images").array().notNull().default(sql`'{}'::text[]`),
  stock: integer("stock").notNull().default(0),
  categoryId: text("category_id").notNull().references(() => categories.id, { onDelete: "restrict" }),
  videoUrl: text("video_url"),
  howToUse: text("how_to_use"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byCategory: index("idx_products_category").on(t.categoryId),
  bySlug: index("idx_products_slug").on(t.slug),
  pricePositive: check("products_price_check", sql`${t.price} >= 0`),
}));

export const bundles = oblako.table("bundles", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  cover: text("cover").notNull().default(""),
  discountPercent: integer("discount_percent").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  discountRange: check("bundles_discount_check", sql`${t.discountPercent} BETWEEN 0 AND 100`),
}));

export const bundleItems = oblako.table("bundle_items", {
  bundleId: text("bundle_id").notNull().references(() => bundles.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  position: integer("position").notNull().default(0),
}, (t) => ({
  pk: primaryKey({ columns: [t.bundleId, t.productId] }),
  byBundle: index("idx_bundle_items_bundle").on(t.bundleId),
}));

export const posts = oblako.table("posts", {
  slug: text("slug").primaryKey(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull().default(""),
  cover: text("cover").notNull().default(""),
  category: text("category").notNull().default(""),
  body: text("body").array().notNull().default(sql`'{}'::text[]`),
  images: text("images").array().notNull().default(sql`'{}'::text[]`),
  videoUrl: text("video_url"),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byPublished: index("idx_posts_published").on(t.publishedAt),
}));

export const banners = oblako.table("banners", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull().default(""),
  image: text("image").notNull().default(""),
  ctaLabel: text("cta_label").notNull().default(""),
  ctaHref: text("cta_href").notNull().default("/"),
  textColor: bannerTextColor("text_color").notNull().default("light"),
  enabled: boolean("enabled").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  bySort: index("idx_banners_sort").on(t.enabled, t.sortOrder),
}));

export const reviews = oblako.table("reviews", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  authorName: text("author_name").notNull(),
  rating: integer("rating").notNull(),
  text: text("text").notNull().default(""),
  photos: text("photos").array().notNull().default(sql`'{}'::text[]`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byProduct: index("idx_reviews_product").on(t.productId),
  ratingRange: check("reviews_rating_check", sql`${t.rating} BETWEEN 1 AND 5`),
}));

/* ============ users / roles ============ */
export const profiles = oblako.table("profiles", {
  id: text("id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  name: text("name").notNull().default(""),
  phone: text("phone"),
  bonusBalance: integer("bonus_balance").notNull().default(0),
  totalSpent: integer("total_spent").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userRoles = oblako.table("user_roles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  role: appRole("role").notNull(),
}, (t) => ({
  uniq: unique("user_roles_user_id_role_key").on(t.userId, t.role),
  byUser: index("idx_user_roles_user").on(t.userId),
}));

/* ============ commerce ============ */
export const addresses = oblako.table("addresses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  city: text("city").notNull(),
  addressLine: text("address_line").notNull(),
  postalCode: text("postal_code").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byUser: index("idx_addresses_user").on(t.userId),
}));

export const promos = oblako.table("promos", {
  code: text("code").primaryKey(),
  percent: integer("percent"),
  amount: integer("amount"),
  description: text("description").notNull().default(""),
  usesLeft: integer("uses_left"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orders = oblako.table("orders", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  userEmail: text("user_email").notNull(),
  status: orderStatus("status").notNull().default("new"),
  totalPrice: integer("total_price").notNull(),
  items: jsonb("items").notNull().default(sql`'[]'::jsonb`),
  city: text("city").notNull(),
  addressLine: text("address_line").notNull(),
  postalCode: text("postal_code").notNull(),
  paymentMethod: paymentMethod("payment_method").notNull(),
  deliveryMethod: deliveryMethod("delivery_method").notNull(),
  deliveryPrice: integer("delivery_price").notNull().default(0),
  bonusUsed: integer("bonus_used").notNull().default(0),
  bonusEarned: integer("bonus_earned").notNull().default(0),
  promoUsed: text("promo_used"),
  promoDiscount: integer("promo_discount").notNull().default(0),
  trackingNumber: text("tracking_number"),
  estimatedDelivery: timestamp("estimated_delivery", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byUser: index("idx_orders_user").on(t.userId, t.createdAt),
  byStatus: index("idx_orders_status").on(t.status),
}));

export const consents = oblako.table("consents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  email: text("email"),
  kind: text("kind").notNull(),
  policyVersion: text("policy_version").notNull().default("v1"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byUser: index("idx_consents_user").on(t.userId),
}));

export const subscribers = oblako.table("subscribers", {
  email: text("email").primaryKey(),
  consent: boolean("consent").notNull().default(false),
  promoCode: text("promo_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const giftCards = oblako.table("gift_cards", {
  code: text("code").primaryKey(),
  amount: integer("amount").notNull(),
  design: text("design").notNull().default("minimal"),
  recipientEmail: text("recipient_email").notNull(),
  message: text("message"),
  buyerUserId: text("buyer_user_id").references(() => user.id, { onDelete: "set null" }),
  remaining: integer("remaining").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  amountPositive: check("gift_cards_amount_check", sql`${t.amount} > 0`),
}));
