import { authEnabled } from "./auth-enabled";
import { useFloorAuth, type FloorSession } from "@/lib/floor-auth";

/** Normalized user shape used across the app, auth on or off. */
export type AppUser = {
  id: string;
  displayName: string | null;
  primaryEmail: string | null;
  profileImageUrl: string | null;
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
  return { user: floor ? fromFloor(floor) : null, isPending: !ready };
}

export function useCurrentUser(): AppUser | null {
  return useCurrentUserState().user;
}
