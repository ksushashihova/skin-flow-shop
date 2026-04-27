import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api, DELIVERY_PRICES, type CartItem, type DeliveryMethod, type PaymentMethod, type Product, type User } from "@/lib/api";
import { useI18n, formatPrice } from "@/lib/i18n";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Оформление заказа — ОБЛАКО" }] }),
  component: Checkout,
});

const PAYMENTS: { id: PaymentMethod; label: string; hint: string }[] = [
  { id: "card_online", label: "Картой онлайн", hint: "Visa, MasterCard, МИР" },
  { id: "sbp", label: "СБП", hint: "Система быстрых платежей по QR" },
  { id: "card_on_delivery", label: "Картой при получении", hint: "Оплата курьеру или в пункте выдачи" },
  { id: "cash", label: "Наличными при получении", hint: "Только для курьерской доставки" },
];

const DELIVERIES: { id: DeliveryMethod; label: string; hint: string }[] = [
  { id: "pickup", label: "Самовывоз", hint: "Москва, ул. Тверская 12 · бесплатно" },
  { id: "courier", label: "Курьер", hint: "По Москве и МО · 1–2 дня" },
  { id: "cdek", label: "СДЭК", hint: "В пункт выдачи по России · 2–5 дней" },
  { id: "post", label: "Почта России", hint: "Доставка до отделения · 3–10 дней" },
];

function Checkout() {
  const { t, lang } = useI18n();
  const nav = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [city, setCity] = useState("");
  const [addr, setAddr] = useState("");
  const [postal, setPostal] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>("card_online");
  const [delivery, setDelivery] = useState<DeliveryMethod>("courier");
  const [consent, setConsent] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.me().then(setUser);
    api.getCart().then(setItems);
    api.listProducts().then(setProducts);
  }, []);

  const subtotal = items.reduce((s, i) => {
    const p = products.find((p) => p.id === i.productId);
    return s + (p ? p.price * i.quantity : 0);
  }, 0);
  const deliveryPrice = DELIVERY_PRICES[delivery];
  const total = subtotal + deliveryPrice;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      if (!user) {
        nav({ to: "/account" });
        return;
      }
      const order = await api.createOrder(
        { city, addressLine: addr, postalCode: postal },
        payment,
        delivery,
        consent,
      );
      nav({ to: "/account", search: { orderId: order.id } as never });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-rhode py-16 grid lg:grid-cols-[1fr_380px] gap-12">
      <form onSubmit={submit} className="space-y-12">
        <div>
          <h1 className="font-display text-5xl mb-2">{t("checkout.title")}</h1>
          {!user && (
            <div className="mt-6 p-4 border border-border text-sm">
              Чтобы оформить заказ, войдите в личный кабинет.
            </div>
          )}
        </div>

        <section>
          <SectionTitle index="01" title="Доставка" />
          <div className="space-y-3 mb-8">
            {DELIVERIES.map((d) => (
              <OptionCard
                key={d.id}
                checked={delivery === d.id}
                onSelect={() => setDelivery(d.id)}
                title={d.label}
                hint={d.hint}
                price={DELIVERY_PRICES[d.id] === 0 ? "Бесплатно" : formatPrice(DELIVERY_PRICES[d.id], lang)}
              />
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            <Field label={t("checkout.city")} value={city} onChange={setCity} />
            <Field label={t("checkout.postal")} value={postal} onChange={setPostal} />
            <div className="sm:col-span-2">
              <Field label={t("checkout.address")} value={addr} onChange={setAddr} />
            </div>
          </div>
        </section>

        <section>
          <SectionTitle index="02" title="Оплата" />
          <div className="space-y-3">
            {PAYMENTS.map((p) => (
              <OptionCard
                key={p.id}
                checked={payment === p.id}
                onSelect={() => setPayment(p.id)}
                title={p.label}
                hint={p.hint}
              />
            ))}
          </div>
        </section>

        <section>
          <SectionTitle index="03" title="Согласие" />
          <label className="flex gap-3 items-start text-sm">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" required />
            <span className="text-muted-foreground leading-relaxed">{t("checkout.consent")}</span>
          </label>
        </section>

        {err && <div className="text-sm text-destructive">{err}</div>}
      </form>

      <aside className="bg-secondary p-8 h-fit lg:sticky lg:top-24 space-y-4">
        <div className="font-display text-2xl mb-4">Ваш заказ</div>
        <div className="space-y-3 text-sm">
          {items.map((i) => {
            const p = products.find((pr) => pr.id === i.productId);
            if (!p) return null;
            return (
              <div key={i.id} className="flex justify-between gap-4">
                <span className="text-muted-foreground">{(lang === "ru" ? p.name_ru : p.name_en)} × {i.quantity}</span>
                <span className="tabular-nums">{formatPrice(p.price * i.quantity, lang)}</span>
              </div>
            );
          })}
        </div>
        <div className="border-t border-border pt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Товары</span>
            <span className="tabular-nums">{formatPrice(subtotal, lang)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Доставка</span>
            <span className="tabular-nums">{deliveryPrice === 0 ? "Бесплатно" : formatPrice(deliveryPrice, lang)}</span>
          </div>
          <div className="flex justify-between font-display text-xl pt-2">
            <span>Итого</span>
            <span className="tabular-nums">{formatPrice(total, lang)}</span>
          </div>
        </div>
        <button
          onClick={submit}
          disabled={loading}
          type="submit"
          className="w-full bg-foreground text-background py-4 text-xs uppercase tracking-[0.2em] disabled:opacity-50"
        >
          {loading ? t("common.loading") : t("checkout.submit")}
        </button>
      </aside>
    </div>
  );
}

function SectionTitle({ index, title }: { index: string; title: string }) {
  return (
    <div className="flex items-baseline gap-4 mb-6">
      <span className="text-xs tracking-widest text-muted-foreground tabular-nums">{index}</span>
      <h2 className="font-display text-2xl">{title}</h2>
    </div>
  );
}

function OptionCard({
  checked, onSelect, title, hint, price,
}: { checked: boolean; onSelect: () => void; title: string; hint: string; price?: string }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left flex items-start gap-4 p-4 border transition-colors ${
        checked ? "border-foreground bg-secondary" : "border-border hover:border-muted-foreground"
      }`}
    >
      <span className={`mt-1 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
        checked ? "border-foreground" : "border-muted-foreground"
      }`}>
        {checked && <span className="w-2 h-2 rounded-full bg-foreground" />}
      </span>
      <span className="flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground mt-1">{hint}</span>
      </span>
      {price && <span className="text-sm tabular-nums shrink-0">{price}</span>}
    </button>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="w-full border-b border-border bg-transparent py-2 outline-none focus:border-foreground"
      />
    </div>
  );
}
