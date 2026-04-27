import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api, type Order, type OrderStatus, type User } from "@/lib/api";
import { useI18n, formatPrice } from "@/lib/i18n";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Администрирование — ОБЛАКО" }] }),
  component: Admin,
});

const STATUSES: OrderStatus[] = ["new", "paid", "shipped", "completed", "cancelled"];

function Admin() {
  const { t, lang } = useI18n();
  const [me, setMe] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tab, setTab] = useState<"orders" | "users">("orders");

  const refresh = async () => {
    const u = await api.me();
    setMe(u);
    if (u?.role === "admin") {
      setOrders(await api.adminListOrders());
      setUsers(await api.adminListUsers());
    }
  };
  useEffect(() => { refresh(); }, []);

  if (!me) return <div className="container-rhode py-32 text-center text-muted-foreground">Войдите как администратор.</div>;
  if (me.role !== "admin") return <div className="container-rhode py-32 text-center text-muted-foreground">Доступ только для администраторов.</div>;

  return (
    <div className="container-rhode py-16">
      <h1 className="font-display text-5xl mb-10">{t("admin.title")}</h1>
      <div className="flex gap-6 mb-10 border-b border-border">
        {(["orders", "users"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`pb-3 text-xs uppercase tracking-widest border-b-2 -mb-px ${
              tab === k ? "border-foreground" : "border-transparent text-muted-foreground"
            }`}
          >
            {k === "orders" ? t("admin.orders") : t("admin.users")}
          </button>
        ))}
      </div>

      {tab === "orders" && (
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-widest text-muted-foreground border-b border-border">
            <tr><th className="text-left py-3">№</th><th className="text-left">Email</th><th className="text-left">Сумма</th><th className="text-left">Статус</th><th className="text-left">Дата</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="py-4">{o.id}</td>
                <td>{o.userEmail}</td>
                <td className="tabular-nums">{formatPrice(o.totalPrice, lang)}</td>
                <td>
                  <select
                    value={o.status}
                    onChange={async (e) => {
                      await api.adminUpdateOrder(o.id, e.target.value as OrderStatus);
                      refresh();
                    }}
                    className="bg-transparent border border-border px-2 py-1"
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="text-muted-foreground">{new Date(o.createdAt).toLocaleString("ru-RU")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === "users" && (
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-widest text-muted-foreground border-b border-border">
            <tr><th className="text-left py-3">Имя</th><th className="text-left">Email</th><th className="text-left">Роль</th><th className="text-left">Создан</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="py-4">{u.name}</td>
                <td>{u.email}</td>
                <td className="uppercase text-xs tracking-widest">{u.role}</td>
                <td className="text-muted-foreground">{new Date(u.createdAt).toLocaleDateString("ru-RU")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
