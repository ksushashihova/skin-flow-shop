import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api, type Order, type OrderStatus, type User, type Product, type ProductCategory, type Post, type Review, type Bundle, type GiftCard, type Subscriber, type PromoCode, type Banner } from "@/lib/api";
import { useI18n, formatPrice } from "@/lib/i18n";
import { S3ImageUpload } from "@/components/admin/s3-image-upload";

// Виджет для управления массивом изображений: загрузка в S3 + ручной ввод URL
function ImagesArrayUpload({
  folder,
  value,
  onChange,
}: {
  folder: string;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="space-y-3">
      <S3ImageUpload
        folder={folder}
        label="Загрузить и добавить в список"
        onChange={(url) => onChange([...(value ?? []), url])}
      />
      <textarea
        value={(value ?? []).join("\n")}
        onChange={(e) => onChange(e.target.value.split(/\n+/).map((s) => s.trim()).filter(Boolean))}
        rows={3}
        placeholder="https://..."
        className="w-full bg-background border border-border px-3 py-3 font-mono text-xs"
      />
      {value && value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((src, i) => (
            <div key={i} className="relative group">
              <img src={src} alt="" className="w-20 h-20 object-cover bg-muted border border-border" />
              <button
                type="button"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground w-6 h-6 text-xs rounded-full opacity-0 group-hover:opacity-100 transition"
                title="Удалить"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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

type Tab = "orders" | "users" | "products" | "categories" | "posts" | "reviews" | "bundles" | "banners" | "gift" | "promos" | "subs";

type OrdersView =
  | { kind: "list" }
  | { kind: "order"; order: Order };

type UsersView =
  | { kind: "list" }
  | { kind: "user"; user: User }
  | { kind: "order"; user: User; order: Order };

function Admin() {
  const { lang } = useI18n();
  const [me, setMe] = useState<User | null>(null);
  const [tab, setTab] = useState<Tab>("orders");

  useEffect(() => { api.me().then(setMe); }, []);

  if (!me) return <div className="container-rhode py-32 text-center text-muted-foreground">Войдите как администратор.</div>;
  if (me.role !== "admin") return <div className="container-rhode py-32 text-center text-muted-foreground">Доступ только для администраторов.</div>;

  const TABS: { id: Tab; label: string }[] = [
    { id: "orders", label: "Заказы" },
    { id: "users", label: "Пользователи" },
    { id: "products", label: "Товары" },
    { id: "categories", label: "Категории" },
    { id: "posts", label: "Журнал" },
    { id: "reviews", label: "Отзывы" },
    { id: "bundles", label: "Наборы" },
    { id: "banners", label: "Баннеры" },
    { id: "gift", label: "Сертификаты" },
    { id: "promos", label: "Промокоды" },
    { id: "subs", label: "Подписчики" },
  ];

  return (
    <div className="container-rhode py-12 md:py-16">
      <div className="flex items-start justify-between mb-10 gap-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Панель администратора</div>
          <h1 className="font-display text-4xl md:text-5xl">ОБЛАКО · Admin</h1>
        </div>
        <button
          onClick={async () => { await api.logout(); window.location.href = "/"; }}
          className="text-xs uppercase tracking-widest border border-foreground px-5 py-3 hover:bg-foreground hover:text-background transition-colors"
        >
          Выйти
        </button>
      </div>

      <div className="flex gap-2 md:gap-6 border-b border-border mb-10 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-sm uppercase tracking-widest whitespace-nowrap transition-colors ${
              tab === t.id ? "text-foreground border-b-2 border-foreground -mb-px" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "orders" && <OrdersPanel lang={lang} switchToUser={(u) => { setTab("users"); /* user view handled below */ window.dispatchEvent(new CustomEvent("admin-open-user", { detail: u })); }} />}
      {tab === "users" && <UsersPanel lang={lang} />}
      {tab === "products" && <ProductsPanel />}
      {tab === "categories" && <CategoriesPanel />}
      {tab === "posts" && <PostsPanel />}
      {tab === "reviews" && <ReviewsPanel />}
      {tab === "bundles" && <BundlesPanel />}
      {tab === "banners" && <BannersPanel />}
      {tab === "gift" && <GiftCardsPanel lang={lang} />}
      {tab === "promos" && <PromosPanel lang={lang} />}
      {tab === "subs" && <SubscribersPanel />}
    </div>
  );
}

/* ------------------------------ ORDERS ------------------------------ */

function OrdersPanel({ lang, switchToUser }: { lang: "ru" | "en"; switchToUser: (u: User) => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [view, setView] = useState<OrdersView>({ kind: "list" });

  const refresh = async () => {
    setOrders(await api.adminListOrders());
    setUsers(await api.adminListUsers());
  };
  useEffect(() => {
    refresh();
    const i = setInterval(refresh, 2000);
    return () => clearInterval(i);
  }, []);

  const userOf = (uid: string) => users.find((u) => u.id === uid);

  if (view.kind === "list") {
    return (
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Все заказы · {orders.length}</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="text-xs uppercase tracking-widest text-muted-foreground border-b border-border">
              <tr>
                <th className="text-left py-3">№</th>
                <th className="text-left">Дата</th>
                <th className="text-left">Клиент</th>
                <th className="text-left">Сумма</th>
                <th className="text-left">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">Заказов пока нет</td></tr>
              )}
              {orders.map((o) => {
                const u = userOf(o.userId);
                return (
                  <tr key={o.id} className="hover:bg-secondary">
                    <td className="py-4">
                      <button onClick={() => setView({ kind: "order", order: o })} className="hover-underline">{o.id}</button>
                    </td>
                    <td className="text-muted-foreground">{new Date(o.createdAt).toLocaleString("ru-RU")}</td>
                    <td>
                      {u ? (
                        <button onClick={() => switchToUser(u)} className="hover-underline text-left">
                          {u.name}
                        </button>
                      ) : o.userEmail}
                    </td>
                    <td className="tabular-nums">{formatPrice(o.totalPrice, lang)}</td>
                    <td className="uppercase text-xs tracking-widest">{STATUS_LABEL[o.status]}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const u = userOf(view.order.userId);
  return (
    <div>
      <button onClick={() => setView({ kind: "list" })} className="text-xs uppercase tracking-widest text-muted-foreground hover-underline mb-6">← К списку заказов</button>
      <OrderDetail
        order={view.order}
        user={u}
        lang={lang}
        onUpdate={async (status) => {
          const updated = await api.adminUpdateOrder(view.order.id, status);
          setView({ kind: "order", order: updated });
          refresh();
        }}
        onUserClick={u ? () => switchToUser(u) : undefined}
      />
    </div>
  );
}

/* ------------------------------ USERS ------------------------------ */

function UsersPanel({ lang }: { lang: "ru" | "en" }) {
  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [view, setView] = useState<UsersView>({ kind: "list" });

  const refresh = async () => {
    setUsers(await api.adminListUsers());
    setOrders(await api.adminListOrders());
  };
  useEffect(() => { refresh(); }, []);

  // Listen for cross-panel "open user"
  useEffect(() => {
    const h = (e: Event) => {
      const u = (e as CustomEvent).detail as User;
      if (u) setView({ kind: "user", user: u });
    };
    window.addEventListener("admin-open-user", h);
    return () => window.removeEventListener("admin-open-user", h);
  }, []);

  const ordersByUser = (uid: string) => orders.filter((o) => o.userId === uid);

  if (view.kind === "list") {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="text-xs uppercase tracking-widest text-muted-foreground border-b border-border">
            <tr>
              <th className="text-left py-3">Имя</th>
              <th className="text-left">Email</th>
              <th className="text-left">Телефон</th>
              <th className="text-left">Роль</th>
              <th className="text-left">Заказов</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => (
              <tr key={u.id} onClick={() => setView({ kind: "user", user: u })} className="cursor-pointer hover:bg-secondary">
                <td className="py-4 hover-underline">{u.name}</td>
                <td>{u.email}</td>
                <td className="text-muted-foreground">{u.phone ?? "—"}</td>
                <td className="uppercase text-xs tracking-widest">{u.role}</td>
                <td className="tabular-nums">{ordersByUser(u.id).length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (view.kind === "user") {
    const list = ordersByUser(view.user.id);
    return (
      <div>
        <button onClick={() => setView({ kind: "list" })} className="text-xs uppercase tracking-widest text-muted-foreground hover-underline mb-6">← К списку пользователей</button>
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
            {list.length === 0 && (
              <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">У пользователя нет заказов</td></tr>
            )}
            {list.map((o) => (
              <tr key={o.id} onClick={() => setView({ kind: "order", user: view.user, order: o })} className="cursor-pointer hover:bg-secondary">
                <td className="py-4 hover-underline">{o.id}</td>
                <td className="text-muted-foreground">{new Date(o.createdAt).toLocaleString("ru-RU")}</td>
                <td className="tabular-nums">{formatPrice(o.totalPrice, lang)}</td>
                <td className="uppercase text-xs tracking-widest">{STATUS_LABEL[o.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => setView({ kind: "user", user: view.user })} className="text-xs uppercase tracking-widest text-muted-foreground hover-underline mb-6">← К заказам {view.user.name}</button>
      <OrderDetail
        order={view.order}
        user={view.user}
        lang={lang}
        onUpdate={async (status) => {
          const updated = await api.adminUpdateOrder(view.order.id, status);
          setView({ kind: "order", user: view.user, order: updated });
          refresh();
        }}
      />
    </div>
  );
}

/* ----------------------------- ORDER DETAIL ----------------------------- */

function OrderDetail({
  order, user, lang, onUpdate, onUserClick,
}: {
  order: Order;
  user: User | undefined;
  lang: "ru" | "en";
  onUpdate: (status: OrderStatus) => void | Promise<void>;
  onUserClick?: () => void;
}) {
  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-12">
      <div>
        <div className="font-display text-3xl mb-2">Заказ № {order.id}</div>
        <div className="text-xs text-muted-foreground mb-8">{new Date(order.createdAt).toLocaleString("ru-RU")}</div>
        <ul className="divide-y divide-border border-y border-border">
          {order.items.map((it) => (
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
          <span className="tabular-nums">{order.deliveryPrice ? formatPrice(order.deliveryPrice, lang) : "Бесплатно"}</span>
        </div>
        <div className="mt-2 flex justify-between font-display text-2xl">
          <span>Итого</span>
          <span className="tabular-nums">{formatPrice(order.totalPrice, lang)}</span>
        </div>
      </div>
      <aside className="bg-secondary p-6 h-fit space-y-6 text-sm">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Клиент</div>
          {onUserClick ? (
            <button onClick={onUserClick} className="hover-underline text-left">{user?.name ?? order.userEmail}</button>
          ) : (
            <div>{user?.name ?? order.userEmail}</div>
          )}
          <div className="text-muted-foreground">{user?.email ?? order.userEmail}</div>
          <div className="text-muted-foreground">{user?.phone ?? "—"}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Доставка</div>
          <div>{DELIVERY_LABEL[order.deliveryMethod]}</div>
          <div className="text-muted-foreground">
            {order.address.city}, {order.address.addressLine}, {order.address.postalCode}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Оплата</div>
          <div>{PAYMENT_LABEL[order.paymentMethod]}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Статус</div>
          <select
            value={order.status}
            onChange={(e) => onUpdate(e.target.value as OrderStatus)}
            className="w-full bg-background border border-border px-3 py-2"
          >
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </div>
      </aside>
    </div>
  );
}

/* ----------------------------- PRODUCTS ----------------------------- */

const EMPTY_PRODUCT: Omit<Product, "id"> = {
  slug: "",
  name_ru: "",
  name_en: "",
  tagline_ru: "",
  tagline_en: "",
  description_ru: "",
  description_en: "",
  price: 0,
  images: [""],
  stock: 0,
  category: "",
  videoUrl: "",
  howToUse: "",
};

function ProductsPanel() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [filterCat, setFilterCat] = useState<string>("");
  const [search, setSearch] = useState("");

  const refresh = async () => {
    setProducts(await api.listProducts());
    setCategories(await api.listCategories());
  };
  useEffect(() => {
    refresh();
    const i = setInterval(refresh, 2000);
    return () => clearInterval(i);
  }, []);

  const catName = (id: string) => categories.find((c) => c.id === id)?.name_ru ?? id;

  if (creating) {
    return (
      <ProductForm
        initial={{ ...EMPTY_PRODUCT, id: "", category: categories[0]?.id ?? "" } as Product}
        categories={categories}
        title="Новый товар"
        onCancel={() => setCreating(false)}
        onSave={async (data) => {
          const { id: _id, ...rest } = data;
          void _id;
          await api.adminCreateProduct(rest);
          setCreating(false);
          refresh();
        }}
      />
    );
  }
  if (editing) {
    return (
      <ProductForm
        initial={editing}
        categories={categories}
        title={`Редактировать: ${editing.name_ru}`}
        onCancel={() => setEditing(null)}
        onSave={async (data) => {
          await api.adminUpdateProduct(editing.id, data);
          setEditing(null);
          refresh();
        }}
      />
    );
  }

  const q = search.trim().toLowerCase();
  const visible = products.filter((p) => {
    if (filterCat && p.category !== filterCat) return false;
    if (q && ![p.name_ru, p.name_en, p.tagline_ru, p.tagline_en].some((t) => t.toLowerCase().includes(q))) return false;
    return true;
  });

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          Каталог · {visible.length} / {products.length}
        </div>
        <button
          onClick={() => setCreating(true)}
          className="text-xs uppercase tracking-widest bg-foreground text-background px-5 py-3 hover:opacity-90 self-start md:self-auto"
        >
          + Добавить товар
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по названию"
          className="flex-1 bg-background border border-border px-3 py-2 text-sm"
        />
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="bg-background border border-border px-3 py-2 text-sm md:min-w-[220px]"
        >
          <option value="">Все категории</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name_ru}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visible.map((p) => (
          <div key={p.id} className="border border-border p-4 flex gap-4">
            <img src={p.images[0]} alt="" className="w-24 h-28 object-cover bg-muted shrink-0" />
            <div className="flex-1 min-w-0 flex flex-col">
              <div className="font-display text-lg leading-tight line-clamp-2">{p.name_ru}</div>
              <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.tagline_ru}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{catName(p.category)}</div>
              <div className="mt-auto flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="tabular-nums">{p.price} ₽</div>
                  <div className="text-muted-foreground">остаток: {p.stock}</div>
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => setEditing(p)} className="hover-underline">Изменить</button>
                  <button
                    onClick={async () => { if (confirm("Удалить товар?")) { await api.adminDeleteProduct(p.id); refresh(); } }}
                    className="text-destructive hover:opacity-70"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------- CATEGORIES ----------------------------- */

function CategoriesPanel() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [nameRu, setNameRu] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setCategories(await api.listCategories());
    setProducts(await api.listProducts());
  };
  useEffect(() => { refresh(); }, []);

  const countOf = (id: string) => products.filter((p) => p.category === id).length;

  const create = async () => {
    setError(null);
    if (!nameRu.trim()) { setError("Укажите название"); return; }
    try {
      await api.adminCreateCategory({ name_ru: nameRu.trim(), name_en: nameEn.trim() || nameRu.trim() });
      setNameRu(""); setNameEn("");
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Удалить категорию?")) return;
    try {
      await api.adminDeleteCategory(id);
      refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка");
    }
  };

  const rename = async (id: string, patch: Partial<Pick<ProductCategory, "name_ru" | "name_en">>) => {
    await api.adminUpdateCategory(id, patch);
    refresh();
  };

  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground mb-6">Категории · {categories.length}</div>

      <div className="border border-border p-5 mb-8 max-w-xl">
        <div className="font-display text-xl mb-4">Новая категория</div>
        <div className="grid md:grid-cols-2 gap-3">
          <input
            value={nameRu}
            onChange={(e) => setNameRu(e.target.value)}
            placeholder="Название (рус)"
            className="bg-background border border-border px-3 py-2 text-sm"
          />
          <input
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            placeholder="Название (англ)"
            className="bg-background border border-border px-3 py-2 text-sm"
          />
        </div>
        {error && <div className="text-destructive text-xs mt-2">{error}</div>}
        <button
          onClick={create}
          className="mt-4 text-xs uppercase tracking-widest bg-foreground text-background px-5 py-2 hover:opacity-90"
        >
          + Добавить
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead className="text-xs uppercase tracking-widest text-muted-foreground border-b border-border">
            <tr>
              <th className="text-left py-3">ID</th>
              <th className="text-left">Название (рус)</th>
              <th className="text-left">Название (англ)</th>
              <th className="text-left">Товаров</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {categories.map((c) => (
              <tr key={c.id}>
                <td className="py-3 font-mono text-xs text-muted-foreground">{c.id}</td>
                <td>
                  <input
                    defaultValue={c.name_ru}
                    onBlur={(e) => { if (e.target.value !== c.name_ru) rename(c.id, { name_ru: e.target.value }); }}
                    className="bg-background border border-border px-2 py-1 w-full"
                  />
                </td>
                <td>
                  <input
                    defaultValue={c.name_en}
                    onBlur={(e) => { if (e.target.value !== c.name_en) rename(c.id, { name_en: e.target.value }); }}
                    className="bg-background border border-border px-2 py-1 w-full"
                  />
                </td>
                <td className="tabular-nums">{countOf(c.id)}</td>
                <td className="text-right">
                  <button onClick={() => remove(c.id)} className="text-destructive hover:opacity-70 text-xs">Удалить</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductForm({
  initial, categories, title, onCancel, onSave,
}: {
  initial: Product;
  categories: ProductCategory[];
  title: string;
  onCancel: () => void;
  onSave: (data: Product) => void | Promise<void>;
}) {
  const [data, setData] = useState<Product>(initial);
  const set = <K extends keyof Product>(k: K, v: Product[K]) => setData((d) => ({ ...d, [k]: v }));

  return (
    <div>
      <button onClick={onCancel} className="text-xs uppercase tracking-widest text-muted-foreground hover-underline mb-6">← Отмена</button>
      <h2 className="font-display text-3xl mb-8">{title}</h2>
      <div className="grid md:grid-cols-2 gap-6">
        <Field label="Название (рус)" value={data.name_ru} onChange={(v) => set("name_ru", v)} />
        <Field label="Название (англ)" value={data.name_en} onChange={(v) => set("name_en", v)} />
        <Field label="Слоган (рус)" value={data.tagline_ru} onChange={(v) => set("tagline_ru", v)} />
        <Field label="Слоган (англ)" value={data.tagline_en} onChange={(v) => set("tagline_en", v)} />
        <Field label="Цена, ₽" type="number" value={String(data.price)} onChange={(v) => set("price", Number(v) || 0)} />
        <Field label="Количество на складе" type="number" value={String(data.stock)} onChange={(v) => set("stock", Number(v) || 0)} />
        <div className="md:col-span-2">
          <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">Категория</label>
          <select
            value={data.category}
            onChange={(e) => set("category", e.target.value)}
            className="w-full bg-background border border-border px-3 py-3"
          >
            {categories.length === 0 && <option value="">— нет категорий —</option>}
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name_ru}</option>
            ))}
          </select>
          <div className="text-xs text-muted-foreground mt-2">
            Управлять списком категорий можно во вкладке «Категории».
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">Изображения товара</label>
          <ImagesArrayUpload folder="products" value={data.images} onChange={(next) => set("images", next)} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">Описание (рус)</label>
          <textarea
            value={data.description_ru}
            onChange={(e) => set("description_ru", e.target.value)}
            rows={4}
            className="w-full bg-background border border-border px-3 py-3"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">Описание (англ)</label>
          <textarea
            value={data.description_en}
            onChange={(e) => set("description_en", e.target.value)}
            rows={4}
            className="w-full bg-background border border-border px-3 py-3"
          />
        </div>
        <Field label="Видео-обзор (URL)" value={data.videoUrl ?? ""} onChange={(v) => set("videoUrl", v)} />
        <div />
        <div className="md:col-span-2">
          <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">Как использовать</label>
          <textarea
            value={data.howToUse ?? ""}
            onChange={(e) => set("howToUse", e.target.value)}
            rows={3}
            className="w-full bg-background border border-border px-3 py-3"
            placeholder="Нанесите утром и вечером на очищенную кожу..."
          />
        </div>
      </div>
      <div className="flex gap-3 mt-8">
        <button
          onClick={() => onSave(data)}
          className="text-xs uppercase tracking-widest bg-foreground text-background px-6 py-3 hover:opacity-90"
        >
          Сохранить
        </button>
        <button onClick={onCancel} className="text-xs uppercase tracking-widest border border-border px-6 py-3 hover:bg-secondary">
          Отмена
        </button>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-background border border-border px-3 py-3"
      />
    </div>
  );
}

/* ------------------------------ POSTS ------------------------------ */

const EMPTY_POST: Post = {
  slug: "",
  title: "",
  excerpt: "",
  cover: "",
  category: "Ритуалы",
  date: new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }),
  body: [""],
  images: [],
  videoUrl: "",
};

function PostsPanel() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [editing, setEditing] = useState<Post | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = async () => setPosts(await api.listPosts());
  useEffect(() => { refresh(); }, []);

  if (creating) {
    return (
      <PostForm
        initial={EMPTY_POST}
        title="Новая статья"
        onCancel={() => setCreating(false)}
        onSave={async (data) => {
          const { slug: _slug, ...rest } = data;
          await api.adminCreatePost({ ...rest, slug: _slug || undefined });
          setCreating(false);
          refresh();
        }}
      />
    );
  }
  if (editing) {
    return (
      <PostForm
        initial={editing}
        title={`Редактировать: ${editing.title}`}
        onCancel={() => setEditing(null)}
        onSave={async (data) => {
          await api.adminUpdatePost(editing.slug, data);
          setEditing(null);
          refresh();
        }}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Статей · {posts.length}</div>
        <button
          onClick={() => setCreating(true)}
          className="text-xs uppercase tracking-widest bg-foreground text-background px-5 py-3 hover:opacity-90"
        >
          + Добавить статью
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((p) => (
          <div key={p.slug} className="border border-border flex flex-col">
            <div className="aspect-[4/3] overflow-hidden bg-muted">
              <img src={p.cover} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="p-4 flex flex-col flex-1">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">{p.category} · {p.date}</div>
              <div className="font-display text-lg mt-1 line-clamp-2">{p.title}</div>
              <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.excerpt}</div>
              <div className="mt-4 flex justify-between text-xs">
                <button onClick={() => setEditing(p)} className="hover-underline">Изменить</button>
                <button
                  onClick={async () => { if (confirm("Удалить статью?")) { await api.adminDeletePost(p.slug); refresh(); } }}
                  className="text-destructive hover:opacity-70"
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PostForm({
  initial, title, onCancel, onSave,
}: {
  initial: Post;
  title: string;
  onCancel: () => void;
  onSave: (data: Post) => void | Promise<void>;
}) {
  const [data, setData] = useState<Post>(initial);
  const set = <K extends keyof Post>(k: K, v: Post[K]) => setData((d) => ({ ...d, [k]: v }));

  return (
    <div>
      <button onClick={onCancel} className="text-xs uppercase tracking-widest text-muted-foreground hover-underline mb-6">← Отмена</button>
      <h2 className="font-display text-3xl mb-8">{title}</h2>
      <div className="grid md:grid-cols-2 gap-6">
        <Field label="Заголовок" value={data.title} onChange={(v) => set("title", v)} />
        <Field label="Slug (URL)" value={data.slug} onChange={(v) => set("slug", v)} />
        <Field label="Категория" value={data.category} onChange={(v) => set("category", v)} />
        <Field label="Дата" value={data.date} onChange={(v) => set("date", v)} />
        <div className="md:col-span-2">
          <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">Обложка</label>
          <S3ImageUpload folder="posts" value={data.cover} onChange={(url) => set("cover", url)} />
          <input
            value={data.cover}
            onChange={(e) => set("cover", e.target.value)}
            placeholder="или вставьте URL вручную"
            className="w-full bg-background border border-border px-3 py-3 mt-3 text-xs"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">Краткое описание</label>
          <textarea
            value={data.excerpt}
            onChange={(e) => set("excerpt", e.target.value)}
            rows={2}
            className="w-full bg-background border border-border px-3 py-3"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">Текст статьи (абзацы разделены пустой строкой)</label>
          <textarea
            value={data.body.join("\n\n")}
            onChange={(e) => set("body", e.target.value.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean))}
            rows={10}
            className="w-full bg-background border border-border px-3 py-3"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">
            Фотографии в статье (по одной ссылке в строке)
          </label>
          <textarea
            value={(data.images ?? []).join("\n")}
            onChange={(e) =>
              set(
                "images",
                e.target.value.split(/\n+/).map((s) => s.trim()).filter(Boolean),
              )
            }
            rows={4}
            placeholder="https://...
https://..."
            className="w-full bg-background border border-border px-3 py-3 text-sm"
          />
          {data.images && data.images.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {data.images.map((src, i) => (
                <img key={i} src={src} alt="" className="w-24 h-24 object-cover bg-muted" />
              ))}
            </div>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">
            Видео (YouTube, Vimeo или прямая ссылка на mp4)
          </label>
          <input
            value={data.videoUrl ?? ""}
            onChange={(e) => set("videoUrl", e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full bg-background border border-border px-3 py-3"
          />
        </div>
      </div>
      <div className="flex gap-3 mt-8">
        <button
          onClick={() => onSave(data)}
          className="text-xs uppercase tracking-widest bg-foreground text-background px-6 py-3 hover:opacity-90"
        >
          Сохранить
        </button>
        <button onClick={onCancel} className="text-xs uppercase tracking-widest border border-border px-6 py-3 hover:bg-secondary">
          Отмена
        </button>
      </div>
    </div>
  );
}

/* ----------------------------- REVIEWS ----------------------------- */

function ReviewsPanel() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const refresh = async () => {
    setReviews(await api.adminListReviews());
    setProducts(await api.listProducts());
  };
  useEffect(() => { refresh(); }, []);
  const productName = (id: string) => products.find((p) => p.id === id)?.name_ru ?? id;

  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Отзывы · {reviews.length}</div>
      <ul className="divide-y divide-border border-y border-border">
        {reviews.length === 0 && <li className="py-6 text-center text-muted-foreground text-sm">Отзывов пока нет</li>}
        {reviews.map((r) => (
          <li key={r.id} className="py-5 flex flex-col md:flex-row gap-4 md:items-start md:justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <span className="font-medium">{r.authorName}</span>
                <span className="text-yellow-500 text-sm">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("ru-RU")}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">Товар: {productName(r.productId)}</div>
              <p className="text-sm mt-2">{r.text}</p>
              {r.photos.length > 0 && (
                <div className="flex gap-2 mt-2">
                  {r.photos.map((src, i) => <img key={i} src={src} alt="" className="w-14 h-14 object-cover" />)}
                </div>
              )}
            </div>
            <button
              onClick={async () => { if (confirm("Удалить отзыв?")) { await api.adminDeleteReview(r.id); refresh(); } }}
              className="text-xs uppercase tracking-widest text-destructive hover:opacity-70 self-start"
            >
              Удалить
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ----------------------------- BUNDLES ----------------------------- */

const EMPTY_BUNDLE: Omit<Bundle, "id"> = {
  slug: "",
  name: "",
  description: "",
  productIds: [],
  cover: "",
  discountPercent: 10,
};

function BundlesPanel() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Bundle | null>(null);
  const [creating, setCreating] = useState(false);
  const refresh = async () => { setBundles(await api.listBundles()); setProducts(await api.listProducts()); };
  useEffect(() => { refresh(); }, []);

  if (creating) return <BundleForm initial={{ ...EMPTY_BUNDLE, id: "" } as Bundle} title="Новый набор" products={products}
    onCancel={() => setCreating(false)}
    onSave={async (d) => { const { id: _i, ...rest } = d; void _i; await api.adminCreateBundle(rest); setCreating(false); refresh(); }} />;
  if (editing) return <BundleForm initial={editing} title={`Редактировать: ${editing.name}`} products={products}
    onCancel={() => setEditing(null)}
    onSave={async (d) => { await api.adminUpdateBundle(editing.id, d); setEditing(null); refresh(); }} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Наборов · {bundles.length}</div>
        <button onClick={() => setCreating(true)} className="text-xs uppercase tracking-widest bg-foreground text-background px-5 py-3">+ Добавить набор</button>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bundles.map((b) => (
          <div key={b.id} className="border border-border flex flex-col">
            <div className="aspect-[4/3] bg-muted overflow-hidden">{b.cover && <img src={b.cover} alt="" className="w-full h-full object-cover" />}</div>
            <div className="p-4 flex-1 flex flex-col">
              <div className="font-display text-lg">{b.name}</div>
              <div className="text-xs text-muted-foreground mt-1">{b.productIds.length} товаров · −{b.discountPercent}%</div>
              <div className="mt-4 flex justify-between text-xs">
                <button onClick={() => setEditing(b)} className="hover-underline">Изменить</button>
                <button onClick={async () => { if (confirm("Удалить набор?")) { await api.adminDeleteBundle(b.id); refresh(); } }} className="text-destructive hover:opacity-70">Удалить</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BundleForm({ initial, title, products, onCancel, onSave }: {
  initial: Bundle; title: string; products: Product[]; onCancel: () => void; onSave: (d: Bundle) => void | Promise<void>;
}) {
  const [data, setData] = useState<Bundle>(initial);
  const set = <K extends keyof Bundle>(k: K, v: Bundle[K]) => setData((d) => ({ ...d, [k]: v }));
  const toggle = (id: string) => set("productIds", data.productIds.includes(id) ? data.productIds.filter((x) => x !== id) : [...data.productIds, id]);
  return (
    <div>
      <button onClick={onCancel} className="text-xs uppercase tracking-widest text-muted-foreground hover-underline mb-6">← Отмена</button>
      <h2 className="font-display text-3xl mb-8">{title}</h2>
      <div className="grid md:grid-cols-2 gap-6">
        <Field label="Название" value={data.name} onChange={(v) => set("name", v)} />
        <Field label="Slug" value={data.slug} onChange={(v) => set("slug", v)} />
        <Field label="Скидка, %" type="number" value={String(data.discountPercent)} onChange={(v) => set("discountPercent", Number(v) || 0)} />
        <Field label="Обложка (URL)" value={data.cover} onChange={(v) => set("cover", v)} />
        <div className="md:col-span-2">
          <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">Описание</label>
          <textarea value={data.description} onChange={(e) => set("description", e.target.value)} rows={3} className="w-full bg-background border border-border px-3 py-3" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">Товары в наборе</label>
          <div className="grid sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto border border-border p-3">
            {products.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={data.productIds.includes(p.id)} onChange={() => toggle(p.id)} />
                <span>{p.name_ru} <span className="text-muted-foreground">· {p.price}₽</span></span>
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-3 mt-8">
        <button onClick={() => onSave(data)} className="text-xs uppercase tracking-widest bg-foreground text-background px-6 py-3">Сохранить</button>
        <button onClick={onCancel} className="text-xs uppercase tracking-widest border border-border px-6 py-3">Отмена</button>
      </div>
    </div>
  );
}

/* ----------------------------- GIFT CARDS ----------------------------- */

function GiftCardsPanel({ lang }: { lang: "ru" | "en" }) {
  const [cards, setCards] = useState<GiftCard[]>([]);
  useEffect(() => {
    const refresh = async () => setCards(await api.adminListGiftCards());
    refresh();
    const i = setInterval(refresh, 2000);
    return () => clearInterval(i);
  }, []);
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Сертификатов · {cards.length}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="text-xs uppercase tracking-widest text-muted-foreground border-b border-border">
            <tr>
              <th className="text-left py-3">Код</th>
              <th className="text-left">Получатель</th>
              <th className="text-left">Номинал</th>
              <th className="text-left">Остаток</th>
              <th className="text-left">Дата</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {cards.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">Сертификатов пока нет</td></tr>}
            {cards.map((c) => {
              const fmt = (n: number) => new Intl.NumberFormat(lang === "ru" ? "ru-RU" : "en-US").format(n);
              return (
                <tr key={c.code}>
                  <td className="py-4 font-mono text-xs">{c.code}</td>
                  <td>{c.recipientEmail}</td>
                  <td className="tabular-nums">{fmt(c.amount)} ₽</td>
                  <td className={`tabular-nums ${c.remaining === 0 ? "text-muted-foreground" : ""}`}>{fmt(c.remaining)} ₽</td>
                  <td className="text-muted-foreground">{new Date(c.createdAt).toLocaleDateString("ru-RU")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ----------------------------- SUBSCRIBERS ----------------------------- */

function SubscribersPanel() {
  const [subs, setSubs] = useState<Subscriber[]>([]);
  useEffect(() => {
    const refresh = async () => setSubs(await api.adminListSubscribers());
    refresh();
    const i = setInterval(refresh, 2000);
    return () => clearInterval(i);
  }, []);
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Подписчиков · {subs.length}</div>
      <ul className="divide-y divide-border border-y border-border">
        {subs.length === 0 && <li className="py-6 text-center text-muted-foreground text-sm">Подписок пока нет</li>}
        {subs.map((s) => (
          <li key={s.email} className="py-4 flex justify-between text-sm">
            <span>{s.email}</span>
            <span className="text-muted-foreground">{s.promoCode} · {new Date(s.createdAt).toLocaleDateString("ru-RU")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ----------------------------- PROMOS ----------------------------- */

function PromosPanel({ lang }: { lang: "ru" | "en" }) {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [code, setCode] = useState("");
  const [percent, setPercent] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [usesLeft, setUsesLeft] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const refresh = async () => setPromos(await api.adminListPromos());
  useEffect(() => { refresh(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      await api.adminCreatePromo({
        code,
        percent: percent ? Number(percent) : undefined,
        amount: amount ? Number(amount) : undefined,
        description,
        usesLeft: usesLeft ? Number(usesLeft) : undefined,
      });
      setCode(""); setPercent(""); setAmount(""); setDescription(""); setUsesLeft("");
      refresh();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const fmt = (n: number) => new Intl.NumberFormat(lang === "ru" ? "ru-RU" : "en-US").format(n);

  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Промокоды · {promos.length}</div>

      <form onSubmit={submit} className="bg-secondary p-6 mb-8 grid md:grid-cols-5 gap-4">
        <Field label="Код" value={code} onChange={(v) => setCode(v.toUpperCase())} />
        <Field label="Скидка %" type="number" value={percent} onChange={setPercent} />
        <Field label="Скидка ₽" type="number" value={amount} onChange={setAmount} />
        <Field label="Использований" type="number" value={usesLeft} onChange={setUsesLeft} />
        <Field label="Описание" value={description} onChange={setDescription} />
        <div className="md:col-span-5 flex items-center gap-4">
          <button type="submit" className="text-xs uppercase tracking-widest bg-foreground text-background px-6 py-3">+ Добавить промокод</button>
          {err && <span className="text-xs text-destructive">{err}</span>}
        </div>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="text-xs uppercase tracking-widest text-muted-foreground border-b border-border">
            <tr>
              <th className="text-left py-3">Код</th>
              <th className="text-left">Скидка</th>
              <th className="text-left">Описание</th>
              <th className="text-left">Осталось</th>
              <th className="text-right">Действие</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {promos.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">Промокодов пока нет</td></tr>}
            {promos.map((p) => (
              <tr key={p.code}>
                <td className="py-4 font-mono">{p.code}</td>
                <td className="tabular-nums">
                  {p.percent ? `${p.percent}%` : null}
                  {p.amount ? `${fmt(p.amount)} ₽` : null}
                </td>
                <td className="text-muted-foreground">{p.description}</td>
                <td className="tabular-nums">{p.usesLeft ?? "∞"}</td>
                <td className="text-right">
                  <button
                    onClick={async () => { if (confirm(`Удалить промокод ${p.code}?`)) { await api.adminDeletePromo(p.code); refresh(); } }}
                    className="text-xs uppercase tracking-widest text-destructive hover:opacity-70"
                  >
                    Удалить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ----------------------------- BANNERS ----------------------------- */

const EMPTY_BANNER: Omit<Banner, "id"> = {
  title: "",
  subtitle: "",
  image: "",
  ctaLabel: "Подробнее",
  ctaHref: "/shop",
  textColor: "light",
  enabled: true,
  order: 1,
};

function BannersPanel() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = async () => setBanners(await api.adminListBanners());
  useEffect(() => { refresh(); }, []);

  if (creating) {
    return (
      <BannerForm
        initial={{ ...EMPTY_BANNER, id: "", order: banners.length + 1 } as Banner}
        title="Новый баннер"
        onCancel={() => setCreating(false)}
        onSave={async (data) => {
          const { id: _id, ...rest } = data;
          void _id;
          await api.adminCreateBanner(rest);
          setCreating(false);
          refresh();
        }}
      />
    );
  }

  if (editing) {
    return (
      <BannerForm
        initial={editing}
        title={`Редактировать: ${editing.title}`}
        onCancel={() => setEditing(null)}
        onSave={async (data) => {
          await api.adminUpdateBanner(editing.id, data);
          setEditing(null);
          refresh();
        }}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          Рекламные баннеры на главной · {banners.length}
        </div>
        <button
          onClick={() => setCreating(true)}
          className="text-xs uppercase tracking-widest bg-foreground text-background px-5 py-3"
        >
          + Добавить баннер
        </button>
      </div>
      <p className="text-xs text-muted-foreground mb-6">
        На главной странице отображаются первые 2 включённых баннера в порядке поля «Порядок».
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        {banners.length === 0 && (
          <div className="text-sm text-muted-foreground py-12 text-center md:col-span-2 border border-dashed border-border">
            Баннеров пока нет
          </div>
        )}
        {banners.map((b) => (
          <div key={b.id} className="border border-border overflow-hidden bg-background">
            <div className="relative aspect-[16/9] bg-muted">
              {b.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.image} alt={b.title} className="absolute inset-0 w-full h-full object-cover" />
              )}
              {!b.enabled && (
                <div className="absolute top-2 left-2 bg-foreground/80 text-background text-[10px] uppercase tracking-widest px-2 py-1">
                  Выключен
                </div>
              )}
            </div>
            <div className="p-4 space-y-2">
              <div className="font-display text-lg">{b.title || "Без названия"}</div>
              <div className="text-xs text-muted-foreground line-clamp-2">{b.subtitle}</div>
              <div className="text-xs text-muted-foreground">
                Ссылка: <span className="text-foreground">{b.ctaHref}</span> · Порядок: {b.order}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setEditing(b)}
                  className="text-xs uppercase tracking-widest hover-underline"
                >
                  Изменить
                </button>
                <button
                  onClick={async () => {
                    await api.adminUpdateBanner(b.id, { enabled: !b.enabled });
                    refresh();
                  }}
                  className="text-xs uppercase tracking-widest hover-underline"
                >
                  {b.enabled ? "Выключить" : "Включить"}
                </button>
                <button
                  onClick={async () => {
                    if (confirm(`Удалить баннер «${b.title}»?`)) {
                      await api.adminDeleteBanner(b.id);
                      refresh();
                    }
                  }}
                  className="text-xs uppercase tracking-widest text-destructive hover:opacity-70 ml-auto"
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BannerForm({
  initial, title, onCancel, onSave,
}: {
  initial: Banner;
  title: string;
  onCancel: () => void;
  onSave: (data: Banner) => void | Promise<void>;
}) {
  const [data, setData] = useState<Banner>(initial);
  const [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof Banner>(k: K, v: Banner[K]) => setData((d) => ({ ...d, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      if (!data.title.trim()) throw new Error("Введите заголовок");
      if (!data.image.trim()) throw new Error("Добавьте URL изображения");
      await onSave(data);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-3xl">{title}</h2>
        <button type="button" onClick={onCancel} className="text-xs uppercase tracking-widest hover-underline">
          ← Назад
        </button>
      </div>

      <Field label="Заголовок" value={data.title} onChange={(v) => set("title", v)} />
      <div>
        <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">Подзаголовок</label>
        <textarea
          value={data.subtitle}
          onChange={(e) => set("subtitle", e.target.value)}
          rows={2}
          className="w-full bg-background border border-border px-3 py-3"
        />
      </div>
      <Field label="URL изображения" value={data.image} onChange={(v) => set("image", v)} />
      {data.image && (
        <div className="aspect-[16/9] bg-muted overflow-hidden">
          <img src={data.image} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Текст кнопки" value={data.ctaLabel} onChange={(v) => set("ctaLabel", v)} />
        <Field label="Ссылка (href)" value={data.ctaHref} onChange={(v) => set("ctaHref", v)} />
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">Цвет текста</label>
          <select
            value={data.textColor}
            onChange={(e) => set("textColor", e.target.value as "light" | "dark")}
            className="w-full bg-background border border-border px-3 py-3"
          >
            <option value="light">Светлый</option>
            <option value="dark">Тёмный</option>
          </select>
        </div>
        <Field label="Порядок" type="number" value={String(data.order)} onChange={(v) => set("order", Number(v) || 0)} />
        <div>
          <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">Статус</label>
          <label className="flex items-center gap-2 h-[46px] px-3 border border-border bg-background">
            <input type="checkbox" checked={data.enabled} onChange={(e) => set("enabled", e.target.checked)} />
            <span className="text-sm">Показывать на сайте</span>
          </label>
        </div>
      </div>

      {err && <div className="text-sm text-destructive">{err}</div>}

      <div className="flex gap-4">
        <button type="submit" className="text-xs uppercase tracking-widest bg-foreground text-background px-6 py-3">
          Сохранить
        </button>
        <button type="button" onClick={onCancel} className="text-xs uppercase tracking-widest border border-border px-6 py-3">
          Отмена
        </button>
      </div>
    </form>
  );
}
