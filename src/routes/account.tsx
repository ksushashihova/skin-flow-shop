import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api, trackingStagesFor, trackingUrlFor, type Order, type User } from "@/lib/api";
import { useI18n, formatPrice } from "@/lib/i18n";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "Личный кабинет — ОБЛАКО" }] }),
  component: AccountPage,
});

const STATUS_LABEL: Record<Order["status"], string> = {
  new: "Новый",
  paid: "Оплачен",
  shipped: "В пути",
  completed: "Получен",
  cancelled: "Отменён",
};

const PAYMENT_LABEL: Record<Order["paymentMethod"], string> = {
  card_online: "Картой онлайн",
  sbp: "СБП",
  card_on_delivery: "Картой при получении",
  cash: "Наличными при получении",
};

const DELIVERY_LABEL: Record<Order["deliveryMethod"], string> = {
  pickup: "Самовывоз",
  courier: "Курьер",
  cdek: "СДЭК",
  post: "Почта России",
};

function AccountPage() {
  const { t, lang } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const refresh = async () => {
    const u = await api.me();
    setUser(u);
    if (u) setOrders(await api.listOrders());
    setLoading(false);
  };
  useEffect(() => { refresh(); }, []);

  if (loading) return <div className="container-rhode py-32 text-center text-muted-foreground">{t("common.loading")}</div>;
  if (!user) return <AuthForms onAuth={refresh} />;

  const cancel = async (id: string) => {
    if (!confirm("Отменить этот заказ?")) return;
    try {
      await api.cancelOrder(id);
      await refresh();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  return (
    <div className="container-rhode py-16 grid md:grid-cols-[260px_1fr] gap-16">
      <aside>
        <div className="font-display text-3xl mb-2">{user.name}</div>
        <div className="text-sm text-muted-foreground">{user.email}</div>
        {user.phone && <div className="text-sm text-muted-foreground">{user.phone}</div>}
        <div className="mt-6 p-4 bg-secondary">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Бонусный счёт</div>
          <div className="font-display text-3xl tabular-nums">{user.bonusBalance}</div>
          <div className="text-xs text-muted-foreground mt-1">Возврат 5% с каждого заказа</div>
        </div>
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
          <ul className="divide-y divide-border border-y border-border">
            {orders.map((o) => {
              const isOpen = openId === o.id;
              const cancellable = o.status !== "shipped" && o.status !== "completed" && o.status !== "cancelled";
              return (
                <li key={o.id} className="py-5">
                  <button
                    onClick={() => setOpenId(isOpen ? null : o.id)}
                    className="w-full flex justify-between items-start gap-4 text-left"
                  >
                    <div>
                      <div className="font-medium">№ {o.id}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(o.createdAt).toLocaleDateString("ru-RU")} · {o.items.length} поз. · {DELIVERY_LABEL[o.deliveryMethod]}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="tabular-nums">{formatPrice(o.totalPrice, lang)}</div>
                      <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">
                        {STATUS_LABEL[o.status]}
                      </div>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="mt-6 bg-secondary p-6 space-y-6">
                      {o.status !== "cancelled" && (
                        <TrackingTimeline order={o} />
                      )}
                      <ul className="space-y-4">
                        {o.items.map((it) => (
                          <li key={it.productId + it.name} className="flex gap-4">
                            {it.image && <img src={it.image} alt="" className="w-16 h-20 object-cover" />}
                            <div className="flex-1 flex justify-between text-sm">
                              <div>
                                <div>{it.name}</div>
                                <div className="text-xs text-muted-foreground mt-1">× {it.quantity}</div>
                              </div>
                              <div className="tabular-nums">{formatPrice(it.price * it.quantity, lang)}</div>
                            </div>
                          </li>
                        ))}
                      </ul>
                      <div className="text-xs text-muted-foreground space-y-1 border-t border-border pt-4">
                        <div>Доставка: {DELIVERY_LABEL[o.deliveryMethod]} {o.deliveryPrice ? `· ${formatPrice(o.deliveryPrice, lang)}` : "· бесплатно"}</div>
                        <div>Оплата: {PAYMENT_LABEL[o.paymentMethod]}</div>
                        <div>Адрес: {o.address.city}, {o.address.addressLine}, {o.address.postalCode}</div>
                        {o.bonusUsed > 0 && <div>Списано бонусов: −{o.bonusUsed}</div>}
                        {o.bonusEarned > 0 && <div>Начислено бонусов: +{o.bonusEarned}</div>}
                        {o.promoUsed && <div>Промокод/сертификат: {o.promoUsed} (−{formatPrice(o.promoDiscount, lang)})</div>}
                      </div>
                      {cancellable && (
                        <button
                          onClick={() => cancel(o.id)}
                          className="text-xs uppercase tracking-widest text-destructive hover-underline"
                        >
                          Отменить заказ
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function TrackingTimeline({ order }: { order: Order }) {
  const stages = trackingStagesFor(order);
  const trackUrl = trackingUrlFor(order);
  const eta = order.estimatedDelivery
    ? new Date(order.estimatedDelivery).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })
    : null;
  return (
    <div className="border-b border-border pb-6">
      <div className="flex flex-wrap gap-4 justify-between items-baseline mb-5">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Отслеживание</div>
        {order.trackingNumber && (
          <div className="text-xs">
            <span className="text-muted-foreground">Трек: </span>
            {trackUrl ? (
              <a href={trackUrl} target="_blank" rel="noreferrer" className="font-medium hover-underline tabular-nums">
                {order.trackingNumber}
              </a>
            ) : (
              <span className="font-medium tabular-nums">{order.trackingNumber}</span>
            )}
          </div>
        )}
      </div>
      <ol className="grid grid-cols-4 gap-2">
        {stages.map((st, i) => (
          <li key={st.key} className="text-center">
            <div className="relative flex items-center justify-center h-6 mb-2">
              {i > 0 && (
                <span className={`absolute left-0 right-1/2 top-1/2 h-px ${stages[i - 1].done ? "bg-foreground" : "bg-border"}`} />
              )}
              {i < stages.length - 1 && (
                <span className={`absolute left-1/2 right-0 top-1/2 h-px ${st.done ? "bg-foreground" : "bg-border"}`} />
              )}
              <span className={`relative z-10 w-3 h-3 rounded-full ${st.done ? "bg-foreground" : "bg-background border border-border"}`} />
            </div>
            <div className={`text-[11px] uppercase tracking-widest ${st.done ? "text-foreground" : "text-muted-foreground"}`}>
              {st.label}
            </div>
            {st.date && <div className="text-[10px] text-muted-foreground mt-1">{st.date}</div>}
          </li>
        ))}
      </ol>
      {eta && order.status !== "completed" && (
        <div className="text-xs text-muted-foreground mt-4">Ожидаемая доставка: <span className="text-foreground">{eta}</span></div>
      )}
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
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      if (mode === "login") await api.login(email, password);
      else await api.register(email, password, name, phone);
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
          <>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("auth.name")} required
              className="w-full border-b border-border bg-transparent py-2 outline-none focus:border-foreground" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Телефон"
              className="w-full border-b border-border bg-transparent py-2 outline-none focus:border-foreground" />
          </>
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
