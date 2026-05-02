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
      { property: "og:title", content: "ОБЛАКО — минималистичный уход за кожей" },
      { property: "og:description", content: "Российский бренд минималистичного ухода за кожей. Чистые формулы, премиальные текстуры." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "ОБЛАКО — минималистичный уход за кожей" },
      { name: "twitter:description", content: "Российский бренд минималистичного ухода за кожей. Чистые формулы, премиальные текстуры." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/7d299b98-6435-451c-9fb1-3689c853b01e/id-preview-0089894a--d85155e6-bbf8-4a4c-b599-a72d257d1dd2.lovable.app-1777666183521.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/7d299b98-6435-451c-9fb1-3689c853b01e/id-preview-0089894a--d85155e6-bbf8-4a4c-b599-a72d257d1dd2.lovable.app-1777666183521.png" },
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
  // Главная имеет собственную «внутри-картинки» навигацию (стиль Rhode)
  const isHome = pathname === "/";
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
