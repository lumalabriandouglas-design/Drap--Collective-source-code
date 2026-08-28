import { formatMoney } from "@/lib/format";
import { useCurrency } from "@/lib/currency-store";
import { cn } from "@/lib/utils";

export function Price({
  cents,
  className,
}: {
  cents: number;
  className?: string;
}) {
  const currency = useCurrency((s) => s.currency);
  return (
    <span className={cn("tabular-nums tracking-tight", className)}>
      {formatMoney(cents, currency)}
    </span>
  );
}
