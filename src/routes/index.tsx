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
            <img
              src="https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&fm=webp&w=1600&q=70"
              srcSet={[
                "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&fm=webp&w=640&q=65 640w",
                "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&fm=webp&w=960&q=65 960w",
                "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&fm=webp&w=1280&q=70 1280w",
                "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&fm=webp&w=1600&q=70 1600w",
                "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&fm=webp&w=2000&q=72 2000w",
              ].join(", ")}
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 100vw, 1600px"
              alt=""
              fetchPriority="high"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-foreground/45 to-transparent pointer-events-none md:rounded-t-3xl" />
            <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-foreground/40 to-transparent pointer-events-none md:rounded-b-3xl" />

            <div className="absolute left-6 right-6 md:left-12 md:right-auto bottom-12 md:bottom-16 md:max-w-xl text-background fade-up">
              <div className="text-[11px] uppercase tracking-[0.3em] mb-4 opacity-90">
                Новая коллекция
              </div>
              <h1 className="font-display text-4xl md:text-6xl leading-[1.05]">
                {t("hero.title")}
              </h1>
              <p className="mt-5 text-sm md:text-base opacity-90 max-w-md">
                {t("hero.subtitle")}
              </p>
              <Link
                to="/shop"
                className="inline-block mt-8 border border-background/80 text-background px-8 py-3 text-[11px] uppercase tracking-[0.25em] rounded-full hover:bg-background hover:text-foreground transition-colors"
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

      {/* FULL CATALOG GRID (lazy, ниже фолда) */}
      <LazyVisible>
        <Suspense fallback={<div className="min-h-[400px]" />}>
          <CatalogTail products={products.slice(4)} />
        </Suspense>
      </LazyVisible>
    </div>
  );
}
