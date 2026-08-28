import { Link, useRouterState } from "@tanstack/react-router";
import { Heart, Search, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { AuthSlot } from "@/components/auth-slot";
import { HouseNavSheet, MenuToggle } from "@/components/house-menu";
import { Wordmark } from "@/components/wordmark";
import { bagCount, useBag } from "@/lib/bag-store";
import { useHouseRole } from "@/lib/use-role";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  to: "/shop" | "/ateliers" | "/journal" | "/quiz" | "/studio" | "/atelier-house" | "/desk" | "/join";
};

function navFor(role: string | null, signedIn: boolean): NavItem[] {
  const shop: NavItem[] = [
    { label: "Shop", to: "/shop" },
    { label: "Designers", to: "/ateliers" },
    { label: "Stories", to: "/journal" },
  ];
  if (role === "admin") {
    return [
      ...shop,
      { label: "Messages", to: "/desk" },
      { label: "Studio", to: "/studio" },
      { label: "Admin", to: "/atelier-house" },
    ];
  }
  if (role === "designer") {
    return [
      { label: "Messages", to: "/desk" },
      { label: "Studio", to: "/studio" },
    ];
  }
  if (signedIn) {
    return [...shop, { label: "Messages", to: "/desk" }];
  }
  return [...shop, { label: "Style Quiz", to: "/quiz" }];
}

export function SiteHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = useBag((s) => s.items);
  const count = bagCount(items);
  const { role, user } = useHouseRole();
  const nav = navFor(role, Boolean(user));
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isHome = pathname === "/";
  const onShowroom = pathname.startsWith("/s/") || /^\/ateliers\/[^/]+/.test(pathname);
  const overlay = (isHome || onShowroom) && !scrolled && !open;
  const designerWork = role === "designer";

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => setOpen(false), [pathname]);

  const linkClass = (active: boolean) =>
    cn(
      "relative py-1 text-[11px] tracking-[0.18em] uppercase transition-colors duration-300",
      active
        ? overlay
          ? "text-gold-300"
          : "text-charcoal-800"
        : overlay
          ? "text-ivory-50/70 hover:text-ivory-50"
          : "text-charcoal-400 hover:text-charcoal-800",
    );

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        overlay ? "bg-transparent" : "bg-ivory-50/92 backdrop-blur-xl",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:h-[4.5rem] lg:px-8">
        <Link to="/" aria-label="Drapé Collective home" className="shrink-0">
          <Wordmark className="text-[1.35rem]" light={overlay} />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {nav.map((item) => {
            const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
            return (
              <Link key={item.to} to={item.to} className={linkClass(active)}>
                {item.label}
                <span
                  className={cn(
                    "absolute inset-x-0 -bottom-1 mx-auto h-px w-4 transition-opacity duration-300",
                    active ? "bg-gold-400 opacity-100" : "opacity-0",
                  )}
                />
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          {designerWork ? null : (
            <>
              <Link
                to="/shop"
                aria-label="Search the shop"
                className={cn(
                  "grid size-11 place-items-center rounded-full transition-colors",
                  overlay ? "text-ivory-50/80 hover:text-ivory-50" : "text-charcoal-500 hover:text-charcoal-800",
                )}
              >
                <Search size={17} strokeWidth={1.5} />
              </Link>
              <Link
                to="/account"
                aria-label="Saved pieces"
                className={cn(
                  "hidden size-11 place-items-center rounded-full transition-colors sm:grid",
                  overlay ? "text-ivory-50/80 hover:text-ivory-50" : "text-charcoal-500 hover:text-charcoal-800",
                )}
              >
                <Heart size={17} strokeWidth={1.5} />
              </Link>
              <Link
                to="/bag"
                aria-label="Shopping bag"
                className={cn(
                  "relative grid size-11 place-items-center rounded-full transition-colors",
                  overlay ? "text-ivory-50/80 hover:text-ivory-50" : "text-charcoal-500 hover:text-charcoal-800",
                )}
              >
                <ShoppingBag size={17} strokeWidth={1.5} />
                {mounted && count > 0 && (
                  <span className="absolute top-1.5 right-1.5 grid min-w-4 place-items-center rounded-full bg-gold-500 px-1 text-[9px] font-semibold text-ivory-50">
                    {count}
                  </span>
                )}
              </Link>
            </>
          )}
          <AuthSlot light={overlay} />
          <MenuToggle open={open} light={overlay} onOpen={() => setOpen(true)} />
        </div>
      </div>
      <div
        className={cn(
          "h-px w-full transition-colors duration-500",
          overlay ? "bg-ivory-50/15" : "bg-gold-400/35",
        )}
      />
      <HouseNavSheet open={open} onClose={() => setOpen(false)} nav={nav} />
    </header>
  );
}
