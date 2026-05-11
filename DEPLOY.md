# Деплой на Timeweb Cloud (VDS + managed PostgreSQL)

## 1. Подготовка

В Timeweb Cloud создай:
- **Managed PostgreSQL** (минимум 14+) → получи `DATABASE_URL`
- **VDS** (Ubuntu 22.04, минимум 2 GB RAM) с Node 20+ и Nginx
- **S3 Bucket** в Timeweb S3 → ключи доступа
- **SMTP-доступ** (Yandex/Mail.ru/Timeweb)

## 2. Переменные окружения

Создай `.env` на VDS:

```
NODE_ENV=production
DATABASE_URL=postgres://user:pass@<host>:5432/<db>?sslmode=require
BETTER_AUTH_SECRET=<openssl rand -hex 32>
BETTER_AUTH_URL=https://example.ru

S3_ENDPOINT=https://s3.timeweb.cloud
S3_REGION=ru-1
S3_BUCKET=oblako
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_PUBLIC_URL=https://<bucket>.s3.timeweb.cloud

SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@example.ru
SMTP_PASS=...
SMTP_FROM="ОБЛАКО <noreply@example.ru>"
```

## 3. Установка

```bash
git clone <repo> /var/www/oblako
cd /var/www/oblako
bun install
bunx drizzle-kit push          # создать таблицы в БД
psql $DATABASE_URL -f supabase/seeds.sql   # засеять данные
bun run build
```

## 4. Запуск через PM2

```bash
npm i -g pm2
pm2 start "bun run start" --name oblako
pm2 save && pm2 startup
```

## 5. Nginx + SSL

```nginx
server {
  listen 80;
  server_name example.ru;
  location / { proxy_pass http://127.0.0.1:3000; proxy_set_header Host $host; }
}
```

```bash
certbot --nginx -d example.ru
```

## 6. Создание первого админа

После регистрации обычным способом через сайт:

```sql
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin' FROM "user" WHERE email = 'you@example.ru';
```
