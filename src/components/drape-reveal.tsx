import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DrapeReveal({
  house,
  children,
}: {
  house: string;
  children: ReactNode;
}) {
  const [phase, setPhase] = useState<"closed" | "opening" | "open">("closed");

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setPhase("open");
      return;
    }
    const start = window.setTimeout(() => setPhase("opening"), 480);
    const done = window.setTimeout(() => setPhase("open"), 2800);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(done);
    };
  }, [house]);

  const parted = phase !== "closed";

  return (
    <div className="relative">
      {children}
      {phase !== "open" && (
        <div className="pointer-events-none fixed inset-0 z-[70]">
          <div className={cn("drape drape-left", parted && "drape-open-left")} aria-hidden />
          <div className={cn("drape drape-right", parted && "drape-open-right")} aria-hidden />
          <div
            className={cn(
              "absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center transition-opacity duration-700",
              parted ? "opacity-0" : "opacity-100",
            )}
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-gold-300">
              Welcome to
            </p>
            <h1 className="mt-4 max-w-3xl font-serif text-4xl font-medium leading-[1.1] text-ivory-50 sm:text-6xl">
              {house}
            </h1>
            <p className="mt-3 font-serif text-2xl italic text-ivory-100/85 sm:text-3xl">showroom</p>
            <p className="mt-8 text-[10px] font-medium uppercase tracking-[0.28em] text-gold-200/80">
              powered by odrapecollective
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
