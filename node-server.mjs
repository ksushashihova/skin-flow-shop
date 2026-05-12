// Standalone Node HTTP-сервер для TanStack Start.
// TanStack Start 1.x сам по себе билдит только SSR-модуль (dist/server/server.js),
// без своего listener'а — этот скрипт оборачивает его в реальный HTTP-сервер.
//
// Запуск: NODE_ENV=production node node-server.mjs
import { serve } from "srvx/node";

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

const mod = await import("./dist/server/server.js");
const entry = mod.default ?? mod;
const fetchHandler = entry?.fetch ?? entry;

if (typeof fetchHandler !== "function") {
  console.error("[node-server] dist/server/server.js не экспортирует fetch-обработчик. Сделай `bun run build` ещё раз.");
  process.exit(1);
}

serve({
  fetch: (request) => fetchHandler(request),
  port: PORT,
  hostname: HOST,
});

console.log(`[node-server] ОБЛАКО запущен на http://${HOST}:${PORT}`);
