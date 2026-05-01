import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { api, type User } from "@/lib/api";

const NAV_LINKS = [
  { to: "/shop" as const, key: "nav.shop" as const },
  { to: "/bundles" as const, key: "nav.bundles" as const },
  { to: "/quiz" as const, key: "nav.quiz" as const },
  { to: "/gift-cards" as const, key: "nav.gift" as const },
  { to: "/about" as const, key: "nav.about" as const },
  { to: "/journal" as const, key: "nav.journal" as const },
  { to: "/faq" as const, key: "nav.faq" as const },
];

/* ---------------------------------------------------------------- */
/*  shared chrome state hook                                         */
/* ---------------------------------------------------------------- */
function useChrome() {
  const [user, setUser] = useState<User | null>(null);
  const [count, setCount] = useState(0);
  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      const u = await api.me();
      const c = await api.getCart();
      if (!alive) return;
      setUser(u);
      setCount(c.reduce((s, i) => s + i.quantity, 0));
    };
    refresh();
    const i = setInterval(refresh, 2000);
    const onAuth = () => refresh();
    window.addEventListener("oblako-auth-change", onAuth);
    return () => {
      alive = false;
      clearInterval(i);
      window.removeEventListener("oblako-auth-change", onAuth);
    };
  }, []);
  return { user, count };
}

