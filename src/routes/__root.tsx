import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Sidebar } from "../components/Sidebar";
import "../lib/recharts-config";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="display text-7xl font-bold">404</h1>
        <p className="mt-4 text-muted-foreground">Página não encontrada.</p>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="display text-xl font-semibold">Erro ao carregar</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Italinea Decora — Painel Financeiro 2026" },
      {
        name: "description",
        content:
          "Dashboards executivos: DRE mensal, projeção de fluxo de caixa, centros de custo, carteira de clientes e compras a entregar.",
      },
      { property: "og:title", content: "Italinea Decora — Painel Financeiro 2026" },
      {
        property: "og:description",
        content:
          "Dashboards executivos: DRE mensal, projeção de fluxo de caixa, centros de custo, carteira de clientes e compras a entregar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Italinea Decora — Painel Financeiro 2026" },
      {
        name: "twitter:description",
        content:
          "Dashboards executivos: DRE mensal, projeção de fluxo de caixa, centros de custo, carteira de clientes e compras a entregar.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3e9fee03-0c24-40d1-a598-1098326694aa/id-preview-ebf5e3b8--91e57aa0-31c6-4aeb-a3ea-79097cd538b6.lovable.app-1783886596313.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3e9fee03-0c24-40d1-a598-1098326694aa/id-preview-ebf5e3b8--91e57aa0-31c6-4aeb-a3ea-79097cd538b6.lovable.app-1783886596313.png",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
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
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen bg-background text-foreground">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </QueryClientProvider>
  );
}
