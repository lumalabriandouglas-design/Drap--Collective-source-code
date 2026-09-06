import { floorStartOAuth } from "@/lib/floor-auth";

export function HouseOauth({
  busy,
  door,
}: {
  busy?: boolean;
  door?: "client" | "designer";
}) {
  return (
    <div className="grid gap-2">
      <p className="text-center text-[10px] uppercase tracking-[0.18em] text-charcoal-400">Or continue with</p>
      <button
        type="button"
        disabled={busy}
        onClick={() => floorStartOAuth("google", door)}
        className="flex h-11 items-center justify-center rounded-full border border-charcoal-100 bg-white text-sm text-charcoal-800 hover:border-charcoal-300 disabled:opacity-40"
      >
        Google
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => floorStartOAuth("apple", door)}
        className="flex h-11 items-center justify-center rounded-full bg-charcoal-800 text-sm text-ivory-50 hover:bg-charcoal-700 disabled:opacity-40"
      >
        Apple
      </button>
    </div>
  );
}
