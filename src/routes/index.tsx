import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api, type Product } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { ProductCard } from "@/components/product-card";
import { HomeHeader } from "@/components/site-chrome";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ОБЛАКО — минималистичный уход за кожей" },
      { name: "description", content: "Чистые формулы и премиальные текстуры. Российский бренд ухода за кожей." },
    ],
  }),
  component: Index,
});

function Index() {
  const { t } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  useEffect(() => { api.listProducts().then(setProducts); }, []);

  return (
    <div>
      {/* Узкая верхняя полоса с центрированным логотипом */}
      <HomeHeader />

      {/* HERO — картинка с отступами по краям, нав поверх неё */}
      <section className="px-3 md:px-4 pt-3 md:pt-4">
        <div className="relative w-full h-[78vh] min-h-[560px] md:h-[86vh] md:min-h-[680px] overflow-hidden rounded-sm bg-muted">
          <img
            src="https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=2200&q=80"
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* лёгкое затемнение сверху, чтобы навигация читалась */}
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-foreground/35 to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-foreground/30 to-transparent pointer-events-none" />

          <div className="absolute left-6 md:left-12 bottom-10 md:bottom-14 max-w-xl text-background fade-up">
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
        <div className="flex items-end justify-between mb-12">
          <h2 className="font-display text-4xl md:text-5xl">{t("section.bestsellers")}</h2>
          <Link to="/shop" className="text-sm hover-underline">{t("nav.shop")}</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
          {products.slice(0, 4).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* PHILOSOPHY */}
      <section className="bg-secondary">
        <div className="container-rhode py-24 grid md:grid-cols-2 gap-16 items-center">
          <img
            src="https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=1400&q=80"
            alt=""
            className="aspect-[4/5] w-full object-cover"
          />
          <div>
            <div className="uppercase text-xs tracking-[0.3em] text-muted-foreground mb-6">
              {t("section.philosophy")}
            </div>
            <h2 className="font-display text-4xl md:text-5xl leading-tight mb-8">
              Тихий ритуал каждое утро и вечер.
            </h2>
            <p className="text-muted-foreground leading-relaxed max-w-md">
              {t("section.philosophy.text")}
            </p>
          </div>
        </div>
      </section>

      {/* FULL CATALOG GRID */}
      <section className="container-rhode py-24">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
          {products.slice(4).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
