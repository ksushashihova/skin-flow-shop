import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { api, type Product, type Banner, type Post } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { ProductCard } from "@/components/product-card";

const PhilosophySection = lazy(() => import("@/components/home/philosophy-section"));
const CatalogTail = lazy(() => import("@/components/home/catalog-tail"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ОБЛАКО — минималистичный уход за кожей" },
      { name: "description", content: "Чистые формулы и премиальные текстуры. Российский бренд ухода за кожей." },
    ],
  }),
  component: Index,
});

/** Render children only when the placeholder enters the viewport (with rootMargin). */
function LazyVisible({ children, rootMargin = "300px" }: { children: React.ReactNode; rootMargin?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible, rootMargin]);
  return <div ref={ref}>{visible ? children : <div className="min-h-[400px]" />}</div>;
}

function Index() {
  const { t } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  useEffect(() => {
    api.listProducts().then(setProducts);
    api.listBanners().then((bs) => setBanners(bs.filter((b) => b.enabled)));
    api.listPosts().then(setPosts);
  }, []);

  return (
    <div className="w-full overflow-x-hidden">
      {/* HERO — на десктопе картинка заезжает под nav-строку, лого остаётся сверху */}
      <section className="relative">
        <div className="px-0 md:px-6 pt-0">
          <div className="relative w-full h-[80vh] min-h-[560px] md:h-[82vh] md:min-h-[660px] overflow-hidden bg-muted md:rounded-3xl">
  {/* Картинка для мобилки */}
  <img
    src="/images/hero-mobile.webp"
    alt=""
    className="absolute inset-0 w-full h-full object-cover md:hidden"
    fetchPriority="high"
    decoding="async"
  />
  {/* Картинка для десктопа */}
  <img
    src="/images/hero-desktop.webp"
    alt=""
    className="absolute inset-0 w-full h-full object-cover object-[right_top] hidden md:block"
    fetchPriority="high"
    decoding="async"
  />
            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/55 to-transparent pointer-events-none md:rounded-t-3xl" />
            <div className="absolute inset-x-0 bottom-0 h-[70%] bg-gradient-to-t from-black/70 via-black/35 to-transparent pointer-events-none md:rounded-b-3xl" />

            <div className="absolute left-6 right-6 md:left-12 md:right-12 lg:right-auto bottom-12 md:bottom-20 md:max-w-3xl fade-up">
              <div className="text-xs md:text-sm uppercase tracking-[0.35em] mb-5 text-[color:var(--rose-deep)] [text-shadow:0_1px_8px_rgba(245,236,223,0.9)]">
                ОБЛАКО
              </div>
              <h1 className="font-display text-[color:var(--broun)] text-5xl md:text-7xl lg:text-8xl leading-[1.02] [text-shadow:0_2px_18px_rgba(245,236,223,0.85)]">
                {t("hero.title")}
              </h1>
              <p className="mt-6 text-base md:text-xl max-w-md md:max-w-xl text-[color:var(--rose-deep)] [text-shadow:0_1px_10px_rgba(245,236,223,0.85)]">
                {t("hero.subtitle")}
              </p>
              <Link
                to="/shop"
                className="inline-block mt-10 bg-[color:var(--rose-mid)] text-background border border-[color:var(--rose-mid)] px-10 py-4 text-xs md:text-sm uppercase tracking-[0.25em] rounded-full hover:bg-[color:var(--rose-deep)] hover:border-[color:var(--rose-deep)] transition-colors shadow-lg"
              >
                {t("hero.cta")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <section className="py-8 border-y border-border overflow-hidden">
        <div className="marquee text-sm uppercase tracking-[0.3em] text-muted-foreground">
          {Array.from({ length: 2 }).map((_, k) => (
            <div key={k} className="flex gap-12 shrink-0">
              <span>Чистые формулы</span><span>·</span>
              <span>Российское производство</span><span>·</span>
              <span>Без жестокости</span><span>·</span>
              <span>Дерматологический контроль</span><span>·</span>
              <span>Доставка по России</span><span>·</span>
            </div>
          ))}
        </div>
      </section>

      {/* BESTSELLERS */}
      <section className="container-rhode py-24">
        <div className="flex items-end justify-between mb-12 gap-4">
          <h2 className="font-display text-3xl md:text-5xl">{t("section.bestsellers")}</h2>
          <Link to="/shop" className="text-sm hover-underline shrink-0">{t("nav.shop")}</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
          {products.slice(0, 4).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* PROMO BANNERS */}
      {banners.length > 0 && (
        <section className="container-rhode pb-8 md:pb-16">
          <div className="grid md:grid-cols-2 gap-6">
            {banners.slice(0, 2).map((b) => (
              <a
                key={b.id}
                href={b.ctaHref}
                className="group relative block overflow-hidden rounded-2xl aspect-[16/10] bg-muted"
              >
                <img
                  src={b.image}
                  alt={b.title}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div
                  className={`absolute inset-0 ${
                    b.textColor === "light"
                      ? "bg-gradient-to-t from-foreground/65 via-foreground/20 to-transparent"
                      : "bg-gradient-to-t from-background/70 via-background/20 to-transparent"
                  }`}
                />
                <div
                  className={`absolute inset-0 p-6 md:p-10 flex flex-col justify-end ${
                    b.textColor === "light" ? "text-background" : "text-foreground"
                  }`}
                >
                  <div className="font-display text-2xl md:text-3xl leading-tight">{b.title}</div>
                  {b.subtitle && (
                    <p className="mt-2 text-sm opacity-90 max-w-md">{b.subtitle}</p>
                  )}
                  <span className="inline-flex items-center mt-4 text-[11px] uppercase tracking-[0.25em]">
                    {b.ctaLabel}
                    <span className="ml-2 transition-transform group-hover:translate-x-1">→</span>
                  </span>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* PHILOSOPHY (lazy, ниже фолда) */}
      <LazyVisible>
        <Suspense fallback={<div className="min-h-[400px]" />}>
          <PhilosophySection />
        </Suspense>
      </LazyVisible>

      {/* QUIZ CTA */}
      <section className="container-rhode py-24">
        <div className="relative overflow-hidden rounded-3xl bg-[color:var(--rose-mid)] text-background px-8 py-16 md:px-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="uppercase text-[11px] tracking-[0.3em] opacity-90 mb-4">
              {t("nav.quiz")}
            </div>
            <h2 className="font-display text-3xl md:text-5xl leading-tight">
              Подберём уход под вашу кожу
            </h2>
            <p className="mt-5 max-w-md opacity-95">
              Короткий опрос — и мы предложим подходящие средства из коллекции ОБЛАКО.
            </p>
            <Link
              to="/quiz"
              className="inline-block mt-8 border border-background/90 text-background px-8 py-3 text-[11px] uppercase tracking-[0.25em] rounded-full hover:bg-background hover:text-[color:var(--rose-deep)] transition-colors"
            >
              Пройти подбор
            </Link>
          </div>
          <div className="hidden md:block">
            <div className="aspect-[4/5] w-full rounded-2xl bg-[color:var(--rose-deep)]/30 backdrop-blur-sm" />
          </div>
        </div>
      </section>

      {/* JOURNAL */}
      {posts.length > 0 && (
        <section className="container-rhode py-24 border-t border-border">
          <div className="flex items-end justify-between mb-12 gap-4">
            <h2 className="font-display text-3xl md:text-5xl">{t("nav.journal")}</h2>
            <Link to="/journal" className="text-sm hover-underline shrink-0">{t("nav.journal")} →</Link>
          </div>
          <div className="grid md:grid-cols-3 gap-x-6 gap-y-12">
            {posts.slice(0, 3).map((p) => (
              <Link
                key={p.slug}
                to="/journal/$slug"
                params={{ slug: p.slug }}
                className="group block"
              >
                <div className="aspect-[4/5] overflow-hidden bg-muted">
                  <img
                    src={p.cover}
                    alt={p.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground mt-4">{p.category}</div>
                <h3 className="font-display text-2xl mt-2">{p.title}</h3>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{p.excerpt}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* FULL CATALOG GRID (lazy, ниже фолда) */}
      <LazyVisible>
        <Suspense fallback={<div className="min-h-[400px]" />}>
          <CatalogTail products={products.slice(4)} />
        </Suspense>
      </LazyVisible>
    </div>
  );
}
