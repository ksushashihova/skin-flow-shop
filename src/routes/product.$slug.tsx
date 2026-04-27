import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { api } from "@/lib/api";
import { useI18n, formatPrice } from "@/lib/i18n";

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ params }) => {
    const product = await api.getProduct(params.slug);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.product.name_ru ?? "Товар"} — ОБЛАКО` },
      { name: "description", content: loaderData?.product.tagline_ru ?? "" },
      { property: "og:title", content: loaderData?.product.name_ru ?? "" },
      { property: "og:description", content: loaderData?.product.tagline_ru ?? "" },
      { property: "og:image", content: loaderData?.product.images[0] ?? "" },
    ],
  }),
  component: ProductPage,
  notFoundComponent: () => (
    <div className="container-rhode py-32 text-center">
      <p className="text-muted-foreground">Товар не найден</p>
    </div>
  ),
});

function ProductPage() {
  const { product } = Route.useLoaderData();
  const { t, lang } = useI18n();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const name = lang === "ru" ? product.name_ru : product.name_en;
  const desc = lang === "ru" ? product.description_ru : product.description_en;
  const tagline = lang === "ru" ? product.tagline_ru : product.tagline_en;

  return (
    <div className="container-rhode py-12">
      <Link to="/shop" className="text-xs uppercase tracking-widest hover-underline">
        ← {t("common.back")}
      </Link>
      <div className="grid md:grid-cols-2 gap-12 mt-8">
        <div className="space-y-4">
          {product.images.map((src, i) => (
            <img key={i} src={src} alt={name} className="w-full aspect-[4/5] object-cover" />
          ))}
        </div>
        <div className="md:sticky md:top-24 self-start">
          <h1 className="font-display text-4xl md:text-5xl">{name}</h1>
          <p className="text-muted-foreground mt-3">{tagline}</p>
          <div className="text-2xl mt-8 tabular-nums">{formatPrice(product.price, lang)}</div>
          <p className="mt-8 leading-relaxed text-foreground/80">{desc}</p>

          <div className="flex items-center gap-4 mt-10">
            <div className="flex border border-border">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-4 py-3">−</button>
              <span className="px-5 py-3 tabular-nums">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="px-4 py-3">+</button>
            </div>
            <button
              onClick={async () => {
                await api.addToCart(product.id, qty);
                setAdded(true);
                setTimeout(() => setAdded(false), 1500);
              }}
              className="flex-1 bg-foreground text-background py-4 text-xs uppercase tracking-[0.2em] hover:opacity-80 transition-opacity"
            >
              {added ? t("product.added") : t("product.add")}
            </button>
          </div>

          <div className="text-xs uppercase tracking-widest text-muted-foreground mt-6">
            {t("product.stock")}: {product.stock}
          </div>
        </div>
      </div>
    </div>
  );
}
