import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex h-11 w-full rounded-lg border border-border bg-ivory-50 px-3.5 text-sm text-charcoal-800 placeholder:text-charcoal-300",
        "transition-colors duration-200 focus-visible:border-gold-400 focus-visible:outline-none",
        className,
      )}
      {...props}
    />
  );
}
