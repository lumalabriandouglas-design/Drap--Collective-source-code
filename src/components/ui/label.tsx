import type { LabelHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "text-[10px] font-medium uppercase tracking-[0.16em] text-gold-600",
        className,
      )}
      {...props}
    />
  );
}
