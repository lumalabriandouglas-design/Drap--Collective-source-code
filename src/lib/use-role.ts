import { useQuery } from "@tanstack/react-query";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getMyRole, type HouseRole } from "@/lib/roles";

export function useHouseRole() {
  const { user, isPending } = useCurrentUserState();
  const roleQuery = useQuery({
    queryKey: ["house-role", user?.id],
    enabled: Boolean(user),
    queryFn: () => getMyRole(),
    staleTime: 30_000,
  });
  const role: HouseRole | null = user ? (roleQuery.data?.role ?? null) : null;
  return {
    user,
    isPending: isPending || (Boolean(user) && roleQuery.isPending),
    role,
    identity: roleQuery.data ?? null,
    isAdmin: role === "admin",
    isDesigner: role === "designer" || role === "admin",
    isClient: role === "client",
  };
}

export function pathForRole(role: HouseRole | null) {
  if (role === "admin") return "/atelier-house";
  if (role === "designer") return "/studio";
  return "/account";
}
