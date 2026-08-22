import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function NotInHouse() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="text-[10px] uppercase tracking-[0.22em] text-gold-600">The house</p>
      <h1 className="mt-3 font-serif text-4xl text-charcoal-800">This page is not in the house</h1>
      <p className="mt-3 text-sm text-charcoal-500">It may have moved, or it was never listed.</p>
      <Button asChild className="mt-8">
        <Link to="/">Return to the floor</Link>
      </Button>
    </main>
  );
}
