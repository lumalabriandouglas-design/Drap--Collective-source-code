import { authClient } from "./client";
import { authEnabled } from "./auth-enabled";
import { staticFloor } from "@/lib/house-mode";
import { useFloorAuth, type FloorSession } from "@/lib/floor-auth";

/** Normalized user shape used across the app, auth on or off. */
export type AppUser = {
  id: string;
  displayName: string | null;
  primaryEmail: string | null;
  profileImageUrl: string | null;
  /** True when this is the sandbox/dev fallback (auth not configured). */
  isDevFallback: boolean;
};

export const DEV_USER: AppUser = {
  id: "dev-user",
  displayName: "Dev User",
  primaryEmail: "dev@example.com",
  profileImageUrl: null,
  isDevFallback: true,
};

export type CurrentUserState = {
  user: AppUser | null;
  isPending: boolean;
};

function fromFloor(session: FloorSession): AppUser {
  return {
    id: session.userId,
    displayName: session.displayName || session.brandName || session.email,
    primaryEmail: session.email,
    profileImageUrl: session.avatarUrl,
    isDevFallback: false,
  };
}

/**
 * Current user + loading state.
 * Static Vercel house → live-floor email/password session only (no /api/auth).
 */
export function useCurrentUserState(): CurrentUserState {
  const { session: floor, ready } = useFloorAuth();
  if (!authEnabled) return { user: DEV_USER, isPending: false };
  if (staticFloor) {
    return { user: floor ? fromFloor(floor) : null, isPending: !ready };
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks -- staticFloor is a compile-time constant
  const { data, isPending } = authClient.useSession();
  if (floor) return { user: fromFloor(floor), isPending: false };
  if (!ready) return { user: null, isPending: true };
  const user = data?.user;
  return {
    user: user
      ? {
          id: user.id,
          displayName: user.name ?? null,
          primaryEmail: user.email ?? null,
          profileImageUrl: user.image ?? null,
          isDevFallback: false,
        }
      : null,
    isPending,
  };
}

export function useCurrentUser(): AppUser | null {
  return useCurrentUserState().user;
}