/* ---------------------------------------------------------------- */
/*  Универсальный мобильный drawer                                    */
/* ---------------------------------------------------------------- */
function MobileDrawer({
  open, onClose, user, count,
}: {
  open: boolean; onClose: () => void; user: User | null; count: number;
}) {
  const { t, lang, setLang } = useI18n();

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <div
      onClick={onClose}
      className={`fixed inset-0 z-[90] md:hidden transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div className="absolute inset-0 bg-foreground/55 backdrop-blur-sm" />
      <aside
        onClick={(e) => e.stopPropagation()}
        className={`absolute left-0 top-0 h-full w-[88%] max-w-[400px] bg-background shadow-2xl transition-transform duration-300 ease-out flex flex-col ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* header */}
        <div className="flex items-center justify-between px-7 h-16 border-b border-border shrink-0">
          <Link to="/" onClick={onClose} className="font-display text-xl tracking-tight">
            ОБЛАКО
          </Link>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="w-10 h-10 -mr-2 flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 2L14 14M14 2L2 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* nav */}
        <nav className="flex-1 overflow-y-auto py-2">
          <ul>
            {NAV_LINKS.map((l) => (
              <li key={l.to}>
                <Link
                  to={l.to}
                  onClick={onClose}
                  className="flex items-center px-7 py-4 font-display text-2xl text-foreground border-b border-border/60 hover:bg-secondary transition-colors"
                >
                  {t(l.key)}
                </Link>
              </li>
            ))}
            <li>
              <Link
                to="/cart"
                onClick={onClose}
                className="flex items-center justify-between px-7 py-4 font-display text-2xl text-foreground border-b border-border/60 hover:bg-secondary transition-colors"
              >
                <span>{t("nav.cart")}</span>
                <span className="text-sm text-muted-foreground tabular-nums">{count}</span>
              </Link>
            </li>
            <li>
              <Link
                to="/account"
                onClick={onClose}
                className="flex items-center px-7 py-4 font-display text-2xl text-foreground border-b border-border/60 hover:bg-secondary transition-colors"
              >
                {user ? user.name.split(" ")[0] : t("nav.account")}
              </Link>
            </li>
            {user?.role === "admin" && (
              <li>
                <Link
                  to="/admin"
                  onClick={onClose}
                  className="flex items-center px-7 py-4 font-display text-2xl text-foreground border-b border-border/60 hover:bg-secondary transition-colors"
                >
                  {t("nav.admin")}
                </Link>
              </li>
            )}
          </ul>
          <div className="px-7 pt-6 pb-2">
            <Link
              to="/privacy"
              onClick={onClose}
              className="block text-xs text-muted-foreground hover:text-foreground"
            >
              Политика конфиденциальности
            </Link>
          </div>
        </nav>

        {/* footer */}
        <div className="px-7 py-5 border-t border-border flex items-center justify-between gap-4 bg-secondary/40 shrink-0">
          <button
            onClick={() => setLang(lang === "ru" ? "en" : "ru")}
            className="flex items-center gap-2 text-[11px] uppercase tracking-[0.25em]"
          >
            <span className={lang === "ru" ? "font-semibold text-foreground" : "text-muted-foreground"}>RU</span>
            <span className="text-muted-foreground">/</span>
            <span className={lang === "en" ? "font-semibold text-foreground" : "text-muted-foreground"}>EN</span>
          </button>
          {user ? (
            <button
              onClick={async () => { await api.logout(); window.location.href = "/"; }}
              className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground"
            >
              {t("auth.logout")}
            </button>
          ) : (
            <Link
              to="/account"
              onClick={onClose}
              className="text-[11px] uppercase tracking-[0.25em] font-semibold"
            >
              {t("auth.login")}
            </Link>
          )}
        </div>
      </aside>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  Универсальный хедер. variant:                                    */
/*   • "solid"   — белый sticky header (внутренние страницы)         */
/*   • "overlay" — поверх hero, светлый текст (главная)              */
/* ---------------------------------------------------------------- */
export function SiteHeader({ variant = "solid" }: { variant?: "solid" | "overlay" }) {
  const { t, lang, setLang } = useI18n();
  const { user, count } = useChrome();
  const [open, setOpen] = useState(false);

  const isOverlay = variant === "overlay";

  const wrapperCls = isOverlay
    ? "absolute top-0 left-0 right-0 z-40 text-background"
    : "sticky top-0 z-40 bg-background/90 backdrop-blur border-b border-border text-foreground";

  const linkCls = isOverlay
    ? "hover:opacity-70 transition-opacity"
    : "hover-underline";

  const burgerColor = isOverlay ? "bg-background" : "bg-foreground";

  return (
    <header className={wrapperCls}>
      <div className={isOverlay ? "px-5 md:px-10" : "container-rhode"}>
        {/* MOBILE: одна строка с бургером, лого и корзиной */}
        <div className="grid grid-cols-3 items-center h-16 md:hidden">
          <div className="flex items-center">
            <button
              onClick={() => setOpen(true)}
              aria-label="Меню"
              className="flex flex-col gap-[5px] p-2 -ml-2"
            >
              <span className={`block w-5 h-px ${burgerColor}`} />
              <span className={`block w-5 h-px ${burgerColor}`} />
              <span className={`block w-5 h-px ${burgerColor}`} />
            </button>
          </div>
          <div className="flex justify-center">
            <Link to="/" className="font-display text-xl tracking-tight whitespace-nowrap">
              ОБЛАКО
            </Link>
          </div>
          <div className="flex items-center justify-end gap-4 text-xs uppercase tracking-[0.2em]">
            <Link to="/cart" className={`flex items-center gap-1 ${linkCls}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 7h12l-1 13H7L6 7z" />
                <path d="M9 7V5a3 3 0 0 1 6 0v2" />
              </svg>
              <span className="tabular-nums">({count})</span>
            </Link>
          </div>
        </div>

        {/* DESKTOP: лого сверху, под ним nav + actions */}
        <div className="hidden md:block">
          <div className="flex justify-center pt-5 pb-2">
            <Link to="/" className="font-display text-2xl lg:text-3xl tracking-tight whitespace-nowrap">
              ОБЛАКО
            </Link>
          </div>
          <div className="grid grid-cols-3 items-center h-12">
            <nav className="flex items-center gap-7 text-xs uppercase tracking-[0.2em]">
              {NAV_LINKS.slice(0, 5).map((l) => (
                <Link key={l.to} to={l.to} className={linkCls} activeProps={{ className: "font-semibold" }}>
                  {t(l.key)}
                </Link>
              ))}
            </nav>
            <div />
            <div className="flex items-center justify-end gap-6 text-xs uppercase tracking-[0.2em]">
              <button
                onClick={() => setLang(lang === "ru" ? "en" : "ru")}
                className={linkCls}
              >
                {lang === "ru" ? "EN" : "RU"}
              </button>
              {user?.role === "admin" && (
                <Link to="/admin" className={linkCls}>
                  {t("nav.admin")}
                </Link>
              )}
              <Link to="/account" className={linkCls}>
                {user ? user.name.split(" ")[0] : t("nav.account")}
              </Link>
              <Link to="/cart" className={`flex items-center gap-1 ${linkCls}`}>
                <span>{t("nav.cart")}</span>
                <span className="tabular-nums">({count})</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <MobileDrawer open={open} onClose={() => setOpen(false)} user={user} count={count} />
    </header>
  );
}

/* ---------------------------------------------------------------- */
/*  Footer                                                            */
/* ---------------------------------------------------------------- */
export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-border mt-32">
      <div className="container-rhode py-16 grid gap-10 md:grid-cols-4 text-sm">
        <div>
          <div className="font-display text-2xl mb-4">ОБЛАКО</div>
          <p className="text-muted-foreground max-w-xs">
            Российский бренд минималистичного ухода за кожей.
          </p>
        </div>
        <div>
          <div className="uppercase text-xs tracking-widest mb-3 text-muted-foreground">Магазин</div>
          <ul className="space-y-2">
            <li><Link to="/shop" className="hover-underline">Все товары</Link></li>
            <li><Link to="/bundles" className="hover-underline">Наборы</Link></li>
            <li><Link to="/gift-cards" className="hover-underline">Сертификаты</Link></li>
            <li><Link to="/quiz" className="hover-underline">Подбор ухода</Link></li>
          </ul>
        </div>
        <div>
          <div className="uppercase text-xs tracking-widest mb-3 text-muted-foreground">Помощь</div>
          <ul className="space-y-2">
            <li><Link to="/faq" className="hover-underline">Вопросы и ответы</Link></li>
            <li><Link to="/about" className="hover-underline">О бренде</Link></li>
            <li><Link to="/journal" className="hover-underline">Журнал</Link></li>
            <li><Link to="/account" className="hover-underline">Личный кабинет</Link></li>
            <li><Link to="/privacy" className="hover-underline">Политика конфиденциальности</Link></li>
          </ul>
        </div>
        <NewsletterWidget />
      </div>
      <div className="border-t border-border">
        <div className="container-rhode py-6 text-xs text-muted-foreground flex justify-between">
          <span>© {new Date().getFullYear()} ОБЛАКО</span>
          <span>{t("footer.rights")}</span>
        </div>
      </div>
    </footer>
  );
}

function NewsletterWidget() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<{ ok?: string; err?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState(null);
    setLoading(true);
    try {
      const r = await api.subscribe(email, consent);
      setState({ ok: `Промокод ${r.promo.code} — скидка 10%` });
      setEmail("");
    } catch (err) {
      setState({ err: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="uppercase text-xs tracking-widest mb-3 text-muted-foreground">Рассылка</div>
      <p className="text-muted-foreground text-xs mb-3">
        Подпишитесь и получите промокод <span className="text-foreground font-medium">WELCOME10</span> — −10% на первый заказ.
      </p>
      <form onSubmit={submit} className="space-y-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          className="w-full border-b border-border bg-transparent py-2 text-sm outline-none focus:border-foreground"
        />
        <label className="flex items-start gap-2 text-[11px] text-muted-foreground leading-snug">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required className="mt-0.5" />
          <span>Согласие на обработку персональных данных</span>
        </label>
        <button
          disabled={loading}
          className="w-full bg-foreground text-background py-2.5 text-[11px] uppercase tracking-[0.2em] disabled:opacity-50"
        >
          {loading ? "..." : "Подписаться"}
        </button>
        {state?.ok && <div className="text-xs text-foreground">{state.ok}</div>}
        {state?.err && <div className="text-xs text-destructive">{state.err}</div>}
      </form>
      <p className="text-[11px] text-muted-foreground mt-2">support@oblako.ru</p>
    </div>
  );
}
