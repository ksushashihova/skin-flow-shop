import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useI18n, formatPrice } from "@/lib/i18n";
import { api, type Product } from "@/lib/api";

export function ProductCard({ product }: { product: Product }) {
  const { t, lang } = useI18n();
  const name = lang === "ru" ? product.name_ru : product.name_en;
  const tagline = lang === "ru" ? product.tagline_ru : product.tagline_en;

  // Состояние: id позиции корзины, если товар уже добавлен
  const [cartItemId, setCartItemId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Подписка на изменения корзины: при добавлении/удалении в любом месте сайта обновляемся
  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      const cart = await api.getCart();
      if (!alive) return;
      const item = cart.find((c) => c.productId === product.id && !c.bundleId);
      setCartItemId(item?.id ?? null);
    };
    refresh();
    const onChange = () => refresh();
    window.addEventListener("oblako-cart-change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      alive = false;
      window.removeEventListener("oblako-cart-change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [product.id]);

  const inCart = cartItemId !== null;

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      if (inCart && cartItemId) {
        await api.removeFromCart(cartItemId);
        setCartItemId(null);
      } else {
        const cart = await api.addToCart(product.id, 1);
        const item = cart.find((c) => c.productId === product.id && !c.bundleId);
        setCartItemId(item?.id ?? null);
      }
      // Уведомляем хедер и другие карточки
      window.dispatchEvent(new Event("oblako-cart-change"));
    } catch (err) {
      // Ошибка склада и т.п.
      alert((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="group flex flex-col h-full">
      <Link to="/product/$slug" params={{ slug: product.slug }} className="block">
        <div className="aspect-[4/5] overflow-hidden bg-muted">
          <img
            src={product.images[0]}
            alt={name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        </div>
      </Link>
      <div className="pt-4 flex-1 flex flex-col">
        <Link to="/product/$slug" params={{ slug: product.slug }} className="block">
          <div className="flex items-baseline justify-between gap-4">
            <div className="font-display text-lg leading-tight line-clamp-2 min-h-[3rem]">{name}</div>
            <div className="text-sm tabular-nums shrink-0">{formatPrice(product.price, lang)}</div>
          </div>
          <div className="text-xs text-muted-foreground mt-1 line-clamp-2 min-h-[2rem]">{tagline}</div>
        </Link>
        <button
          type="button"
          onClick={handleClick}
          disabled={busy}
          aria-pressed={inCart}
          title={inCart ? t("product.removeHint") : undefined}
          className="mt-auto pt-4 group/btn"
        >
          <span
            className={
              "relative block w-full border py-3 text-xs uppercase tracking-widest transition-colors disabled:opacity-60 " +
              (inCart
                ? "border-foreground bg-foreground text-background hover:bg-destructive hover:border-destructive"
                : "border-foreground text-foreground hover:bg-foreground hover:text-background")
            }
          >
            {/* Текст "В корзине" по умолчанию, при наведении меняется на "Убрать" */}
            {inCart ? (
              <>
                <span className="inline group-hover/btn:hidden">✓ {t("product.inCart")}</span>
                <span className="hidden group-hover/btn:inline">✕ {t("product.removeHint")}</span>
              </>
            ) : (
              t("product.add")
            )}
          </span>
        </button>
      </div>
    </div>
  );
}
