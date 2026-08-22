import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium tracking-[0.12em] uppercase transition-all duration-300 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none",
  {
    variants: {
      variant: {
        solid:
          "bg-charcoal-800 text-ivory-50 hover:bg-charcoal-900 hover:shadow-[0_8px_24px_rgba(28,25,23,0.18)]",
        outline:
          "border border-charcoal-800/80 text-charcoal-800 bg-transparent hover:bg-charcoal-800 hover:text-ivory-50",
        ghost: "text-charcoal-600 hover:text-charcoal-900 hover:bg-ivory-100",
        gold: "bg-gold-500 text-ivory-50 hover:bg-gold-600",
        light: "bg-ivory-50 text-charcoal-800 hover:bg-white",
      },
      size: {
        sm: "h-10 px-4 text-[10px] rounded-full",
        md: "h-11 px-6 text-[11px] rounded-full",
        lg: "h-12 px-8 text-xs rounded-full",
        icon: "size-11 rounded-full",
      },
    },
    defaultVariants: { variant: "solid", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
