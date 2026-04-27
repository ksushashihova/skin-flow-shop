import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { api, type User } from "@/lib/api";

const NAV_LINKS = [
  { to: "/shop" as const, key: "nav.shop" as const },
  { to: "/about" as const, key: "nav.about" as const },
  { to: "/journal" as const, key: "nav.journal" as const },
];

export function SiteHeader() {
  const { t, lang, setLang } = useI18n();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);

  const refresh = async () => {
    setUser(await api.me());
    const c = await api.getCart();
    setCount(c.reduce((s, i) => s + i.quantity, 0));
  };

  useEffect(() => {
    refresh();
    const i = setInterval(refresh, 1500);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 bg-background/85 backdrop-blur border-b border-border">
      <div className="container-rhode grid grid-cols-3 items-center h-16">
        {/* left: nav (desktop) / burger (mobile) */}
        <div className="flex items-center">
          <button
            onClick={() => setOpen(true)}
            aria-label="Меню"
            className="md:hidden flex flex-col gap-[5px] p-2 -ml-2"
          >
            <span className="w-5 h-px bg-foreground" />
            <span className="w-5 h-px bg-foreground" />
            <span className="w-5 h-px bg-foreground" />
          </button>
          <nav className="hidden md:flex items-center gap-8 text-sm">
            {NAV_LINKS.map((l) => (
              <Link key={l.to} to={l.to} className="hover-underline" activeProps={{ className: "font-medium" }}>
                {t(l.key)}
              </Link>
            ))}
          </nav>
        </div>

        {/* center: logo */}
        <div className="flex justify-center">
          <Link to="/" className="font-display text-2xl tracking-tight">
            ОБЛАКО
          </Link>
        </div>

        {/* right: actions */}
        <div className="flex items-center justify-end gap-5 text-sm">
          <button
            onClick={() => setLang(lang === "ru" ? "en" : "ru")}
            className="hidden sm:inline uppercase tracking-widest text-xs hover-underline"
          >
            {lang === "ru" ? "EN" : "RU"}
          </button>
          {user?.role === "admin" && (
            <Link to="/admin" className="hidden md:inline hover-underline">{t("nav.admin")}</Link>
          )}
          <Link to="/account" className="hidden md:inline hover-underline">
            {user ? user.name.split(" ")[0] : t("nav.account")}
          </Link>
          <Link to="/cart" className="hover-underline">
            {t("nav.cart")} ({count})
          </Link>
        </div>
      </div>

      {/* mobile drawer */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-[60] md:hidden transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm" />
        <aside
          onClick={(e) => e.stopPropagation()}
          className={`absolute right-0 top-0 h-full w-[86%] max-w-sm bg-background shadow-2xl transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"} flex flex-col`}
        >
          {/* header */}
          <div className="flex items-center justify-between px-6 h-16 border-b border-border">
            <span className="font-display text-xl tracking-tight">ОБЛАКО</span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Закрыть"
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-secondary transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 2L14 14M14 2L2 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* user pill */}
          <div className="px-6 pt-5 pb-4 border-b border-border">
            {user ? (
              <Link
                to="/account"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 group"
              >
                <span className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-display text-base">
                  {user.name.charAt(0)}
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-medium">{user.name}</span>
                  <span className="text-xs text-muted-foreground">{user.email}</span>
                </span>
              </Link>
            ) : (
              <Link
                to="/account"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between px-4 py-3 rounded-full bg-foreground text-background text-sm uppercase tracking-widest"
              >
                <span>{t("auth.login")}</span>
                <span>→</span>
              </Link>
            )}
          </div>

          {/* main nav */}
          <nav className="flex-1 overflow-y-auto px-2 py-4">
            <ul className="flex flex-col">
              {NAV_LINKS.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between px-4 py-4 rounded-lg text-foreground hover:bg-secondary transition-colors"
                  >
                    <span className="font-display text-xl">{t(l.key)}</span>
                    <span className="text-muted-foreground text-sm">→</span>
                  </Link>
                </li>
              ))}

              <li className="mt-2 mb-1 px-4 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                Кабинет
              </li>
              <li>
                <Link
                  to="/cart"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-secondary transition-colors"
                >
                  <span className="text-base">{t("nav.cart")}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/account"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-secondary transition-colors"
                >
                  <span className="text-base">{t("nav.account")}</span>
                  <span className="text-muted-foreground text-sm">→</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-secondary transition-colors"
                >
                  <span className="text-base">Политика конфиденциальности</span>
                  <span className="text-muted-foreground text-sm">→</span>
                </Link>
              </li>
              {user?.role === "admin" && (
                <li>
                  <Link
                    to="/admin"
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between px-4 py-3 rounded-lg bg-secondary/60 hover:bg-secondary transition-colors"
                  >
                    <span className="text-base font-medium">{t("nav.admin")}</span>
                    <span className="text-muted-foreground text-sm">→</span>
                  </Link>
                </li>
              )}
            </ul>
          </nav>

          {/* footer actions */}
          <div className="px-6 py-5 border-t border-border flex items-center justify-between gap-4">
            <button
              onClick={() => setLang(lang === "ru" ? "en" : "ru")}
              className="flex items-center gap-2 text-xs uppercase tracking-widest"
            >
              <span className={lang === "ru" ? "font-semibold" : "text-muted-foreground"}>RU</span>
              <span className="text-muted-foreground">/</span>
              <span className={lang === "en" ? "font-semibold" : "text-muted-foreground"}>EN</span>
            </button>
            {user && (
              <button
                onClick={async () => { await api.logout(); setOpen(false); router.invalidate(); }}
                className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
              >
                {t("auth.logout")}
              </button>
            )}
          </div>
        </aside>
      </div>
    </header>
  );
}

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
            <li><Link to="/about" className="hover-underline">О бренде</Link></li>
            <li><Link to="/journal" className="hover-underline">Журнал</Link></li>
          </ul>
        </div>
        <div>
          <div className="uppercase text-xs tracking-widest mb-3 text-muted-foreground">Помощь</div>
          <ul className="space-y-2">
            <li><Link to="/account" className="hover-underline">Личный кабинет</Link></li>
            <li><Link to="/privacy" className="hover-underline">Политика конфиденциальности</Link></li>
          </ul>
        </div>
        <div>
          <div className="uppercase text-xs tracking-widest mb-3 text-muted-foreground">Контакт</div>
          <p className="text-muted-foreground">support@oblako.ru</p>
        </div>
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
