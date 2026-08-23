import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function HouseRoom({
  eyebrow,
  title,
  lede,
  actions,
  children,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-background">
      <div className="mx-auto max-w-6xl px-4 pt-24 pb-20 sm:px-6 lg:px-8 lg:pt-28">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-gold-600">{eyebrow}</p>
            <h1 className="mt-2 font-serif text-4xl text-balance text-charcoal-800 sm:text-5xl">{title}</h1>
            {lede ? (
              <p className="mt-3 max-w-xl text-sm font-light leading-relaxed text-pretty text-charcoal-500">
                {lede}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
        </div>
        <div className="gold-line my-8" />
        {children}
      </div>
    </main>
  );
}

export function RoomStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-charcoal-100 bg-ivory-50 px-5 py-4 shadow-[0_1px_0_rgba(28,25,23,0.03)]">
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-charcoal-400">{label}</p>
      <p className="mt-2 font-serif text-3xl tabular-nums text-charcoal-800">{value}</p>
    </div>
  );
}

export function RoomEmpty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-charcoal-200 bg-ivory-50 px-6 py-14 text-center">
      <h2 className="font-serif text-2xl text-charcoal-800">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm font-light text-pretty text-charcoal-500">{body}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function RoomSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <main className="min-h-dvh bg-background">
      <div className="mx-auto max-w-6xl px-4 pt-24 pb-20 sm:px-6 lg:px-8 lg:pt-28">
        <div className="h-3 w-24 animate-pulse rounded-full bg-ivory-200" />
        <div className="mt-4 h-10 w-64 max-w-full animate-pulse rounded-md bg-ivory-200" />
        <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded-md bg-ivory-100" />
        <div className="gold-line my-8" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: cards }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-ivory-100" />
          ))}
        </div>
        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-portrait animate-pulse rounded-xl bg-ivory-100" />
          ))}
        </div>
      </div>
    </main>
  );
}

export function RolePill({ role }: { role: string | null | undefined }) {
  const r = (role ?? "collector").toLowerCase();
  const label = r === "client" ? "Collector" : r.charAt(0).toUpperCase() + r.slice(1);
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-full px-3 text-[10px] font-medium uppercase tracking-[0.14em]",
        r === "admin"
          ? "bg-charcoal-800 text-ivory-50"
          : r === "designer"
            ? "bg-ivory-200 text-charcoal-800"
            : "border border-charcoal-200 text-charcoal-500",
      )}
    >
      {label}
    </span>
  );
}
