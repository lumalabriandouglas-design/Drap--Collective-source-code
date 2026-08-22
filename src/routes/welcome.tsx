import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { getMyRole } from "@/lib/roles";
import { pathForRole, useHouseRole } from "@/lib/use-role";

export const Route = createFileRoute("/welcome")({ component: Welcome });

function Welcome() {
  const navigate = useNavigate();
  const { user, isPending, role } = useHouseRole();

  useEffect(() => {
    if (isPending) return;
    if (!user) return;
    void (async () => {
      const identity = role ? { role } : await getMyRole();
      const dest = pathForRole(identity.role);
      if (dest === "/atelier-house") void navigate({ to: "/atelier-house", replace: true });
      else if (dest === "/studio") void navigate({ to: "/studio", replace: true });
      else void navigate({ to: "/account", replace: true });
    })();
  }, [isPending, navigate, role, user]);

  if (!isPending && !user) return <RedirectToSignIn />;

  return (
    <main className="grid min-h-dvh place-items-center bg-ivory-50">
      <p className="text-[11px] uppercase tracking-[0.22em] text-charcoal-400">Opening your room…</p>
    </main>
  );
}
