import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api, type Bundle, type Product } from "@/lib/api";
import { useI18n, formatPrice } from "@/lib/i18n";

export const Route = createFileRoute("/bundles")({
  head: () => ({
    meta: [
      { title: "Наборы — ОБЛАКО" },
      { name: "description", content: "Готовые ритуалы ухода со скидкой до 15%." },
      { property: "og:title", content: "Наборы ухода — ОБЛАКО" },
      { property: "og:description", content: "Утренний и вечерний ритуалы по выгодной цене." },
    ],
  }),
  component: BundlesPage,
});

function BundlesPage() {
  const { lang } = useI18n();
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    api.listBundles().then(setBundles);
    api.listProducts().then(setProducts);
  }, []);

  return (
    <div className="container-rhode py-16">
      <div className="max-w-2xl mb-14">
        <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-4">Bundles</div>
        <h1 className="font-display text-5xl md:text-6xl mb-4">Наборы</h1>
        <p className="text-muted-foreground">
          Готовые ритуалы ухода: подобранные средства, дополняющие друг друга, со скидкой до 15%.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {bundles.map((b) => {
          const { full, discounted } = api.bundlePrice(b, products);
          return (
            <Link
              key={b.id}
              to="/bundles/$slug"
              params={{ slug: b.slug }}
              className="group block border border-border hover:border-foreground transition-colors"
            >
              <div className="aspect-[4/3] overflow-hidden bg-muted">
                <img src={b.cover} alt={b.name} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700" />
              </div>
              <div className="p-6">
                <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-2">
                  Скидка {b.discountPercent}%
                </div>
                <h2 className="font-display text-2xl mb-2">{b.name}</h2>
                <p className="text-sm text-muted-foreground mb-4">{b.description}</p>
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-2xl tabular-nums">{formatPrice(discounted, lang)}</span>
                  <span className="text-sm text-muted-foreground line-through tabular-nums">{formatPrice(full, lang)}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
