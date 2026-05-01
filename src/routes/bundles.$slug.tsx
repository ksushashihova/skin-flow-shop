import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api, type Bundle, type Product } from "@/lib/api";
import { useI18n, formatPrice } from "@/lib/i18n";

export const Route = createFileRoute("/bundles/$slug")({
  loader: async ({ params }) => {
    const bundle = await api.getBundle(params.slug);
    if (!bundle) throw notFound();
    return { bundle };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.bundle.name ?? "Набор"} — ОБЛАКО` },
      { name: "description", content: loaderData?.bundle.description ?? "" },
      { property: "og:image", content: loaderData?.bundle.cover ?? "" },
    ],
  }),
  component: BundlePage,
  notFoundComponent: () => (
    <div className="container-rhode py-32 text-center text-muted-foreground">Набор не найден</div>
  ),
});

function BundlePage() {
  const { bundle } = Route.useLoaderData() as { bundle: Bundle };
  const { lang } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [added, setAdded] = useState(false);

  useEffect(() => { api.listProducts().then(setProducts); }, []);

  const items = bundle.productIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => !!p);
  const { full, discounted } = api.bundlePrice(bundle, products);

  return (
    <div className="container-rhode py-12">
      <Link to="/bundles" className="text-xs uppercase tracking-widest hover-underline">← Все наборы</Link>
      <div className="grid md:grid-cols-2 gap-12 mt-8">
        <img src={bundle.cover} alt={bundle.name} className="w-full aspect-[4/5] object-cover" />
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-3">Скидка {bundle.discountPercent}%</div>
          <h1 className="font-display text-4xl md:text-5xl">{bundle.name}</h1>
          <p className="text-muted-foreground mt-3">{bundle.description}</p>

          <div className="flex items-baseline gap-4 mt-8">
            <span className="font-display text-3xl tabular-nums">{formatPrice(discounted, lang)}</span>
            <span className="text-muted-foreground line-through tabular-nums">{formatPrice(full, lang)}</span>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">экономия {formatPrice(full - discounted, lang)}</span>
          </div>

          <div className="mt-10">
            <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-3">В наборе</div>
            <ul className="divide-y divide-border border-y border-border">
              {items.map((p) => (
                <li key={p.id} className="flex items-center gap-4 py-4">
                  <img src={p.images[0]} alt="" className="w-16 h-20 object-cover" />
                  <div className="flex-1">
                    <Link to="/product/$slug" params={{ slug: p.slug }} className="font-display text-lg hover-underline">
                      {lang === "ru" ? p.name_ru : p.name_en}
                    </Link>
                    <div className="text-xs text-muted-foreground mt-1">{lang === "ru" ? p.tagline_ru : p.tagline_en}</div>
                  </div>
                  <div className="text-sm tabular-nums text-muted-foreground">{formatPrice(p.price, lang)}</div>
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={async () => {
              await api.addBundleToCart(bundle.id, 1);
              setAdded(true);
              setTimeout(() => setAdded(false), 1500);
            }}
            className="mt-8 w-full bg-foreground text-background py-4 text-xs uppercase tracking-[0.2em] hover:opacity-80 transition-opacity"
          >
            {added ? "Добавлено" : "В корзину"}
          </button>
        </div>
      </div>
    </div>
  );
}
