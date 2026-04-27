import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api, type Product } from "@/lib/api";
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
  const { t } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => {
    const id = setTimeout(() => api.listProducts(q).then(setProducts), 100);
    return () => clearTimeout(id);
  }, [q]);

  return (
    <div className="container-rhode py-16">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
        <h1 className="font-display text-5xl md:text-6xl">{t("shop.title")}</h1>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("shop.search")}
          className="border-b border-border bg-transparent py-2 px-1 outline-none focus:border-foreground transition-colors min-w-[260px]"
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
        {products.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </div>
  );
}
