import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  useRouterState,
  createRootRouteWithContext,
  useNavigate,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { StoreProvider } from "@/lib/store";
import { AuthProvider, useAuth } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold font-display text-ink">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-ink">Page not found</h2>
        <p className="mt-2 text-sm text-ink-soft">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-accent/90 focus-visible:ring-2 focus-visible:ring-accent/70"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-ink">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-accent/90 focus-visible:ring-2 focus-visible:ring-accent/70"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-line bg-paper px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-line/80 hover:bg-panel/40 focus-visible:ring-2 focus-visible:ring-accent/70"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Archivist — personal work OS" },
      {
        name: "description",
        content: "Manage your companies, projects, people, documents, meetings and decisions in one place.",
      },
      { property: "og:title", content: "Archivist — personal work OS" },
      {
        property: "og:description",
        content: "Manage your companies, projects, people, documents, meetings and decisions in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,500&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap",
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
    <html lang="en">
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
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}

/** Routes that render without a session, outside the workspace shell. */
const PUBLIC_PATHS = new Set(["/login", "/setup"]);

type Redirect = "/" | "/login" | "/setup" | null;

function AuthGate() {
  const { ready, user, needsSetup, backendError } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  let redirect: Redirect = null;
  if (ready && !backendError) {
    if (needsSetup && pathname !== "/setup") redirect = "/setup";
    else if (!needsSetup && !user && pathname !== "/login") redirect = "/login";
    else if (user && PUBLIC_PATHS.has(pathname)) redirect = "/";
  }

  useEffect(() => {
    if (redirect) void navigate({ to: redirect, replace: true });
  }, [redirect, navigate]);

  // Without a reachable backend we know nothing about accounts — showing the login form here
  // would invite the user to sign in to something that was never asked.
  if (ready && backendError) {
    return (
      <div className="grid min-h-screen place-items-center bg-paper px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold tracking-tight text-ink">Archivist backend is not running</h1>
          <p className="mt-2 text-sm text-ink-soft">{backendError}</p>
          <p className="mt-4 text-sm text-ink-soft">
            Start it with <code className="rounded bg-panel px-1.5 py-0.5 font-mono text-xs">npm run dev</code> in{" "}
            <code className="rounded bg-panel px-1.5 py-0.5 font-mono text-xs">archivist-src-backend</code>, then reload
            this page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-accent/90 focus-visible:ring-2 focus-visible:ring-accent/70"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!ready || redirect) {
    return (
      <div className="grid min-h-screen place-items-center bg-paper text-sm text-ink-soft">
        Connecting to Archivist…
      </div>
    );
  }

  // Login and setup render bare: the shell needs an authenticated store.
  if (PUBLIC_PATHS.has(pathname)) return <Outlet />;

  return (
    <StoreProvider>
      <AppShell>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
      </AppShell>
    </StoreProvider>
  );
}
