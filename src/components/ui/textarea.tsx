import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "flex min-h-28 w-full rounded-lg border border-border bg-ivory-50 px-3.5 py-3 text-sm text-charcoal-800 placeholder:text-charcoal-300",
        "transition-colors duration-200 focus-visible:border-gold-400 focus-visible:outline-none",
        className,
      )}
      {...props}
    />
  );
}
