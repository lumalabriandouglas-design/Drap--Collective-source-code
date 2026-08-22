import { authClient, authEnabled } from "./client";
import { useFloorSession, type FloorSession } from "@/lib/floor-auth";

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

export function useCurrentUserState(): CurrentUserState {
  const floor = useFloorSession();
  const spa = import.meta.env.VITE_SPA === "true";
  if (!authEnabled) return { user: DEV_USER, isPending: false };
  if (spa) {
    return { user: floor ? fromFloor(floor) : null, isPending: false };
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks -- spa/authEnabled are constant for the app's lifetime
  const { data, isPending } = authClient.useSession();
  if (floor) return { user: fromFloor(floor), isPending: false };
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
