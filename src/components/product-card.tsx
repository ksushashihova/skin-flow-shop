import { Link } from "@tanstack/react-router";
import { useI18n, formatPrice } from "@/lib/i18n";
import { api, type Product } from "@/lib/api";

export function ProductCard({ product }: { product: Product }) {
  const { t, lang } = useI18n();
  const name = lang === "ru" ? product.name_ru : product.name_en;
  const tagline = lang === "ru" ? product.tagline_ru : product.tagline_en;
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
          onClick={() => api.addToCart(product.id, 1)}
          className="mt-auto pt-4"
        >
          <span className="block w-full border border-foreground text-foreground py-3 text-xs uppercase tracking-widest hover:bg-foreground hover:text-background transition-colors">
            {t("product.add")}
          </span>
        </button>
      </div>
    </div>
  );
}
