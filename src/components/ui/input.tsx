import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, type = "text", ...props }, ref) {
    return (
      <input
        {...props}
        ref={ref}
        type={type}
        className={cn(
          "relative z-10 block h-12 w-full rounded-xl border border-charcoal-200 bg-ivory-50 px-3.5 text-base text-charcoal-800 placeholder:text-charcoal-300",
          "touch-manipulation shadow-[0_0_0_1px_rgba(28,25,23,0.04)]",
          "transition-colors duration-200 focus-visible:border-gold-400 focus-visible:outline-none",
          className,
        )}
      />
    );
  },
);
