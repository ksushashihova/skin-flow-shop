import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { api, type GiftCard } from "@/lib/api";

export const Route = createFileRoute("/gift-cards")({
  head: () => ({
    meta: [
      { title: "Подарочные сертификаты — ОБЛАКО" },
      { name: "description", content: "Электронные подарочные сертификаты на любую сумму." },
      { property: "og:title", content: "Подарочные сертификаты — ОБЛАКО" },
      { property: "og:description", content: "Сертификат приходит на email получателя сразу после оплаты." },
    ],
  }),
  component: GiftCardsPage,
});

const PRESETS = [1000, 3000, 5000, 10000];

function GiftCardsPage() {
  const [amount, setAmount] = useState(3000);
  const [custom, setCustom] = useState("");
  const [design, setDesign] = useState<GiftCard["design"]>("minimal");
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("");
  const [issued, setIssued] = useState<GiftCard | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const finalAmount = custom ? Number(custom) : amount;
      const gc = await api.createGiftCard({
        amount: finalAmount,
        design,
        recipientEmail: recipient.trim(),
        message: message.trim() || undefined,
      });
      setIssued(gc);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (issued) {
    return (
      <div className="container-rhode py-24 max-w-xl text-center">
        <h1 className="font-display text-5xl mb-4">Сертификат оформлен</h1>
        <p className="text-muted-foreground mb-10">
          Письмо с сертификатом отправлено на <span className="text-foreground">{issued.recipientEmail}</span>.
        </p>
        <CardPreview design={issued.design} amount={issued.amount} code={issued.code} />
        <div className="mt-10 p-6 bg-secondary text-sm">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Промокод</div>
          <div className="font-mono text-2xl tracking-wider">{issued.code}</div>
          <div className="text-xs text-muted-foreground mt-2">Можно ввести при оформлении заказа.</div>
        </div>
        <button
          onClick={() => { setIssued(null); setRecipient(""); setMessage(""); }}
          className="mt-8 text-xs uppercase tracking-widest hover-underline"
        >
          Оформить ещё один
        </button>
      </div>
    );
  }

  return (
    <div className="container-rhode py-16 grid lg:grid-cols-2 gap-16">
      <div>
        <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-4">Gift Cards</div>
        <h1 className="font-display text-5xl md:text-6xl mb-4">Подарочные сертификаты</h1>
        <p className="text-muted-foreground mb-10">
          Электронный сертификат с уникальным кодом приходит на email получателя сразу после оплаты.
          Срок действия не ограничен.
        </p>
        <CardPreview design={design} amount={custom ? Number(custom) || 0 : amount} code="GIFT-XXXX-XXXX" />
      </div>

      <form onSubmit={submit} className="space-y-8">
        <section>
          <Label>Номинал</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {PRESETS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => { setAmount(v); setCustom(""); }}
                className={`py-3 text-sm border ${!custom && amount === v ? "border-foreground bg-secondary" : "border-border hover:border-muted-foreground"}`}
              >
                {v.toLocaleString("ru-RU")} ₽
              </button>
            ))}
          </div>
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="Свой номинал, ₽"
            className="w-full border border-border bg-background px-4 py-3 text-sm outline-none focus:border-foreground"
          />
        </section>

        <section>
          <Label>Дизайн</Label>
          <div className="grid grid-cols-2 gap-3">
            {(["minimal", "floral"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDesign(d)}
                className={`p-4 border ${design === d ? "border-foreground" : "border-border"}`}
              >
                <div className={`aspect-[16/9] mb-2 ${d === "minimal" ? "bg-foreground" : "bg-gradient-to-br from-rose-200 via-amber-100 to-rose-300"}`} />
                <div className="text-xs uppercase tracking-widest">{d === "minimal" ? "Минималистичный" : "С цветами"}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <Label>Кому</Label>
          <input
            type="email"
            required
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="email@example.com"
            maxLength={255}
            className="w-full border-b border-border bg-transparent py-3 outline-none focus:border-foreground"
          />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 300))}
            placeholder="Поздравление (необязательно, до 300 символов)"
            rows={3}
            className="w-full border border-border bg-background px-3 py-3 text-sm outline-none focus:border-foreground"
          />
        </section>

        {err && <div className="text-sm text-destructive">{err}</div>}

        <button
          disabled={loading}
          className="w-full bg-foreground text-background py-4 text-xs uppercase tracking-[0.2em] disabled:opacity-50"
        >
          {loading ? "Оформление…" : `Оплатить ${(custom ? Number(custom) || 0 : amount).toLocaleString("ru-RU")} ₽`}
        </button>
      </form>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-3">{children}</div>;
}

function CardPreview({ design, amount, code }: { design: GiftCard["design"]; amount: number; code: string }) {
  return (
    <div className={`relative w-full aspect-[16/9] p-8 flex flex-col justify-between text-background ${
      design === "minimal" ? "bg-foreground" : "bg-gradient-to-br from-rose-300 via-amber-200 to-rose-400 text-foreground"
    }`}>
      <div>
        <div className="text-xs uppercase tracking-[0.3em] opacity-70">Подарочный сертификат</div>
        <div className="font-display text-4xl mt-1">ОБЛАКО</div>
      </div>
      <div className="flex justify-between items-end">
        <div className="font-mono text-sm opacity-80">{code}</div>
        <div className="font-display text-3xl tabular-nums">{amount.toLocaleString("ru-RU")} ₽</div>
      </div>
    </div>
  );
}
