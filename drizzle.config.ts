import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgres://user:pass@localhost:5432/db",
  },
  // Управляем только своей схемой, не трогаем `public` (там чужие таблицы).
  schemaFilter: ["oblako"],
  strict: true,
  verbose: true,
} satisfies Config;
