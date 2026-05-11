
## План миграции с Supabase на собственный стек

### Стек после миграции
- **БД:** PostgreSQL (managed Timeweb) через **Drizzle ORM** + `postgres.js` драйвер
- **Auth:** **better-auth** с email/password, сессии в БД, httpOnly cookies
- **Файлы:** **S3 Timeweb Cloud** (S3-совместимое API через `@aws-sdk/client-s3`)
- **Email:** **SMTP** через `nodemailer` (Timeweb / Yandex / Mail.ru)
- **Хостинг:** Node-сервер на VDS Timeweb (адаптер Vite — `node`)

### Этапы

**1. Подготовка зависимостей и схемы**
- Установить: `drizzle-orm`, `drizzle-kit`, `postgres`, `better-auth`, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `nodemailer`, `bcryptjs`
- Удалить: `@supabase/supabase-js`, `@supabase/ssr` (после переписывания всех импортов)
- Создать `src/db/schema.ts` — Drizzle-схема всех таблиц (categories, products, banners, posts, promos, orders, gift_cards, bundles, profiles, user_roles, и таблицы better-auth: user/session/account/verification)
- Создать `src/db/index.ts` — singleton подключение к Postgres
- Создать `drizzle.config.ts` — конфиг для генерации миграций
- Сгенерировать первую миграцию `drizzle-kit generate`

**2. Auth-слой (better-auth)**
- `src/lib/auth.server.ts` — конфиг better-auth с adapter Drizzle, email/password
- `src/lib/auth-client.ts` — клиентский API (`signIn.email`, `signUp.email`, `signOut`, `useSession`)
- `src/routes/api/auth/$.ts` — server route, проксирующий все запросы better-auth
- Заменить middleware `requireSupabaseAuth` → `requireAuth` (читает session-cookie)
- Заменить admin-проверку: вместо RLS — серверная проверка роли в БД

**3. Переписывание data-слоя**
- `src/integrations/supabase/*` → удалить полностью
- `src/lib/server.helpers.server.ts` — все `supabaseAdmin.from(...)` переписать на drizzle queries
- `src/lib/server.functions.ts` — то же
- `src/lib/api.ts` (клиент) — убедиться, что не остаётся прямых вызовов supabase

**4. Компоненты с auth**
- `src/routes/account.tsx`, `src/routes/admin.tsx`, страницы логина/регистрации — на `auth-client`
- Удалить `localStorage`-хранение Supabase-сессии (better-auth сам управляет cookies)

**5. S3 интеграция**
- `src/lib/s3.server.ts` — клиент S3 + функции `getUploadUrl`, `getDownloadUrl`
- В админке: смена картинок продуктов через signed upload URLs
- Старые Unsplash-картинки оставить как внешние URL (миграция не нужна)

**6. Email через SMTP**
- `src/lib/mailer.server.ts` — nodemailer transport (env: `SMTP_HOST/PORT/USER/PASS/FROM`)
- Шаблоны: подтверждение email, сброс пароля, уведомление о заказе
- Подключить к better-auth через `emailVerification.sendVerificationEmail` и `sendResetPassword`

**7. Адаптер сборки и деплой**
- `vite.config.ts` — переключить на Node target (убрать Cloudflare-плагин)
- Удалить `wrangler.jsonc`
- Создать `Dockerfile` + `docker-compose.yml` для деплоя на Timeweb (опционально)
- Создать `ecosystem.config.cjs` для PM2 + пример конфига Nginx
- Обновить `package.json`: `"start": "node .output/server/index.mjs"`

**8. Env-переменные (новый `.env.example`)**
```
DATABASE_URL=postgres://user:pass@host:5432/dbname
BETTER_AUTH_SECRET=... (32+ символа)
BETTER_AUTH_URL=https://example.ru
S3_ENDPOINT=https://s3.timeweb.cloud
S3_REGION=ru-1
S3_BUCKET=oblako
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM="ОБЛАКО <noreply@example.ru>"
```

**9. Документация**
- `DEPLOY.md` — пошагово: создать БД на Timeweb, прогнать миграции, настроить S3-bucket, поднять Nginx + SSL, запустить через PM2

### Что сломается в Lovable
- Preview не запустится после удаления Supabase-клиента
- Lovable Cloud (auto-types) больше не нужен
- Тесты делаешь локально: `bun install && bun run dev` с подключением к Timeweb-БД (или локальному Postgres в Docker)

### Технические детали
- **Schema parity:** Drizzle-схема 1-в-1 повторяет текущую SQL-структуру из `supabase/migrations/*.sql`, кроме RLS — права контролируются в server functions через `requireAuth` + проверки `userId`/`role`
- **Сессии:** better-auth хранит сессии в таблице `session`, cookie `better-auth.session_token` httpOnly + secure + sameSite=lax
- **Транзакции:** для checkout (списание stock + создание order + начисление бонусов) использовать `db.transaction()`
- **Picture URLs:** в БД храним полный URL (S3 public URL или Unsplash) — никакой логики bucket/key в БД, как сейчас

### Объём
~25 файлов изменено/создано, ~3 000 строк кода. Реалистичная оценка — 4-6 итераций по 1-2 этапа за раз.

### Следующий шаг
Начну с этапа 1-2 (зависимости + схема + auth-слой). Подтверди, что готов к временной поломке preview.
