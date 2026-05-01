import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api, type Bundle, type CartItem, type Product } from "@/lib/api";
import { useI18n, formatPrice } from "@/lib/i18n";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Корзина — ОБЛАКО" }] }),
  component: CartPage,
});

function CartPage() {
  const { t, lang } = useI18n();
  const [items, setItems] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);

  const load = async () => {
    setItems(await api.getCart());
    setProducts(await api.listProducts());
    setBundles(await api.listBundles());
  };
  useEffect(() => { load(); }, []);

  type Detailed = {
    item: CartItem;
    name: string;
    image: string;
    price: number;
    href: { to: "/product/$slug"; params: { slug: string } } | { to: "/bundles/$slug"; params: { slug: string } };
  };
  const detailed: Detailed[] = items.flatMap((item) => {
    if (item.productId) {
      const p = products.find((x) => x.id === item.productId);
      if (!p) return [];
      return [{
        item,
        name: lang === "ru" ? p.name_ru : p.name_en,
        image: p.images[0],
        price: p.price,
        href: { to: "/product/$slug" as const, params: { slug: p.slug } },
      }];
    }
    if (item.bundleId) {
      const b = bundles.find((x) => x.id === item.bundleId);
      if (!b) return [];
      const { discounted } = api.bundlePrice(b, products);
      return [{
        item,
        name: `Набор · ${b.name}`,
        image: b.cover,
        price: discounted,
        href: { to: "/bundles/$slug" as const, params: { slug: b.slug } },
      }];
    }
    return [];
  });

  const total = detailed.reduce((s, d) => s + d.price * d.item.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="container-rhode py-32 text-center">
        <h1 className="font-display text-4xl mb-6">{t("cart.title")}</h1>
        <p className="text-muted-foreground mb-8">{t("cart.empty")}</p>
        <Link to="/shop" className="inline-block bg-foreground text-background px-8 py-3 text-xs uppercase tracking-widest">
          {t("nav.shop")}
        </Link>
      </div>
    );
  }

  return (
    <div className="container-rhode py-16 grid lg:grid-cols-[1fr_380px] gap-16">
      <div>
        <h1 className="font-display text-5xl mb-10">{t("cart.title")}</h1>
        <ul className="divide-y divide-border">
          {detailed.map((d) => (
            <li key={d.item.id} className="py-6 flex gap-6">
              <img src={d.image} alt={d.name} className="w-28 h-32 object-cover" />
              <div className="flex-1 flex flex-col justify-between">
                <div className="flex justify-between gap-4">
                  {d.href.to === "/product/$slug" ? (
                    <Link to="/product/$slug" params={d.href.params} className="font-display text-xl hover-underline">{d.name}</Link>
                  ) : (
                    <Link to="/bundles/$slug" params={d.href.params} className="font-display text-xl hover-underline">{d.name}</Link>
                  )}
                  <div className="tabular-nums">{formatPrice(d.price * d.item.quantity, lang)}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex border border-border text-sm">
                    <button onClick={() => api.updateCart(d.item.id, d.item.quantity - 1).then(setItems)} className="px-3 py-1">−</button>
                    <span className="px-4 py-1 tabular-nums">{d.item.quantity}</span>
                    <button onClick={() => api.updateCart(d.item.id, d.item.quantity + 1).then(setItems)} className="px-3 py-1">+</button>
                  </div>
                  <button onClick={() => api.removeFromCart(d.item.id).then(setItems)} className="text-xs uppercase tracking-widest text-muted-foreground hover:text-destructive">
                    Удалить
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <aside className="bg-secondary p-8 h-fit">
        <div className="flex justify-between text-sm mb-4">
          <span>{t("cart.subtotal")}</span>
          <span className="tabular-nums">{formatPrice(total, lang)}</span>
        </div>
        <Link to="/checkout" className="block text-center bg-foreground text-background py-4 text-xs uppercase tracking-[0.2em] hover:opacity-80">
          {t("cart.checkout")}
        </Link>
      </aside>
    </div>
  );
}
