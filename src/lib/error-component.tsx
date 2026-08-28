import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-ivory-50 px-6 text-center text-charcoal-800">
      <span className="text-gold-600" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={1.5} />
      </span>
      <h1 className="font-serif text-2xl">The door did not open</h1>
      <p className="max-w-md text-sm break-words text-charcoal-500">
        {error.message || "Something went wrong. Try signing in again."}
      </p>
      <a
        href="/login"
        className="mt-4 text-[11px] uppercase tracking-[0.16em] text-charcoal-500 underline-offset-4 hover:text-charcoal-800 hover:underline"
      >
        Back to sign in
      </a>
    </main>
  );
}
