import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api, type User } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Оформление заказа — ОБЛАКО" }] }),
  component: Checkout,
});

function Checkout() {
  const { t } = useI18n();
  const nav = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [city, setCity] = useState("");
  const [addr, setAddr] = useState("");
  const [postal, setPostal] = useState("");
  const [consent, setConsent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.me().then(setUser); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      if (!user) {
        nav({ to: "/account" });
        return;
      }
      const order = await api.createOrder({ city, addressLine: addr, postalCode: postal }, consent);
      nav({ to: "/account", search: { orderId: order.id } as never });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-rhode py-16 max-w-2xl">
      <h1 className="font-display text-5xl mb-10">{t("checkout.title")}</h1>
      {!user && (
        <div className="mb-8 p-4 border border-border text-sm">
          Чтобы оформить заказ, войдите в личный кабинет.
        </div>
      )}
      <form onSubmit={submit} className="space-y-6">
        <Field label={t("checkout.city")} value={city} onChange={setCity} />
        <Field label={t("checkout.address")} value={addr} onChange={setAddr} />
        <Field label={t("checkout.postal")} value={postal} onChange={setPostal} />
        <label className="flex gap-3 items-start text-sm">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" required />
          <span className="text-muted-foreground leading-relaxed">{t("checkout.consent")}</span>
        </label>
        {err && <div className="text-sm text-destructive">{err}</div>}
        <button
          disabled={loading}
          className="w-full bg-foreground text-background py-4 text-xs uppercase tracking-[0.2em] disabled:opacity-50"
        >
          {loading ? t("common.loading") : t("checkout.submit")}
        </button>
      </form>
    </div>
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
