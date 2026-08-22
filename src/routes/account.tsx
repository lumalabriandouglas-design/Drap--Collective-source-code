import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Price } from "@/components/price";
import { Button } from "@/components/ui/button";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { listOrders, listSavedProducts } from "@/lib/commerce";
import { getMyStudio } from "@/lib/studio";
import { useHouseRole } from "@/lib/use-role";

export const Route = createFileRoute("/account")({ component: Account });

function Account() {
  const { user, isPending, isAdmin, isDesigner } = useHouseRole();
  const orders = useQuery({ queryKey: ["orders"], enabled: Boolean(user), queryFn: () => listOrders() });
  const saved = useQuery({ queryKey: ["saved"], enabled: Boolean(user), queryFn: () => listSavedProducts() });
  const studio = useQuery({ queryKey: ["studio"], enabled: Boolean(user), queryFn: () => getMyStudio() });

  if (isPending) return <main className="min-h-dvh bg-ivory-50 pt-28" />;
  if (!user) return <RedirectToSignIn />;

  return (
    <main className="mx-auto max-w-5xl px-4 pt-24 pb-20 sm:px-6 lg:pt-28">
      <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-gold-600">Account</p>
      <h1 className="mt-2 font-serif text-4xl text-charcoal-800">{user.displayName ?? (isDesigner ? "Atelier" : "Collector")}</h1>
      <p className="mt-2 text-sm text-charcoal-500">{user.primaryEmail}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        {isDesigner && (
          <Button asChild variant="outline"><Link to="/studio">{studio.data?.atelier ? "Your atelier" : "Open an atelier"}</Link></Button>
        )}
        {!isDesigner && (
          <Button asChild variant="outline"><Link to="/studio">Sell with Drapé</Link></Button>
        )}
        {isAdmin && (
          <Button asChild><Link to="/atelier-house">House ledger</Link></Button>
        )}
      </div>
      <div className="gold-line my-10" />
      <section>
        <h2 className="font-serif text-2xl text-charcoal-800">Orders</h2>
        {(orders.data ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-charcoal-400">No orders yet.</p>
        ) : (
          <ul className="mt-6 space-y-4">
            {(orders.data ?? []).map((order) => (
              <li key={order.id} className="rounded-2xl border border-border bg-ivory-50 p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm text-charcoal-700">Order {order.id} · {order.status}</p>
                  <Price cents={order.totalCents} className="text-sm" />
                </div>
                <p className="mt-1 text-xs text-charcoal-400">{order.shippingName}, {order.shippingCity}, {order.shippingCountry}</p>
                <ul className="mt-3 space-y-1 text-sm text-charcoal-600">
                  {order.items.map((item, i) => (
                    <li key={`${item.name}-${i}`}>{item.name} · {item.size} × {item.qty}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="mt-14">
        <h2 className="font-serif text-2xl text-charcoal-800">Saved</h2>
        {(saved.data ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-charcoal-400">Nothing saved. Heart a piece to keep it here.</p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {(saved.data ?? []).map((item) => (
              <Link key={item.id} to="/shop/$slug" params={{ slug: item.slug }} className="group block">
                <div className="aspect-portrait overflow-hidden rounded-xl bg-ivory-100">
                  {item.image && <img src={item.image} alt={item.name} className="img-cover" />}
                </div>
                <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-charcoal-400">{item.designer_name}</p>
                <p className="font-serif text-charcoal-800">{item.name}</p>
                <Price cents={Number(item.price_cents)} className="text-sm" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
