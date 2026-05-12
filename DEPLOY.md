# Деплой на Timeweb Cloud

Стек: TanStack Start (Node SSR) + Drizzle ORM + better-auth + S3 Timeweb + SMTP.

## 1. Что создать в Timeweb

- **Managed PostgreSQL 14+** → получи `DATABASE_URL` (`?sslmode=require`)
- **VDS Ubuntu 22.04**, ≥ 2 GB RAM, Node 20+ (или Docker)
- **S3 bucket** (Timeweb Cloud Storage) → ACCESS / SECRET ключи
- **SMTP-доступ** (Yandex / Mail.ru / Timeweb)
- Домен с A-записью на IP VDS

## 2. Переменные окружения

Скопируй `.env.example` → `.env` и заполни:

```
NODE_ENV=production
DATABASE_URL=postgres://user:pass@HOST:5432/db?sslmode=require
BETTER_AUTH_SECRET=$(openssl rand -hex 32)
BETTER_AUTH_URL=https://example.ru

S3_ENDPOINT=https://s3.timeweb.cloud
S3_REGION=ru-1
S3_BUCKET=oblako
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_PUBLIC_URL=https://oblako.s3.timeweb.cloud

SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@example.ru
SMTP_PASS=...
SMTP_FROM="ОБЛАКО <noreply@example.ru>"
```

## 3a. Деплой через PM2 (обычный VDS)

```bash
# на VDS
curl -fsSL https://bun.sh/install | bash
git clone <repo> /var/www/oblako
cd /var/www/oblako
bun install
bunx drizzle-kit push                              # схема в БД (только oblako)
psql "$DATABASE_URL" -f supabase/seeds.sql         # данные (при наличии)
bun run build                                      # собирает dist/client + dist/server

npm i -g pm2
pm2 start ecosystem.config.cjs                     # запускает node node-server.mjs
pm2 save && pm2 startup
```

> Сборка кладёт SSR-бандл в `dist/server/server.js`, а корневой `node-server.mjs`
> поднимает поверх него Node HTTP listener (TanStack Start 1.x не выдаёт
> standalone-сервер сам по себе — `.output/server/index.mjs` это устаревший
> vinxi-формат и его больше не существует).

## 3b. Деплой через Docker

```bash
docker compose up -d --build
docker compose exec app bunx drizzle-kit push
```

## 4. Nginx + SSL

```nginx
server {
  listen 80;
  server_name example.ru;
  client_max_body_size 25m;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

```bash
sudo certbot --nginx -d example.ru
```

## 5. Создание первого админа

После регистрации в форме на сайте (все таблицы проекта живут в схеме `oblako`):

```sql
INSERT INTO oblako.user_roles (user_id, role)
SELECT id, 'admin' FROM oblako."user" WHERE email = 'you@example.ru';
```

## 6. Обновление кода

```bash
cd /var/www/oblako
git pull
bun install
bun run build
pm2 restart oblako
```
