import { Link } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";

export function AuthSlot({ light = false }: { light?: boolean }) {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <div className="h-8 w-8 animate-pulse rounded-full bg-charcoal-800/10" />;
  }
  if (user) {
    return (
      <div
        className={cn(
          "flex items-center text-xs [&_button]:text-[10px] [&_button]:uppercase [&_button]:tracking-[0.14em]",
          light
            ? "[&_span]:text-ivory-50 [&_button]:text-ivory-50/80"
            : "[&_button]:text-charcoal-400",
        )}
      >
        <UserButton />
      </div>
    );
  }
  return (
    <Link
      to="/login"
      className={cn(
        "inline-flex h-10 items-center rounded-full px-4 text-[11px] font-medium tracking-[0.14em] uppercase transition-colors",
        light
          ? "text-ivory-50/80 hover:text-ivory-50"
          : "text-charcoal-500 hover:text-charcoal-800",
      )}
    >
      Sign in
    </Link>
  );
}
