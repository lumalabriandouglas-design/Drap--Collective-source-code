import { cn } from "@/lib/utils";

export function Wordmark({
  className,
  light = false,
}: {
  className?: string;
  light?: boolean;
}) {
  return (
    <span
      className={cn(
        "font-serif tracking-tight select-none leading-none",
        light ? "text-ivory-50" : "text-charcoal-800",
        className,
      )}
    >
      <span className="font-semibold">Drapé</span>
      <span className={cn("font-light ml-1.5", light ? "text-ivory-200" : "text-charcoal-300")}>
        Collective
      </span>
    </span>
  );
}
