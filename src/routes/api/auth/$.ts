import { createFileRoute } from "@tanstack/react-router";

/** Floor auth talks to live Supabase. Better Auth is not served on this house. */
export const Route = createFileRoute("/api/auth/$")({
  component: () => null,
});
