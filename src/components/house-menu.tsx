import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ChevronDown,
  Coins,
  LogIn,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Settings,
  Share2,
  Store,
  Sun,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useCurrency } from "@/lib/currency-store";
import { CURRENCIES, type CurrencyCode } from "@/lib/format";
import { clearFloorSession } from "@/lib/floor-auth";
import { displayImage } from "@/lib/media";
import { readTheme, toggleTheme } from "@/lib/theme";
import { getMyStudio } from "@/lib/studio";
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

const rowClass =
  "flex min-h-12 w-full items-center gap-3 px-4 text-left text-sm text-charcoal-800";

function nextCurrency(code: CurrencyCode): CurrencyCode {
  const i = CURRENCIES.findIndex((c) => c.code === code);
  return CURRENCIES[(i + 1) % CURRENCIES.length]?.code ?? "UGX";
}

export function HouseAccountPanel({ onDone }: { onDone?: () => void }) {
  const { user } = useCurrentUserState();
  const { isDesigner, isAdmin } = useHouseRole();
  const studio = useQuery({
    queryKey: ["studio"],
    enabled: Boolean(user) && isDesigner,
    queryFn: () => getMyStudio(),
  });
  const currency = useCurrency((s) => s.currency);
  const setCurrency = useCurrency((s) => s.setCurrency);
  const [theme, setThemeState] = useState(readTheme);
  const [leaving, setLeaving] = useState(false);
  const label = user?.displayName ?? user?.primaryEmail ?? "Account";

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
    <div className="py-1">
      {user ? (
        <>
          <p className="px-4 pb-2 pt-3 text-[10px] font-medium uppercase tracking-[0.16em] text-gold-600">
            {label}
          </p>
          <Link to="/account" className={rowClass} onClick={onDone}>
            <UserRound size={15} />
            Account
          </Link>
          {isDesigner ? (
            <>
              <Link to="/studio" className={rowClass} onClick={onDone}>
                <Store size={15} />
                Studio
              </Link>
              {studio.data?.atelier?.slug ? (
                <Link to="/s/$slug" params={{ slug: studio.data.atelier.slug }} className={rowClass} onClick={onDone}>
                  <Share2 size={15} />
                  Showroom
                </Link>
              ) : null}
            </>
          ) : null}
          <Link to="/desk" className={rowClass} onClick={onDone}>
            <MessageSquare size={15} />
            Messages
          </Link>
          {isAdmin ? (
            <Link to="/atelier-house" className={rowClass} onClick={onDone}>
              <Settings size={15} />
              Admin
            </Link>
          ) : null}
        </>
      ) : (
        <>
          <p className="px-4 pb-2 pt-3 text-[10px] font-medium uppercase tracking-[0.16em] text-gold-600">
            The house
          </p>
          <a href="/login" className={rowClass} onClick={onDone}>
            <LogIn size={15} />
            Sign in
          </a>
          <a href="/join" className={rowClass} onClick={onDone}>
            <UserPlus size={15} />
            Join
          </a>
        </>
      )}
      <div className="mx-4 my-2 h-px bg-charcoal-100" />
      <p className="px-4 pb-1 pt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-charcoal-400">
        Settings
      </p>
      <button
        type="button"
        className={rowClass}
        onClick={() => {
          toggleTheme();
          setThemeState(readTheme());
        }}
      >
        {theme === "charcoal" ? <Sun size={15} /> : <Moon size={15} />}
        {theme === "charcoal" ? "Light look" : "Dark look"}
      </button>
      <button type="button" className={rowClass} onClick={() => setCurrency(nextCurrency(currency))}>
        <Coins size={15} />
        Currency · {currency}
      </button>
      {user ? (
        <button type="button" disabled={leaving} className={rowClass} onClick={() => void leave()}>
          <LogOut size={15} />
          {leaving ? "Signing out…" : "Sign out"}
        </button>
      ) : null}
    </div>
  );
}

function Portal({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => setTarget(document.body), []);
  if (!target) return null;
  return createPortal(children, target);
}

type NavLink = { label: string; to: string };

