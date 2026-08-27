import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { HouseRoom, RolePill, RoomEmpty, RoomSkeleton, RoomStat } from "@/components/house-room";
import { HouseAvatar } from "@/components/house-menu";
import { LazyImage } from "@/components/lazy-image";
import { Price } from "@/components/price";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/client";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { listOrders, listSavedProducts } from "@/lib/commerce";
import { formatDay } from "@/lib/format";
import { getMyStudio } from "@/lib/studio";
import { useHouseRole } from "@/lib/use-role";

export const Route = createFileRoute("/account")({ component: Account });

function Account() {
  const { user, isPending, isAdmin, isDesigner, role } = useHouseRole();
  const [leaving, setLeaving] = useState(false);
  const orders = useQuery({
    queryKey: ["orders"],
    enabled: Boolean(user),
    queryFn: () => listOrders(),
  });
  const saved = useQuery({
    queryKey: ["saved"],
    enabled: Boolean(user),
    queryFn: () => listSavedProducts(),
  });
  const studio = useQuery({
    queryKey: ["studio"],
    enabled: Boolean(user),
    queryFn: () => getMyStudio(),
  });

  if (isPending || (user && (orders.isPending || saved.isPending))) return <RoomSkeleton />;
  if (!user) return <RedirectToSignIn />;

  const orderList = orders.data ?? [];
  const savedList = saved.data ?? [];
  const door = isAdmin ? "House" : isDesigner ? "Atelier" : "Collector";

  return (
    <HouseRoom
      eyebrow="Collector salon"
      title={user.displayName ?? door}
      lede={user.primaryEmail ?? "Your rooms in the house — orders, saved pieces, and the door you entered through."}
      actions={
        <>
          {isDesigner && (
            <Button asChild>
              <Link to="/studio">{studio.data?.atelier ? "Your atelier" : "Open an atelier"}</Link>
            </Button>
          )}
          {!isDesigner && (
            <Button asChild variant="outline">
              <Link to="/studio">Sell with Drapé</Link>
            </Button>
          )}
          {isAdmin && (
            <Button asChild variant="outline">
              <Link to="/atelier-house">House ledger</Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link to="/desk">The desk</Link>
          </Button>
        </>
      }
    >
      <section className="flex flex-col gap-8 sm:flex-row sm:items-center">
        <HouseAvatar
          src={user.profileImageUrl}
          name={user.displayName ?? user.primaryEmail ?? "C"}
          className="size-20 font-serif text-3xl outline outline-1 -outline-offset-1 outline-charcoal-800/10"
        />
        <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
          <RoomStat label="Door" value={door} />
          <RoomStat label="Orders" value={orderList.length} />
          <RoomStat label="Saved" value={savedList.length} />
          <div className="flex items-end rounded-2xl border border-charcoal-100 bg-ivory-50 px-5 py-4">
            <RolePill role={role} />
          </div>
        </div>
      </section>

      <section className="mt-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-gold-600">Wardrobe</p>
            <h2 className="mt-2 font-serif text-3xl text-charcoal-800">Orders</h2>
          </div>
          <Link
            to="/shop"
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-charcoal-400 hover:text-charcoal-800"
          >
            <ShoppingBag size={13} />
            Shop the floor
          </Link>
        </div>
        {orderList.length === 0 ? (
          <RoomEmpty
            title="Nothing commissioned yet"
            body="When you place a piece, it waits here — atelier, size, and the city it travels to."
            action={
              <Button asChild>
                <Link to="/shop">Walk the floor</Link>
              </Button>
            }
          />
        ) : (
          <ul className="space-y-4">
            {orderList.map((order) => (
              <li
                key={order.id}
                className="overflow-hidden rounded-2xl border border-charcoal-100 bg-ivory-50"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-charcoal-100 px-5 py-4">
                  <div>
                    <p className="font-serif text-lg text-charcoal-800">Order {order.id}</p>
                    <p className="mt-0.5 text-xs uppercase tracking-[0.14em] text-charcoal-400">
                      {order.status}
                      {order.createdAt ? ` · ${formatDay(order.createdAt)}` : ""}
                    </p>
                  </div>
                  <Price cents={order.totalCents} className="text-sm text-charcoal-800" />
                </div>
                <ul className="divide-y divide-charcoal-100">
                  {order.items.map((item, i) => (
                    <li key={`${item.name}-${i}`} className="flex items-center gap-4 px-5 py-3">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" className="size-12 rounded-lg object-cover" />
                      ) : (
                        <span className="size-12 rounded-lg bg-ivory-200" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-serif text-charcoal-800">{item.name}</p>
                        <p className="text-[11px] uppercase tracking-[0.12em] text-charcoal-400">
                          {item.designerName} · {item.size} × {item.qty}
                        </p>
                      </div>
                      <Price cents={item.priceCents} className="text-sm text-charcoal-600" />
                    </li>
                  ))}
                </ul>
                <p className="px-5 py-3 text-xs text-charcoal-400">
                  {order.shippingName} · {order.shippingCity}, {order.shippingCountry}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-gold-600">Kept close</p>
            <h2 className="mt-2 font-serif text-3xl text-charcoal-800">Saved</h2>
          </div>
          <Link
            to="/quiz"
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-charcoal-400 hover:text-charcoal-800"
          >
            <Heart size={13} />
            Style quiz
          </Link>
        </div>
        {savedList.length === 0 ? (
          <RoomEmpty
            title="Nothing saved"
            body="Heart a piece on the floor and it waits in this room — a private rail, only yours."
            action={
              <Button asChild variant="outline">
                <Link to="/shop">Find a piece</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
            {savedList.map((item) => (
              <Link key={item.id} to="/shop/$slug" params={{ slug: item.slug }} className="group block">
                <LazyImage
                  src={item.image || "/images/products/studio-2.jpg"}
                  alt={item.name}
                  className="aspect-portrait rounded-xl"
                  imgClassName="transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                />
                <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.1em] text-charcoal-400">
                  {item.designer_name}
                </p>
                <p className="font-serif text-[15px] text-charcoal-800 group-hover:text-charcoal-600">
                  {item.name}
                </p>
                <Price cents={Number(item.price_cents)} className="mt-1.5 block text-sm text-charcoal-700" />
              </Link>
            ))}
          </div>
        )}
      </section>

      <p className="mt-16 text-center">
        <button
          type="button"
          disabled={leaving}
          className="text-[11px] uppercase tracking-[0.16em] text-charcoal-400 hover:text-charcoal-800"
          onClick={() => {
            setLeaving(true);
            void signOut("/").catch(() => setLeaving(false));
          }}
        >
          {leaving ? "Leaving…" : "Leave the house"}
        </button>
      </p>
    </HouseRoom>
  );
}
