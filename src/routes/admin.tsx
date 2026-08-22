import { createFileRoute, Navigate } from "@tanstack/react-router";
import { NotInHouse } from "@/components/not-in-house";
import { useHouseRole } from "@/lib/use-role";

export const Route = createFileRoute("/admin")({ component: AdminAlias });

function AdminAlias() {
  const { isPending, isAdmin } = useHouseRole();
  if (isPending) return <main className="min-h-dvh bg-ivory-50" />;
  if (isAdmin) return <Navigate to="/atelier-house" />;
  return <NotInHouse />;
}
