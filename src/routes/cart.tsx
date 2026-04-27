import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api, type CartItem, type Product } from "@/lib/api";
import { useI18n, formatPrice } from "@/lib/i18n";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Корзина — ОБЛАКО" }] }),
  component: CartPage,
});

function CartPage() {
  const { t, lang } = useI18n();
  const [items, setItems] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const load = async () => {
    setItems(await api.getCart());
    setProducts(await api.listProducts());
  };
  useEffect(() => { load(); }, []);

  const detailed = items
    .map((i) => ({ item: i, product: products.find((p) => p.id === i.productId) }))
    .filter((x): x is { item: CartItem; product: Product } => !!x.product);

  const total = detailed.reduce((s, { item, product }) => s + item.quantity * product.price, 0);

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
          {detailed.map(({ item, product }) => {
            const name = lang === "ru" ? product.name_ru : product.name_en;
            return (
              <li key={item.id} className="py-6 flex gap-6">
                <img src={product.images[0]} alt={name} className="w-28 h-32 object-cover" />
                <div className="flex-1 flex flex-col justify-between">
                  <div className="flex justify-between gap-4">
                    <Link to="/product/$slug" params={{ slug: product.slug }} className="font-display text-xl hover-underline">
                      {name}
                    </Link>
                    <div className="tabular-nums">{formatPrice(product.price * item.quantity, lang)}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex border border-border text-sm">
                      <button onClick={() => api.updateCart(item.id, item.quantity - 1).then(setItems)} className="px-3 py-1">−</button>
                      <span className="px-4 py-1 tabular-nums">{item.quantity}</span>
                      <button onClick={() => api.updateCart(item.id, item.quantity + 1).then(setItems)} className="px-3 py-1">+</button>
                    </div>
                    <button onClick={() => api.removeFromCart(item.id).then(setItems)} className="text-xs uppercase tracking-widest text-muted-foreground hover:text-destructive">
                      Удалить
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
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
