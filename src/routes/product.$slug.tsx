import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api, type Review } from "@/lib/api";
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
          {product.images.map((src: string, i: number) => (
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

      {(product.videoUrl || product.howToUse) && (
        <section className="mt-24">
          <h2 className="font-display text-3xl mb-6">Как использовать</h2>
          <div className="grid md:grid-cols-2 gap-10 items-start">
            {product.videoUrl ? (
              <video src={product.videoUrl} controls playsInline className="w-full aspect-video bg-muted object-cover" />
            ) : (
              <div className="w-full aspect-video bg-muted flex items-center justify-center text-xs uppercase tracking-widest text-muted-foreground">
                Видео скоро
              </div>
            )}
            {product.howToUse && (
              <p className="text-foreground/80 leading-relaxed whitespace-pre-line">{product.howToUse}</p>
            )}
          </div>
        </section>
      )}

      <ReviewsSection productId={product.id} />
    </div>
  );
}

function ReviewsSection({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filter, setFilter] = useState<"new" | "photo">("new");
  const [showForm, setShowForm] = useState(false);

  const refresh = () => api.listReviews(productId).then(setReviews);
  useEffect(() => { refresh(); }, [productId]);

  const filtered = [...reviews]
    .filter((r) => filter === "photo" ? r.photos.length > 0 : true)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <section className="mt-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h2 className="font-display text-3xl">Отзывы</h2>
          <div className="flex items-center gap-3 mt-3">
            <Stars value={avg} />
            <span className="font-display text-2xl tabular-nums">{avg.toFixed(1)}</span>
            <span className="text-sm text-muted-foreground">из 5 · {reviews.length} отзывов</span>
          </div>
        </div>
        <div className="flex gap-2">
          <FilterChip active={filter === "new"} onClick={() => setFilter("new")}>Сначала новые</FilterChip>
          <FilterChip active={filter === "photo"} onClick={() => setFilter("photo")}>Сначала с фото</FilterChip>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 border-y border-border">Пока нет отзывов.</p>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {filtered.map((r) => (
            <li key={r.id} className="py-6">
              <div className="flex justify-between items-start gap-4 mb-2">
                <div>
                  <div className="font-medium">{r.authorName}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {new Date(r.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                  </div>
                </div>
                <Stars value={r.rating} />
              </div>
              <p className="text-foreground/85 leading-relaxed mt-3">{r.text}</p>
              {r.photos.length > 0 && (
                <div className="flex gap-2 mt-4">
                  {r.photos.map((src, i) => (
                    <img key={i} src={src} alt="" className="w-20 h-20 object-cover" />
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8">
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="bg-foreground text-background px-8 py-4 text-xs uppercase tracking-[0.2em]"
          >
            Написать отзыв
          </button>
        ) : (
          <ReviewForm
            productId={productId}
            onCancel={() => setShowForm(false)}
            onSubmitted={() => { setShowForm(false); refresh(); }}
          />
        )}
      </div>
    </section>
  );
}

function ReviewForm({ productId, onCancel, onSubmitted }: { productId: string; onCancel: () => void; onSubmitted: () => void }) {
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const trimmedName = name.trim();
    const trimmedText = text.trim();
    if (trimmedName.length < 2 || trimmedName.length > 60) return setErr("Имя: от 2 до 60 символов");
    if (trimmedText.length < 10 || trimmedText.length > 1000) return setErr("Отзыв: от 10 до 1000 символов");
    if (rating < 1 || rating > 5) return setErr("Поставьте оценку");
    try {
      await api.addReview({
        productId, authorName: trimmedName, rating, text: trimmedText,
        photos: photoUrl.trim() ? [photoUrl.trim()] : [],
      });
      onSubmitted();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <form onSubmit={submit} className="border border-border p-6 space-y-5 max-w-xl">
      <div>
        <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">Имя</label>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required
          className="w-full border-b border-border bg-transparent py-2 outline-none focus:border-foreground" />
      </div>
      <div>
        <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">Оценка</label>
        <div className="flex gap-1">
          {[1,2,3,4,5].map((n) => (
            <button key={n} type="button" onClick={() => setRating(n)} className="text-2xl leading-none">
              <span className={n <= rating ? "text-foreground" : "text-border"}>★</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">Отзыв</label>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} maxLength={1000} required
          className="w-full border border-border bg-background px-3 py-2 outline-none focus:border-foreground" />
      </div>
      <div>
        <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">Фото (URL, необязательно)</label>
        <input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://…"
          className="w-full border-b border-border bg-transparent py-2 outline-none focus:border-foreground" />
      </div>
      {err && <div className="text-sm text-destructive">{err}</div>}
      <div className="flex gap-3">
        <button className="bg-foreground text-background px-6 py-3 text-xs uppercase tracking-[0.2em]">Отправить</button>
        <button type="button" onClick={onCancel} className="border border-border px-6 py-3 text-xs uppercase tracking-[0.2em] hover:bg-secondary">Отмена</button>
      </div>
    </form>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5 text-base">
      {[1,2,3,4,5].map((n) => (
        <span key={n} className={n <= Math.round(value) ? "text-foreground" : "text-border"}>★</span>
      ))}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-xs uppercase tracking-widest border ${active ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground"}`}
    >
      {children}
    </button>
  );
}
