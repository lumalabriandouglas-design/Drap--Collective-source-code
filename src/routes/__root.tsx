import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import { Toaster } from "sonner";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { AuthProvider } from "@/lib/auth/provider";
import { staticFloor } from "@/lib/house-mode";
import appCss from "../styles.css?url";

const APP_NAME = "Drapé Collective";
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
  },
});

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      {
        name: "description",
        content:
          "A private marketplace connecting independent fashion designers with discerning collectors. Discover unique, handcrafted fashion.",
      },
      { name: "theme-color", content: "#F6F1EA" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap",
      },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
  }),
  component: RootDocument,
});

function RootDocument() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const bare = pathname === "/login" || pathname === "/welcome";

  const inner = (
    <>
      <PreviewHostBridge />
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          {bare ? null : <SiteHeader />}
          <Outlet />
          {bare ? null : <SiteFooter />}
          <Toaster
            position="top-center"
            toastOptions={{
              className:
                "font-sans text-sm border-border bg-ivory-50 text-charcoal-800",
            }}
          />
        </QueryClientProvider>
      </AuthProvider>
    </>
  );

  if (staticFloor) return inner;

  return (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="min-h-dvh bg-background text-foreground">
        {inner}
        <Scripts />
      </body>
    </html>
  );
}
