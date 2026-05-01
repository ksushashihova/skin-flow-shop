import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { api, type User } from "@/lib/api";

const NAV_LINKS = [
  { to: "/shop" as const, key: "nav.shop" as const },
  { to: "/about" as const, key: "nav.about" as const },
  { to: "/journal" as const, key: "nav.journal" as const },
  { to: "/faq" as const, key: "nav.faq" as const },
];

function useChrome() {
  const [user, setUser] = useState<User | null>(null);
  const [count, setCount] = useState(0);
  useEffect(() => {
    const refresh = async () => {
      setUser(await api.me());
      const c = await api.getCart();
      setCount(c.reduce((s, i) => s + i.quantity, 0));
    };
    refresh();
    const i = setInterval(refresh, 1500);
    return () => clearInterval(i);
  }, []);
  return { user, count };
}

/** Drawer-меню слева, читаемое, со всеми пунктами */
function MobileDrawer({
  open, onClose, user, count, variant = "dark",
}: {
  open: boolean; onClose: () => void; user: User | null; count: number;
  variant?: "dark" | "light";
}) {
  const { t, lang, setLang } = useI18n();
  const router = useRouter();

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const linkBase = "block py-4 font-display text-3xl text-foreground hover:opacity-60 transition-opacity";

  return (
    <div
      onClick={onClose}
      className={`fixed inset-0 z-[80] md:hidden transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div className="absolute inset-0 bg-foreground/55 backdrop-blur-sm" />
      <aside
        onClick={(e) => e.stopPropagation()}
        className={`absolute left-0 top-0 h-full w-[88%] max-w-[420px] bg-background shadow-2xl transition-transform duration-300 ease-out ${open ? "translate-x-0" : "-translate-x-full"} flex flex-col`}
      >
        {/* header */}
        <div className="flex items-center justify-between px-7 h-20 border-b border-border">
          <Link to="/" onClick={onClose} className="font-display text-2xl tracking-tight">
            ОБЛАКО
          </Link>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-secondary transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <path d="M2 2L14 14M14 2L2 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* main nav */}
        <nav className="flex-1 overflow-y-auto px-7 py-6">
          <ul className="divide-y divide-border/70">
            {NAV_LINKS.map((l) => (
              <li key={l.to}>
                <Link to={l.to} onClick={onClose} className={linkBase}>
                  {t(l.key)}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/cart" onClick={onClose} className={linkBase + " flex items-center justify-between"}>
                <span>{t("nav.cart")}</span>
                <span className="text-base text-muted-foreground tabular-nums">{count}</span>
              </Link>
            </li>
            <li>
              <Link to="/account" onClick={onClose} className={linkBase}>
                {user ? user.name.split(" ")[0] : t("nav.account")}
              </Link>
            </li>
            {user?.role === "admin" && (
              <li>
                <Link to="/admin" onClick={onClose} className={linkBase}>
                  {t("nav.admin")}
                </Link>
              </li>
            )}
            <li>
              <Link to="/privacy" onClick={onClose} className="block py-4 text-sm text-muted-foreground hover:text-foreground">
                Политика конфиденциальности
              </Link>
            </li>
          </ul>
        </nav>

        {/* footer actions */}
        <div className="px-7 py-6 border-t border-border flex items-center justify-between gap-4 bg-secondary/40">
          <button
            onClick={() => setLang(lang === "ru" ? "en" : "ru")}
            className="flex items-center gap-2 text-xs uppercase tracking-[0.25em]"
          >
            <span className={lang === "ru" ? "font-semibold" : "text-muted-foreground"}>RU</span>
            <span className="text-muted-foreground">/</span>
            <span className={lang === "en" ? "font-semibold" : "text-muted-foreground"}>EN</span>
          </button>
          {user ? (
            <button
              onClick={async () => { await api.logout(); onClose(); router.invalidate(); }}
              className="text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground"
            >
              {t("auth.logout")}
            </button>
          ) : (
            <Link
              to="/account"
              onClick={onClose}
              className="text-xs uppercase tracking-[0.25em] font-semibold"
            >
              {t("auth.login")}
            </Link>
          )}
        </div>
      </aside>
    </div>
  );
  void variant;
}

/** Глобальный header (на всех страницах кроме / и /admin) */
export function SiteHeader() {
  const { t, lang, setLang } = useI18n();
  const { user, count } = useChrome();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-background/85 backdrop-blur border-b border-border">
      <div className="container-rhode grid grid-cols-3 items-center h-16">
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

        <div className="flex justify-center">
          <Link to="/" className="font-display text-2xl tracking-tight">ОБЛАКО</Link>
        </div>

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

      <MobileDrawer open={open} onClose={() => setOpen(false)} user={user} count={count} />
    </header>
  );
}

/** Узкая полоса сверху с центрированным логотипом — над hero */
export function HomeTopBar() {
  return (
    <div className="w-full bg-background border-b border-border">
      <div className="container-rhode flex items-center justify-center h-12">
        <Link to="/" className="font-display text-xl md:text-2xl tracking-tight">
          ОБЛАКО
        </Link>
      </div>
    </div>
  );
}

/**
 * Навигация для главной — рендерится ВНУТРИ relative-контейнера hero-картинки.
 * Текст белый, бургер слева на мобилке.
 */
export function HomeHeroNav() {
  const { t, lang, setLang } = useI18n();
  const { user, count } = useChrome();
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="absolute top-0 left-0 right-0 z-30 px-6 md:px-10 h-16 md:h-20 flex items-center justify-between text-background">
        <div className="flex items-center gap-8">
          <button
            onClick={() => setOpen(true)}
            aria-label="Меню"
            className="md:hidden flex flex-col gap-[5px] p-2 -ml-2"
          >
            <span className="w-6 h-px bg-background" />
            <span className="w-6 h-px bg-background" />
            <span className="w-6 h-px bg-background" />
          </button>
          <div className="hidden md:flex items-center gap-10 text-xs uppercase tracking-[0.25em] font-medium">
            {NAV_LINKS.map((l) => (
              <Link key={l.to} to={l.to} className="hover:opacity-70 transition-opacity">
                {t(l.key)}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-5 md:gap-8 text-xs uppercase tracking-[0.25em] font-medium">
          <button
            onClick={() => setLang(lang === "ru" ? "en" : "ru")}
            className="hidden sm:inline hover:opacity-70 transition-opacity"
          >
            {lang === "ru" ? "EN" : "RU"}
          </button>
          {user?.role === "admin" && (
            <Link to="/admin" className="hidden md:inline hover:opacity-70 transition-opacity">
              {t("nav.admin")}
            </Link>
          )}
          <Link to="/account" className="hidden md:inline hover:opacity-70 transition-opacity">
            {user ? user.name.split(" ")[0] : t("nav.account")}
          </Link>
          <Link to="/cart" className="hover:opacity-70 transition-opacity">
            {t("nav.cart")} ({count})
          </Link>
        </div>
      </nav>

      <MobileDrawer open={open} onClose={() => setOpen(false)} user={user} count={count} />
    </>
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
            <li><Link to="/faq" className="hover-underline">Вопросы и ответы</Link></li>
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
