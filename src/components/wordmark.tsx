import { Mark } from "@/components/mark";
import { cn } from "@/lib/utils";

export function Wordmark({
  className,
  light = false,
  mark = true,
}: {
  className?: string;
  light?: boolean;
  mark?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 font-serif tracking-tight select-none leading-none",
        light ? "text-ivory-50" : "text-charcoal-800",
        className,
      )}
    >
      {mark ? <Mark light={light} className="size-[1.05em]" /> : null}
      <span>
        <span className="font-semibold">Drapé</span>
        <span className={cn("ml-1.5 font-light", light ? "text-ivory-200" : "text-charcoal-300")}>
          Collective
        </span>
      </span>
    </span>
  );
}
