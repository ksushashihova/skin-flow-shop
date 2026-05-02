import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api, type Product, type ProductCategory } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { ProductCard } from "@/components/product-card";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Магазин — ОБЛАКО" },
      { name: "description", content: "Полный каталог средств ухода за кожей ОБЛАКО." },
    ],
  }),
  component: Shop,
});

function Shop() {
  const { t, lang } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);

  useEffect(() => {
    api.listCategories().then(setCategories);
  }, []);

  useEffect(() => {
    const id = setTimeout(
      () => api.listProducts(q, cat ?? undefined).then(setProducts),
      100
    );
    return () => clearTimeout(id);
  }, [q, cat]);

  const catName = (c: ProductCategory) => (lang === "en" ? c.name_en : c.name_ru);

  return (
    <div className="container-rhode py-16">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
        <h1 className="font-display text-5xl md:text-6xl">{t("shop.title")}</h1>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("shop.search")}
          className="border-b border-border bg-transparent py-2 px-1 outline-none focus:border-foreground transition-colors min-w-[260px]"
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-10">
        <button
          onClick={() => setCat(null)}
          className={`text-xs uppercase tracking-widest px-4 py-2 border transition-colors ${
            cat === null
              ? "bg-foreground text-background border-foreground"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          Все
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            className={`text-xs uppercase tracking-widest px-4 py-2 border transition-colors ${
              cat === c.id
                ? "bg-foreground text-background border-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {catName(c)}
          </button>
        ))}
      </div>

      {products.length === 0 ? (
        <div className="py-24 text-center text-muted-foreground text-sm uppercase tracking-widest">
          Ничего не найдено
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
