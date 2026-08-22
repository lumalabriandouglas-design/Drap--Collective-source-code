import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { NotInHouse } from "@/components/not-in-house";
import { adminLedger } from "@/lib/roles";
import { useHouseRole } from "@/lib/use-role";

export const Route = createFileRoute("/atelier-house")({ component: AtelierHouse });

function AtelierHouse() {
  const { isPending, isAdmin } = useHouseRole();
  const ledger = useQuery({
    queryKey: ["admin-ledger"],
    enabled: isAdmin,
    queryFn: () => adminLedger(),
  });

  if (isPending) return <main className="min-h-dvh bg-ivory-50" />;
  if (!isAdmin) return <NotInHouse />;

  const profiles = ledger.data?.profiles ?? [];

  return (
    <main className="mx-auto max-w-6xl px-4 pt-24 pb-20 sm:px-6 lg:pt-28">
      <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-gold-600">Private ledger</p>
      <h1 className="mt-2 font-serif text-4xl text-charcoal-800">The house</h1>
      <p className="mt-2 max-w-xl text-sm text-charcoal-500">Accounts already on the floor stay. New collectors and designers join through the public door.</p>
      <div className="gold-line my-8" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Ateliers on the floor", value: profiles.filter((p) => p.role === "designer").length },
          { label: "Signed-in here", value: ledger.data?.localUsers ?? "—" },
          { label: "Orders", value: ledger.data?.localOrders ?? "—" },
          { label: "Houses", value: profiles.filter((p) => p.brand_name).length },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-border bg-ivory-50 p-5">
            <p className="text-[10px] uppercase tracking-[0.14em] text-charcoal-400">{card.label}</p>
            <p className="mt-2 font-serif text-3xl text-charcoal-800">{card.value}</p>
          </div>
        ))}
      </div>
      <h2 className="mt-14 font-serif text-2xl text-charcoal-800">Recognized emails</h2>
      <ul className="mt-6 divide-y divide-border">
        {profiles.map((profile) => (
          <li key={profile.email ?? profile.username ?? Math.random()} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
            <div>
              <p className="font-serif text-lg text-charcoal-800">{profile.brand_name || profile.username || "Independent"}</p>
              <p className="text-xs text-charcoal-400">{profile.email}</p>
            </div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-charcoal-400">{profile.role}{profile.status ? ` · ${profile.status}` : ""}</p>
          </li>
        ))}
      </ul>
      <p className="mt-10 text-xs text-charcoal-400">
        <Link to="/studio" className="underline-offset-4 hover:underline">Studio</Link>
        {" · "}
        <Link to="/shop" className="underline-offset-4 hover:underline">Shop</Link>
      </p>
    </main>
  );
}
