
-- =========================================================================
-- ОБЛАКО — full schema migration
-- Designed to be portable: same SQL runs on self-hosted Postgres.
-- =========================================================================

-- ---------- helpers ----------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ---------- enums ----------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM ('new','paid','shipped','completed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_method AS ENUM ('card_online','card_on_delivery','sbp','cash');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.delivery_method AS ENUM ('pickup','courier','post','cdek');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.banner_text_color AS ENUM ('light','dark');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================================
-- CATALOG
-- =========================================================================
CREATE TABLE public.categories (
  id          text PRIMARY KEY,
  name_ru     text NOT NULL,
  name_en     text NOT NULL,
  sort_order  int  NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.products (
  id              text PRIMARY KEY,
  slug            text NOT NULL UNIQUE,
  name_ru         text NOT NULL,
  name_en         text NOT NULL,
  tagline_ru      text NOT NULL DEFAULT '',
  tagline_en      text NOT NULL DEFAULT '',
  description_ru  text NOT NULL DEFAULT '',
  description_en  text NOT NULL DEFAULT '',
  price           int  NOT NULL CHECK (price >= 0),
  images          text[] NOT NULL DEFAULT '{}',
  stock           int  NOT NULL DEFAULT 0,
  category_id     text NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  video_url       text,
  how_to_use      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_slug ON public.products(slug);

CREATE TABLE public.bundles (
  id               text PRIMARY KEY,
  slug             text NOT NULL UNIQUE,
  name             text NOT NULL,
  description      text NOT NULL DEFAULT '',
  cover            text NOT NULL DEFAULT '',
  discount_percent int  NOT NULL DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 100),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.bundle_items (
  bundle_id   text NOT NULL REFERENCES public.bundles(id) ON DELETE CASCADE,
  product_id  text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  position    int  NOT NULL DEFAULT 0,
  PRIMARY KEY (bundle_id, product_id)
);
CREATE INDEX idx_bundle_items_bundle ON public.bundle_items(bundle_id);

CREATE TABLE public.posts (
  slug         text PRIMARY KEY,
  title        text NOT NULL,
  excerpt      text NOT NULL DEFAULT '',
  cover        text NOT NULL DEFAULT '',
  category     text NOT NULL DEFAULT '',
  body         text[] NOT NULL DEFAULT '{}',
  images       text[] NOT NULL DEFAULT '{}',
  video_url    text,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_posts_published ON public.posts(published_at DESC);

CREATE TABLE public.banners (
  id          text PRIMARY KEY,
  title       text NOT NULL,
  subtitle    text NOT NULL DEFAULT '',
  image       text NOT NULL DEFAULT '',
  cta_label   text NOT NULL DEFAULT '',
  cta_href    text NOT NULL DEFAULT '/',
  text_color  public.banner_text_color NOT NULL DEFAULT 'light',
  enabled     boolean NOT NULL DEFAULT true,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_banners_sort ON public.banners(enabled, sort_order);

CREATE TABLE public.reviews (
  id          text PRIMARY KEY,
  product_id  text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  rating      int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text        text NOT NULL DEFAULT '',
  photos      text[] NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_reviews_product ON public.reviews(product_id);

-- =========================================================================
-- USERS / ROLES
-- =========================================================================
CREATE TABLE public.profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        text NOT NULL,
  name         text NOT NULL DEFAULT '',
  phone        text,
  bonus_balance int  NOT NULL DEFAULT 0,
  total_spent  int  NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role    public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.raw_user_meta_data->>'phone'
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================================
-- COMMERCE
-- =========================================================================
CREATE TABLE public.addresses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  city         text NOT NULL,
  address_line text NOT NULL,
  postal_code  text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_addresses_user ON public.addresses(user_id);

CREATE TABLE public.promos (
  code         text PRIMARY KEY,
  percent      int CHECK (percent IS NULL OR percent BETWEEN 1 AND 100),
  amount       int CHECK (amount IS NULL OR amount >= 0),
  description  text NOT NULL DEFAULT '',
  uses_left    int,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.orders (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  user_email        text NOT NULL,
  status            public.order_status NOT NULL DEFAULT 'new',
  total_price       int NOT NULL,
  items             jsonb NOT NULL DEFAULT '[]'::jsonb,
  city              text NOT NULL,
  address_line      text NOT NULL,
  postal_code       text NOT NULL,
  payment_method    public.payment_method NOT NULL,
  delivery_method   public.delivery_method NOT NULL,
  delivery_price    int NOT NULL DEFAULT 0,
  bonus_used        int NOT NULL DEFAULT 0,
  bonus_earned      int NOT NULL DEFAULT 0,
  promo_used        text,
  promo_discount    int NOT NULL DEFAULT 0,
  tracking_number   text,
  estimated_delivery timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_user ON public.orders(user_id, created_at DESC);
CREATE INDEX idx_orders_status ON public.orders(status);

CREATE TABLE public.consents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email        text,
  kind         text NOT NULL,         -- 'pdn' | 'cookies' | 'marketing'
  policy_version text NOT NULL DEFAULT 'v1',
  ip_address   inet,
  user_agent   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_consents_user ON public.consents(user_id);

CREATE TABLE public.subscribers (
  email       text PRIMARY KEY,
  consent     boolean NOT NULL DEFAULT false,
  promo_code  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.gift_cards (
  code            text PRIMARY KEY,
  amount          int NOT NULL CHECK (amount > 0),
  design          text NOT NULL DEFAULT 'minimal',
  recipient_email text NOT NULL,
  message         text,
  buyer_user_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  remaining       int NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- =========================================================================
-- TIMESTAMP TRIGGERS
-- =========================================================================
CREATE TRIGGER trg_categories_updated  BEFORE UPDATE ON public.categories  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_products_updated    BEFORE UPDATE ON public.products    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_bundles_updated     BEFORE UPDATE ON public.bundles     FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_posts_updated       BEFORE UPDATE ON public.posts       FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_banners_updated     BEFORE UPDATE ON public.banners     FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_profiles_updated    BEFORE UPDATE ON public.profiles    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_orders_updated      BEFORE UPDATE ON public.orders      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- RLS
-- =========================================================================
ALTER TABLE public.categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_cards    ENABLE ROW LEVEL SECURITY;

-- Public read for catalog/content
CREATE POLICY "public read categories"   ON public.categories   FOR SELECT USING (true);
CREATE POLICY "public read products"     ON public.products     FOR SELECT USING (true);
CREATE POLICY "public read bundles"      ON public.bundles      FOR SELECT USING (true);
CREATE POLICY "public read bundle_items" ON public.bundle_items FOR SELECT USING (true);
CREATE POLICY "public read posts"        ON public.posts        FOR SELECT USING (true);
CREATE POLICY "public read banners"      ON public.banners      FOR SELECT USING (enabled = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "public read reviews"      ON public.reviews      FOR SELECT USING (true);

-- Admin writes for catalog/content
CREATE POLICY "admin write categories"   ON public.categories   FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin write products"     ON public.products     FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin write bundles"      ON public.bundles      FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin write bundle_items" ON public.bundle_items FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin write posts"        ON public.posts        FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin write banners"      ON public.banners      FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Reviews: any authenticated user can post
CREATE POLICY "auth insert reviews" ON public.reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "admin delete reviews" ON public.reviews FOR DELETE USING (public.has_role(auth.uid(),'admin'));

-- Profiles
CREATE POLICY "users read own profile"   ON public.profiles FOR SELECT USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "admin update profiles"    ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(),'admin'));

-- Roles: only admin can read all; users can read their own
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin manage roles"   ON public.user_roles FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Addresses
CREATE POLICY "users own addresses" ON public.addresses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin read addresses" ON public.addresses FOR SELECT USING (public.has_role(auth.uid(),'admin'));

-- Promos: public read only by code-check via server-fn (no public policy → blocked except for admin)
CREATE POLICY "admin manage promos" ON public.promos FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Orders
CREATE POLICY "users read own orders"   ON public.orders FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "users insert own orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin update orders"     ON public.orders FOR UPDATE USING (public.has_role(auth.uid(),'admin'));

-- Consents: user can insert own; admin reads all
CREATE POLICY "anyone insert consent"   ON public.consents FOR INSERT WITH CHECK (true);
CREATE POLICY "admin read consents"     ON public.consents FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "users read own consents" ON public.consents FOR SELECT USING (auth.uid() = user_id);

-- Subscribers: public can subscribe; admin reads
CREATE POLICY "anyone subscribe"      ON public.subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "admin read subscribers" ON public.subscribers FOR SELECT USING (public.has_role(auth.uid(),'admin'));

-- Gift cards: admin only (issuance via server-fn with service role)
CREATE POLICY "admin manage gift_cards" ON public.gift_cards FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
