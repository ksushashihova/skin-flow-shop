// Standalone Node HTTP-сервер для TanStack Start.
// TanStack Start 1.x сам по себе билдит только SSR-модуль (dist/server/server.js),
// без своего listener'а — этот скрипт оборачивает его в реальный HTTP-сервер.
//
// Запуск: NODE_ENV=production node node-server.mjs
import { serve } from "srvx/node";
import { serveStatic } from "srvx/static";

try {
  if (typeof process.loadEnvFile === "function") {
    process.loadEnvFile();
  }
} catch (error) {
  if (error?.code !== "ENOENT") {
    console.warn("[node-server] Не удалось загрузить .env:", error?.message ?? error);
  }
}

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

if (!process.env.DATABASE_URL && process.env.SUPABASE_DB_URL) {
  process.env.DATABASE_URL = process.env.SUPABASE_DB_URL;
}

if (!process.env.BETTER_AUTH_URL) {
  process.env.BETTER_AUTH_URL = `http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`;
}

const STATIC_PATH_RE = /\.(?:avif|css|gif|ico|jpe?g|js|json|map|mjs|mp4|png|svg|txt|webmanifest|webp|woff2?)$/i;
const staticOnly = (middleware) => (request, next) => {
  const pathname = new URL(request.url).pathname;
  if (!pathname.startsWith("/assets/") && !pathname.startsWith("/images/") && !STATIC_PATH_RE.test(pathname)) {
    return next();
  }

  return middleware(request, next);
};

const mod = await import("./dist/server/server.js");
const entry = mod.default ?? mod;
const fetchHandler = entry?.fetch ?? entry;

if (typeof fetchHandler !== "function") {
  console.error("[node-server] dist/server/server.js не экспортирует fetch-обработчик. Сделай `bun run build` ещё раз.");
  process.exit(1);
}

serve({
  fetch: (request) => fetchHandler(request),
  middleware: [
    staticOnly(serveStatic({ dir: "dist/client" })),
    staticOnly(serveStatic({ dir: "public" })),
  ],
  port: PORT,
  hostname: HOST,
});

console.log(`[node-server] ОБЛАКО запущен на http://${HOST}:${PORT}`);
