import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api, type Order, type OrderStatus, type User } from "@/lib/api";
import { useI18n, formatPrice } from "@/lib/i18n";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Панель администратора — ОБЛАКО" }] }),
  component: Admin,
});

const STATUSES: OrderStatus[] = ["new", "paid", "shipped", "completed", "cancelled"];

const STATUS_LABEL: Record<OrderStatus, string> = {
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

type View =
  | { kind: "users" }
  | { kind: "userOrders"; user: User }
  | { kind: "order"; user: User; order: Order };

function Admin() {
  const { lang } = useI18n();
  const router = useRouter();
  const [me, setMe] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [view, setView] = useState<View>({ kind: "users" });

  const refresh = async () => {
    const u = await api.me();
    setMe(u);
    if (u?.role === "admin") {
      setUsers(await api.adminListUsers());
      setOrders(await api.adminListOrders());
    }
  };
  useEffect(() => { refresh(); }, []);

  if (!me) return <div className="container-rhode py-32 text-center text-muted-foreground">Войдите как администратор.</div>;
  if (me.role !== "admin") return <div className="container-rhode py-32 text-center text-muted-foreground">Доступ только для администраторов.</div>;

  const ordersByUser = (uid: string) => orders.filter((o) => o.userId === uid);

  return (
    <div className="container-rhode py-16">
      <div className="flex items-start justify-between mb-12 gap-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Панель администратора</div>
          <h1 className="font-display text-5xl">ОБЛАКО · Admin</h1>
        </div>
        <button
          onClick={async () => { await api.logout(); router.navigate({ to: "/" }); }}
          className="text-xs uppercase tracking-widest border border-foreground px-5 py-3 hover:bg-foreground hover:text-background transition-colors"
        >
          Выйти
        </button>
      </div>

      {/* breadcrumbs */}
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground mb-8">
        <button
          onClick={() => setView({ kind: "users" })}
          className={view.kind === "users" ? "text-foreground" : "hover-underline"}
        >
          Пользователи
        </button>
        {view.kind !== "users" && (
          <>
            <span>/</span>
            <button
              onClick={() => setView({ kind: "userOrders", user: view.user })}
              className={view.kind === "userOrders" ? "text-foreground" : "hover-underline"}
            >
              {view.user.name}
            </button>
          </>
        )}
        {view.kind === "order" && (
          <>
            <span>/</span>
            <span className="text-foreground">№ {view.order.id}</span>
          </>
        )}
      </div>

      {view.kind === "users" && (
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-widest text-muted-foreground border-b border-border">
            <tr>
              <th className="text-left py-3">Имя</th>
              <th className="text-left">Email</th>
              <th className="text-left">Телефон</th>
              <th className="text-left">Роль</th>
              <th className="text-left">Заказов</th>
              <th className="text-left">Создан</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => (
              <tr
                key={u.id}
                onClick={() => setView({ kind: "userOrders", user: u })}
                className="cursor-pointer hover:bg-secondary"
              >
                <td className="py-4 hover-underline">{u.name}</td>
                <td>{u.email}</td>
                <td className="text-muted-foreground">{u.phone ?? "—"}</td>
                <td className="uppercase text-xs tracking-widest">{u.role}</td>
                <td className="tabular-nums">{ordersByUser(u.id).length}</td>
                <td className="text-muted-foreground">{new Date(u.createdAt).toLocaleDateString("ru-RU")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {view.kind === "userOrders" && (
        <div>
          <div className="bg-secondary p-6 mb-8">
            <div className="font-display text-2xl">{view.user.name}</div>
            <div className="text-sm text-muted-foreground mt-2 space-y-1">
              <div>Email: {view.user.email}</div>
              <div>Телефон: {view.user.phone ?? "—"}</div>
              <div>Роль: {view.user.role}</div>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-widest text-muted-foreground border-b border-border">
              <tr>
                <th className="text-left py-3">№</th>
                <th className="text-left">Дата</th>
                <th className="text-left">Сумма</th>
                <th className="text-left">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ordersByUser(view.user.id).length === 0 && (
                <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">У пользователя нет заказов</td></tr>
              )}
              {ordersByUser(view.user.id).map((o) => (
                <tr
                  key={o.id}
                  onClick={() => setView({ kind: "order", user: view.user, order: o })}
                  className="cursor-pointer hover:bg-secondary"
                >
                  <td className="py-4 hover-underline">{o.id}</td>
                  <td className="text-muted-foreground">{new Date(o.createdAt).toLocaleString("ru-RU")}</td>
                  <td className="tabular-nums">{formatPrice(o.totalPrice, lang)}</td>
                  <td className="uppercase text-xs tracking-widest">{STATUS_LABEL[o.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view.kind === "order" && (
        <div className="grid lg:grid-cols-[1fr_360px] gap-12">
          <div>
            <div className="font-display text-3xl mb-2">Заказ № {view.order.id}</div>
            <div className="text-xs text-muted-foreground mb-8">
              {new Date(view.order.createdAt).toLocaleString("ru-RU")}
            </div>
            <ul className="divide-y divide-border border-y border-border">
              {view.order.items.map((it) => (
                <li key={it.productId} className="py-4 flex gap-4">
                  {it.image && <img src={it.image} alt="" className="w-20 h-24 object-cover" />}
                  <div className="flex-1 flex justify-between">
                    <div>
                      <div className="text-sm">{it.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">× {it.quantity}</div>
                    </div>
                    <div className="text-sm tabular-nums">{formatPrice(it.price * it.quantity, lang)}</div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex justify-between text-sm">
              <span>Доставка</span>
              <span className="tabular-nums">{view.order.deliveryPrice ? formatPrice(view.order.deliveryPrice, lang) : "Бесплатно"}</span>
            </div>
            <div className="mt-2 flex justify-between font-display text-2xl">
              <span>Итого</span>
              <span className="tabular-nums">{formatPrice(view.order.totalPrice, lang)}</span>
            </div>
          </div>
          <aside className="bg-secondary p-6 h-fit space-y-6 text-sm">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Клиент</div>
              <div>{view.user.name}</div>
              <div className="text-muted-foreground">{view.user.email}</div>
              <div className="text-muted-foreground">{view.user.phone ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Доставка</div>
              <div>{DELIVERY_LABEL[view.order.deliveryMethod]}</div>
              <div className="text-muted-foreground">
                {view.order.address.city}, {view.order.address.addressLine}, {view.order.address.postalCode}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Оплата</div>
              <div>{PAYMENT_LABEL[view.order.paymentMethod]}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Статус</div>
              <select
                value={view.order.status}
                onChange={async (e) => {
                  const updated = await api.adminUpdateOrder(view.order.id, e.target.value as OrderStatus);
                  setView({ kind: "order", user: view.user, order: updated });
                  refresh();
                }}
                className="w-full bg-background border border-border px-3 py-2"
              >
                {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
