import { Link } from "@tanstack/react-router";
import { ChevronDown, LogOut, MessageSquare, Moon, Settings, Store, Sun, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { clearFloorSession } from "@/lib/floor-auth";
import { displayImage } from "@/lib/media";
import { readTheme, toggleTheme, type HouseTheme } from "@/lib/theme";
import { useHouseRole } from "@/lib/use-role";
import { cn } from "@/lib/utils";

export function HouseAvatar({
  src,
  name,
  light = false,
  className,
}: {
  src?: string | null;
  name: string;
  light?: boolean;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const initial = (name.trim().charAt(0) || "A").toUpperCase();
  const photo = src && !broken ? displayImage(src, 480) : null;
  if (!photo) {
    return (
      <span
        className={cn(
          "grid place-items-center rounded-full text-xs",
          light ? "bg-ivory-50/15 text-ivory-50" : "bg-charcoal-800 text-ivory-50",
          className,
        )}
      >
        {initial}
      </span>
    );
  }
  return (
    <img
      src={photo}
      alt=""
      className={cn("rounded-full object-cover", className)}
      onError={() => setBroken(true)}
    />
  );
}

export function HouseMenu({ light = false }: { light?: boolean }) {
  const { user } = useCurrentUserState();
  const { isDesigner, isAdmin } = useHouseRole();
  const [open, setOpen] = useState(false);
  const [theme, setThemeState] = useState<HouseTheme>("ivory");
  const [leaving, setLeaving] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sync = () => setThemeState(readTheme());
    sync();
    window.addEventListener("drape-theme", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("drape-theme", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;
  const label = user.displayName ?? user.primaryEmail ?? "Account";

  async function leave() {
    setLeaving(true);
    clearFloorSession();
    try {
      await signOut("/");
    } catch {
      window.location.assign("/");
    }
  }

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-full px-2 text-[11px] font-medium tracking-[0.12em] uppercase",
          light ? "text-ivory-50/90 hover:text-ivory-50" : "text-charcoal-600 hover:text-charcoal-800",
        )}
      >
        <HouseAvatar src={user.profileImageUrl} name={label} light={light} className="size-8" />
        <span className="hidden max-w-[8rem] truncate sm:inline">{label}</span>
        <ChevronDown size={14} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute top-12 right-0 z-70 w-56 rounded-2xl border border-charcoal-100 bg-ivory-50 py-2 shadow-[0_16px_40px_rgb(0_0_0_/_0.12)]"
        >
          <Link
            to="/account"
            role="menuitem"
            className="flex h-11 items-center gap-2 px-4 text-sm text-charcoal-700 hover:bg-ivory-100"
            onClick={() => setOpen(false)}
          >
            <UserRound size={15} />
            Account
          </Link>
          {isDesigner ? (
            <Link
              to="/studio"
              role="menuitem"
              className="flex h-11 items-center gap-2 px-4 text-sm text-charcoal-700 hover:bg-ivory-100"
              onClick={() => setOpen(false)}
            >
              <Store size={15} />
              Studio
            </Link>
          ) : null}
          <Link
            to="/desk"
            role="menuitem"
            className="flex h-11 items-center gap-2 px-4 text-sm text-charcoal-700 hover:bg-ivory-100"
            onClick={() => setOpen(false)}
          >
            <MessageSquare size={15} />
            Messages
          </Link>
          {isAdmin ? (
            <Link
              to="/atelier-house"
              role="menuitem"
              className="flex h-11 items-center gap-2 px-4 text-sm text-charcoal-700 hover:bg-ivory-100"
              onClick={() => setOpen(false)}
            >
              <Settings size={15} />
              Admin
            </Link>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className="flex h-11 w-full items-center gap-2 px-4 text-left text-sm text-charcoal-700 hover:bg-ivory-100"
            onClick={() => {
              toggleTheme();
              setThemeState(readTheme());
            }}
          >
            {theme === "charcoal" ? <Sun size={15} /> : <Moon size={15} />}
            {theme === "charcoal" ? "Light look" : "Dark look"}
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={leaving}
            className="flex h-11 w-full items-center gap-2 px-4 text-left text-sm text-charcoal-700 hover:bg-ivory-100"
            onClick={() => void leave()}
          >
            <LogOut size={15} />
            {leaving ? "Signing out…" : "Sign out"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
