import { Outlet, createRootRoute, HeadContent, Scripts, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import appCss from "../styles.css?url";
import { I18nProvider } from "@/lib/i18n";
import { api } from "@/lib/api";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ОБЛАКО — минималистичный уход за кожей" },
      { name: "description", content: "Российский бренд минималистичного ухода за кожей. Чистые формулы, премиальные текстуры." },
      { property: "og:title", content: "ОБЛАКО — минималистичный уход" },
      { property: "og:description", content: "Чистые формулы. Премиальные текстуры. Эффект сияющей кожи." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=Inter:wght@300;400;500;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [isAdminSession, setIsAdminSession] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const isAdmin = pathname.startsWith("/admin");
  const isHome = pathname === "/";
  // Скрываем chrome только на админке и пока не проверили сессию (чтобы не мигало)
  const hideChrome = isAdmin || isAdminSession || !authChecked;
  const headerVariant = isHome ? "overlay" : "solid";

  useEffect(() => {
    let alive = true;
    const checkAdmin = () => api.me().then((user) => {
      if (!alive) return;
      const admin = user?.role === "admin";
      setIsAdminSession(admin);
      setAuthChecked(true);
      if (admin && !pathname.startsWith("/admin")) {
        navigate({ to: "/admin", replace: true });
      }
    });
    checkAdmin();
    window.addEventListener("oblako-auth-change", checkAdmin);
    window.addEventListener("storage", checkAdmin);
    return () => {
      alive = false;
      window.removeEventListener("oblako-auth-change", checkAdmin);
      window.removeEventListener("storage", checkAdmin);
    };
  }, [navigate, pathname]);

  return (
    <I18nProvider>
      <div className="min-h-screen flex flex-col">
        {!hideChrome && <SiteHeader variant={headerVariant} />}
        <main className="flex-1">
          <Outlet />
        </main>
        {!isAdmin && <SiteFooter />}
      </div>
    </I18nProvider>
  );
}

function NotFoundComponent() {
  return (
    <div className="container-rhode py-32 text-center">
      <h1 className="font-display text-6xl mb-4">404</h1>
      <p className="text-muted-foreground">Страница не найдена</p>
    </div>
  );
}
