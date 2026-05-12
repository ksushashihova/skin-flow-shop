// Конфиг под деплой на Node (Timeweb VDS), а не Cloudflare Workers.
// Лавэйбл-пресет включает в себя tanstackStart/react/tailwind/tsConfigPaths.
// Отключаем cloudflare-плагин и указываем tanstack target = "node-server".
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  cloudflare: false,
  vite: {
    resolve: {
      alias: [
        // Better Auth 1.6.x uses Zod v4-only .meta(); keep the server bundle
        // from accidentally resolving bare "zod" to a nested v3/mini entrypoint.
        { find: /^zod$/, replacement: "/src/lib/zod-v4.ts" },
      ],
      dedupe: ["zod"],
    },
  },
  tanstackStart: {
    target: "node-server",
  },
});
