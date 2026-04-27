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
        className={`fixed inset-0 z-50 bg-foreground/40 transition-opacity duration-300 md:hidden ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <aside
          onClick={(e) => e.stopPropagation()}
          className={`absolute right-0 top-0 h-full w-[88%] max-w-md bg-background shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"} flex flex-col`}
        >
          <div className="flex items-center justify-between px-6 h-20 border-b border-border">
            <span className="font-display text-2xl">ОБЛАКО</span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Закрыть"
              className="w-10 h-10 flex items-center justify-center text-3xl leading-none text-foreground hover:opacity-60"
            >
              ×
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-6 py-4">
            <ul className="divide-y divide-border">
              {NAV_LINKS.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between py-5 font-display text-2xl text-foreground"
                  >
                    <span>{t(l.key)}</span>
                    <span className="text-muted-foreground text-base">→</span>
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  to="/cart"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between py-5 font-display text-2xl text-foreground"
                >
                  <span>{t("nav.cart")}</span>
                  <span className="text-muted-foreground text-base tabular-nums">{count}</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/account"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between py-5 font-display text-2xl text-foreground"
                >
                  <span>{user ? user.name : t("nav.account")}</span>
                  <span className="text-muted-foreground text-base">→</span>
                </Link>
              </li>
              {user?.role === "admin" && (
                <li>
                  <Link
                    to="/admin"
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between py-5 font-display text-2xl text-foreground"
                  >
                    <span>{t("nav.admin")}</span>
                    <span className="text-muted-foreground text-base">→</span>
                  </Link>
                </li>
              )}
            </ul>
          </nav>

          <div className="px-6 py-6 border-t border-border flex items-center justify-between bg-secondary/50">
            <button
              onClick={() => setLang(lang === "ru" ? "en" : "ru")}
              className="text-sm uppercase tracking-widest font-medium"
            >
              {lang === "ru" ? "English" : "Русский"}
            </button>
            {user ? (
              <button
                onClick={async () => { await api.logout(); setOpen(false); router.invalidate(); }}
                className="text-sm uppercase tracking-widest text-muted-foreground hover:text-foreground"
              >
                {t("auth.logout")}
              </button>
            ) : (
              <Link
                to="/account"
                onClick={() => setOpen(false)}
                className="text-sm uppercase tracking-widest font-medium"
              >
                {t("auth.login")}
              </Link>
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
