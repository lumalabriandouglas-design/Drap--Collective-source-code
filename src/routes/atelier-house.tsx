import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { NotInHouse } from "@/components/not-in-house";
import { HouseRoom, RolePill, RoomEmpty, RoomSkeleton, RoomStat } from "@/components/house-room";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDay } from "@/lib/format";
import { adminLedger } from "@/lib/roles";
import { useHouseRole } from "@/lib/use-role";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/atelier-house")({ component: AtelierHouse });

const FILTERS = [
  { id: "all", label: "All" },
  { id: "designer", label: "Ateliers" },
  { id: "customer", label: "Collectors" },
] as const;
type Filter = (typeof FILTERS)[number]["id"];

function AtelierHouse() {
  const { isPending, isAdmin } = useHouseRole();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const ledger = useQuery({
    queryKey: ["admin-ledger"],
    enabled: isAdmin,
    queryFn: () => adminLedger(),
  });

  const profiles = ledger.data?.profiles ?? [];
  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return profiles
      .filter((profile) => {
        const role = (profile.role ?? "customer").toLowerCase();
        if (filter === "designer" && role !== "designer" && !profile.brand_name) return false;
        if (filter === "customer" && role !== "customer" && role !== "client") return false;
        if (!needle) return true;
        const hay = [profile.email, profile.brand_name, profile.username, profile.location, profile.role]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(needle);
      })
      .sort((a, b) => {
        const named = Number(Boolean(b.brand_name?.trim())) - Number(Boolean(a.brand_name?.trim()));
        if (named) return named;
        return String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""));
      });
  }, [profiles, q, filter]);

  if (isPending || (isAdmin && ledger.isPending)) return <RoomSkeleton />;
  if (!isAdmin) return <NotInHouse />;

  const ateliers = profiles.filter((p) => p.role === "designer" || p.brand_name).length;
  const houses = profiles.filter((p) => p.brand_name).length;

  return (
    <HouseRoom
      eyebrow="Private ledger"
      title="The house"
      lede="Accounts already on the floor stay. New collectors and designers join through the public door. This room is not on the shop."
      actions={
        <>
          <Button asChild variant="outline">
            <Link to="/studio">Studio</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/shop">Shop</Link>
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <RoomStat label="Ateliers on the floor" value={ateliers} />
        <RoomStat label="Houses named" value={houses} />
        <RoomStat label="On the book" value={profiles.length} />
        <RoomStat label="Orders here" value={ledger.data?.localOrders ?? "—"} />
      </div>

      <section className="mt-14">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-gold-600">The book</p>
            <h2 className="mt-2 font-serif text-3xl text-charcoal-800">Recognized emails</h2>
          </div>
          <p className="text-xs tabular-nums text-charcoal-400">
            {visible.length} of {profiles.length}
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search a house, email, city…"
            className="sm:max-w-sm"
            aria-label="Search the ledger"
          />
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={cn(
                  "h-10 rounded-full px-4 text-[10px] font-medium uppercase tracking-[0.14em] transition-colors",
                  filter === item.id
                    ? "bg-charcoal-800 text-ivory-50"
                    : "border border-charcoal-200 text-charcoal-500 hover:border-charcoal-400",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="mt-8">
            <RoomEmpty
              title="No one matches"
              body="Try another name, or clear the filter. The live floor is still the source of truth."
            />
          </div>
        ) : (
          <ul className="mt-8 divide-y divide-charcoal-100 rounded-2xl border border-charcoal-100 bg-ivory-50">
            {visible.map((profile) => {
              const name = profile.brand_name?.trim() || profile.username?.trim() || "Independent";
              return (
                <li
                  key={profile.email ?? profile.username ?? name}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-serif text-lg text-charcoal-800">{name}</p>
                    <p className="truncate text-xs text-charcoal-400">{profile.email ?? "No email on file"}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                    {profile.location ? (
                      <p className="text-xs uppercase tracking-[0.12em] text-charcoal-400">{profile.location}</p>
                    ) : null}
                    {profile.created_at ? (
                      <p className="text-xs tabular-nums text-charcoal-300">{formatDay(profile.created_at)}</p>
                    ) : null}
                    {profile.status && !/active|approved/i.test(profile.status) ? (
                      <p className="text-[10px] uppercase tracking-[0.14em] text-charcoal-400">{profile.status}</p>
                    ) : null}
                    <RolePill role={profile.role} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </HouseRoom>
  );
}
