// Конфиг под деплой на Node (Timeweb VDS), а не Cloudflare Workers.
// Лавэйбл-пресет включает в себя tanstackStart/react/tailwind/tsConfigPaths.
// Отключаем cloudflare-плагин и указываем tanstack target = "node-server".
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  cloudflare: false,
  tanstackStart: {
    target: "node-server",
  },
});
