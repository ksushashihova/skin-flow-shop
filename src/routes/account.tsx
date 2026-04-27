import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api, type Order, type User } from "@/lib/api";
import { useI18n, formatPrice } from "@/lib/i18n";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "Личный кабинет — ОБЛАКО" }] }),
  component: AccountPage,
});

function AccountPage() {
  const { t, lang } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const u = await api.me();
    setUser(u);
    if (u) setOrders(await api.listOrders());
    setLoading(false);
  };
  useEffect(() => { refresh(); }, []);

  if (loading) return <div className="container-rhode py-32 text-center text-muted-foreground">{t("common.loading")}</div>;
  if (!user) return <AuthForms onAuth={refresh} />;

  return (
    <div className="container-rhode py-16 grid md:grid-cols-[260px_1fr] gap-16">
      <aside>
        <div className="font-display text-3xl mb-2">{user.name}</div>
        <div className="text-sm text-muted-foreground">{user.email}</div>
        <button
          onClick={async () => { await api.logout(); refresh(); }}
          className="mt-8 text-xs uppercase tracking-widest hover-underline"
        >
          {t("auth.logout")}
        </button>
      </aside>
      <section>
        <h2 className="font-display text-3xl mb-6">{t("account.profile")}</h2>
        <ProfileForm user={user} onSaved={setUser} />
        <h2 className="font-display text-3xl mt-16 mb-6">{t("account.orders")}</h2>
        {orders.length === 0 ? (
          <p className="text-muted-foreground text-sm">Заказов пока нет.</p>
        ) : (
          <ul className="divide-y divide-border">
            {orders.map((o) => (
              <li key={o.id} className="py-5 flex justify-between items-start gap-4">
                <div>
                  <div className="font-medium">№ {o.id}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(o.createdAt).toLocaleDateString("ru-RU")} ·{" "}
                    {o.items.map((i) => `${i.name} × ${i.quantity}`).join(", ")}
                  </div>
                </div>
                <div className="text-right">
                  <div className="tabular-nums">{formatPrice(o.totalPrice, lang)}</div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">{o.status}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ProfileForm({ user, onSaved }: { user: User; onSaved: (u: User) => void }) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [saved, setSaved] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const u = await api.updateMe({ name, phone });
        onSaved(u);
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      }}
      className="space-y-4 max-w-md"
    >
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Имя"
        className="w-full border-b border-border bg-transparent py-2 outline-none focus:border-foreground" />
      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Телефон"
        className="w-full border-b border-border bg-transparent py-2 outline-none focus:border-foreground" />
      <button className="bg-foreground text-background px-6 py-3 text-xs uppercase tracking-widest">
        {saved ? "Сохранено" : "Сохранить"}
      </button>
    </form>
  );
}

function AuthForms({ onAuth }: { onAuth: () => void }) {
  const { t } = useI18n();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      if (mode === "login") await api.login(email, password);
      else await api.register(email, password, name);
      onAuth();
    } catch (e) { setErr((e as Error).message); }
  };

  return (
    <div className="container-rhode py-24 max-w-md">
      <h1 className="font-display text-5xl mb-2">
        {mode === "login" ? t("auth.login") : t("auth.register")}
      </h1>
      <p className="text-sm text-muted-foreground mb-8">
        Демо: admin@demo.ru / admin123 · client@demo.ru / demo1234
      </p>
      <form onSubmit={submit} className="space-y-4">
        {mode === "register" && (
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("auth.name")} required
            className="w-full border-b border-border bg-transparent py-2 outline-none focus:border-foreground" />
        )}
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("auth.email")} required
          className="w-full border-b border-border bg-transparent py-2 outline-none focus:border-foreground" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("auth.password")} required
          className="w-full border-b border-border bg-transparent py-2 outline-none focus:border-foreground" />
        {err && <div className="text-sm text-destructive">{err}</div>}
        <button className="w-full bg-foreground text-background py-4 text-xs uppercase tracking-[0.2em]">
          {mode === "login" ? t("auth.login") : t("auth.register")}
        </button>
      </form>
      <button
        onClick={() => setMode(mode === "login" ? "register" : "login")}
        className="mt-6 text-xs uppercase tracking-widest hover-underline"
      >
        {mode === "login" ? t("auth.register") : t("auth.login")}
      </button>
    </div>
  );
}
