import { Outlet, createRootRoute, HeadContent, Scripts, useRouterState } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { I18nProvider } from "@/lib/i18n";
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
  const isAdmin = pathname.startsWith("/admin");
  // Главная имеет собственную «внутри-картинки» навигацию (стиль Rhode)
  const isHome = pathname === "/";
  const hideChrome = isAdmin || isHome;
  return (
    <I18nProvider>
      <div className="min-h-screen flex flex-col">
        {!hideChrome && <SiteHeader />}
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
