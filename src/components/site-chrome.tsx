import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { api, type User } from "@/lib/api";

export function SiteHeader() {
  const { t, lang, setLang } = useI18n();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [count, setCount] = useState(0);

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

  return (
    <header className="sticky top-0 z-40 bg-background/85 backdrop-blur border-b border-border">
      <div className="container-rhode flex items-center justify-between h-16">
        <Link to="/" className="font-display text-2xl tracking-tight">
          ОБЛАКО
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm">
          <Link to="/shop" className="hover-underline">{t("nav.shop")}</Link>
          <Link to="/about" className="hover-underline">{t("nav.about")}</Link>
          <Link to="/journal" className="hover-underline">{t("nav.journal")}</Link>
        </nav>
        <div className="flex items-center gap-5 text-sm">
          <button
            onClick={() => setLang(lang === "ru" ? "en" : "ru")}
            className="uppercase tracking-widest text-xs hover-underline"
          >
            {lang === "ru" ? "EN" : "RU"}
          </button>
          {user?.role === "admin" && (
            <Link to="/admin" className="hover-underline">{t("nav.admin")}</Link>
          )}
          <Link to="/account" className="hover-underline">
            {user ? user.name : t("nav.account")}
          </Link>
          <Link to="/cart" className="hover-underline">
            {t("nav.cart")} ({count})
          </Link>
          {user && (
            <button
              onClick={async () => { await api.logout(); router.invalidate(); }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {t("auth.logout")}
            </button>
          )}
        </div>
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
