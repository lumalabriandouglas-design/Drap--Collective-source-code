import { createFileRoute } from "@tanstack/react-router";

const spa = import.meta.env.VITE_SPA === "true";

export const Route = createFileRoute("/api/auth/$")(
  spa
    ? { component: () => null }
    : {
        server: {
          handlers: {
            GET: async ({ request }) => {
              const { auth } = await import("@/lib/auth/server");
              return auth.handler(request);
            },
            POST: async ({ request }) => {
              const { auth } = await import("@/lib/auth/server");
              return auth.handler(request);
            },
          },
        },
      },
);