export function HouseNavSheet({
  open,
  onClose,
  nav = [],
}: {
  open: boolean;
  onClose: () => void;
  nav?: NavLink[];
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[100] flex flex-col md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
        <div className="relative z-10 flex max-h-dvh flex-col bg-ivory-50 shadow-[0_16px_40px_rgb(0_0_0_/_0.16)]">
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-charcoal-100 px-4">
            <p className="font-serif text-lg text-charcoal-800">Menu</p>
            <button
              type="button"
              aria-label="Close menu"
              className="grid size-11 place-items-center rounded-full text-charcoal-700"
              onClick={onClose}
            >
              <X size={18} />
            </button>
          </div>
          <div className="min-h-0 overflow-y-auto overscroll-contain pb-8">
            {nav
              .filter((item) => {
                if (item.to === "/desk" || item.to === "/studio" || item.to === "/atelier-house") return false;
                return true;
              })
              .map((item) => (
              <Link
                key={item.to}
                to={item.to as "/"}
                onClick={onClose}
                className="flex min-h-12 items-center border-b border-charcoal-100/80 px-4 text-sm tracking-[0.14em] uppercase text-charcoal-800"
              >
                {item.label}
              </Link>
            ))}
            <HouseAccountPanel onDone={onClose} />
          </div>
        </div>
        <button type="button" aria-label="Close menu" className="min-h-12 flex-1 bg-charcoal-900/40" onClick={onClose} />
      </div>
    </Portal>
  );
}

export function HouseMenu({ light = false }: { light?: boolean }) {
  const { user } = useCurrentUserState();
  const [open, setOpen] = useState(false);
  const label = user?.displayName ?? user?.primaryEmail ?? "Account";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={user ? `Account menu for ${label}` : "Sign in, join, and settings"}
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex h-11 min-w-11 items-center gap-2 rounded-full px-1.5 text-[11px] font-medium tracking-[0.12em] uppercase",
          light ? "text-ivory-50/90 hover:text-ivory-50" : "text-charcoal-600 hover:text-charcoal-800",
        )}
      >
        {user ? (
          <HouseAvatar src={user.profileImageUrl} name={label} light={light} className="size-8" />
        ) : (
          <span
            className={cn(
              "grid size-8 place-items-center rounded-full",
              light ? "bg-ivory-50/15 text-ivory-50" : "bg-charcoal-800 text-ivory-50",
            )}
          >
            <UserRound size={15} />
          </span>
        )}
        <span className="hidden max-w-[8rem] truncate sm:inline">{user ? label : "Account"}</span>
        <ChevronDown size={14} className={cn("hidden sm:inline", open && "rotate-180")} />
      </button>
      {open ? (
        <Portal>
          <div className="fixed inset-0 z-[100] flex flex-col sm:block">
            <div
              role="dialog"
              aria-label="Account"
              className="relative z-10 max-h-dvh overflow-y-auto bg-ivory-50 shadow-[0_16px_40px_rgb(0_0_0_/_0.16)] sm:absolute sm:right-3 sm:top-16 sm:w-72 sm:rounded-2xl sm:border sm:border-charcoal-100"
            >
              <div className="flex h-14 items-center justify-between border-b border-charcoal-100 px-3 sm:hidden">
                <p className="font-serif text-lg text-charcoal-800">Account</p>
                <button
                  type="button"
                  aria-label="Close account menu"
                  className="grid size-11 place-items-center rounded-full"
                  onClick={() => setOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <HouseAccountPanel onDone={() => setOpen(false)} />
            </div>
            <button
              type="button"
              aria-label="Close account menu"
              className="min-h-12 flex-1 bg-charcoal-900/40 sm:absolute sm:inset-0 sm:z-0"
              onClick={() => setOpen(false)}
            />
          </div>
        </Portal>
      ) : null}
    </>
  );
}

export function MenuToggle({
  open,
  light,
  onOpen,
}: {
  open: boolean;
  light?: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "grid size-11 place-items-center rounded-full md:hidden",
        light ? "text-ivory-50" : "text-charcoal-700",
      )}
      aria-label={open ? "Close menu" : "Open menu"}
      aria-expanded={open}
      onClick={onOpen}
    >
      {open ? <X size={18} /> : <Menu size={18} />}
    </button>
  );
}

export function GuestDoors({ light = false }: { light?: boolean }) {
  return (
    <div className="hidden items-center gap-1 sm:flex">
      <Link
        to="/login"
        className={cn(
          "inline-flex h-10 items-center rounded-full px-4 text-[11px] font-medium tracking-[0.14em] uppercase",
          light ? "text-ivory-50/80 hover:text-ivory-50" : "text-charcoal-500 hover:text-charcoal-800",
        )}
      >
        Sign in
      </Link>
      <Link
        to="/join"
        className={cn(
          "inline-flex h-10 items-center rounded-full px-4 text-[11px] font-medium tracking-[0.14em] uppercase",
          light
            ? "bg-ivory-50/15 text-ivory-50 hover:bg-ivory-50/25"
            : "bg-charcoal-800 text-ivory-50 hover:bg-charcoal-700",
        )}
      >
        Join
      </Link>
    </div>
  );
}
