import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Price } from "@/components/price";
import { Button } from "@/components/ui/button";
import { bagCount, bagTotal, useBag } from "@/lib/bag-store";

export const Route = createFileRoute("/bag")({ component: BagPage });

function BagPage() {
  const items = useBag((s) => s.items);
  const setQty = useBag((s) => s.setQty);
  const remove = useBag((s) => s.remove);
  const total = bagTotal(items);
  const count = bagCount(items);

  return (
    <main className="mx-auto max-w-5xl px-4 pt-24 pb-20 sm:px-6 lg:pt-28">
      <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-gold-600">Your bag</p>
      <h1 className="mt-2 font-serif text-4xl text-charcoal-800">
        {count ? `${count} ${count === 1 ? "piece" : "pieces"}` : "The bag is empty"}
      </h1>
      <div className="gold-line my-8" />
      {items.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm text-charcoal-500">Nothing waiting. The floor is open.</p>
          <Button asChild className="mt-6"><Link to="/shop">Shop the collection</Link></Button>
        </div>
      ) : (
        <div className="grid gap-12 lg:grid-cols-[1fr_280px]">
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={`${item.productId}-${item.size}`} className="flex gap-4 py-6">
                <Link to="/shop/$slug" params={{ slug: item.slug }} className="h-36 w-28 shrink-0 overflow-hidden rounded-xl bg-ivory-100">
                  <img src={item.image} alt={item.name} className="size-full object-cover" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-charcoal-400">{item.designerName}</p>
                  <Link to="/shop/$slug" params={{ slug: item.slug }} className="font-serif text-xl text-charcoal-800">{item.name}</Link>
                  <p className="mt-1 text-xs text-charcoal-400">Size {item.size}</p>
                  <Price cents={item.priceCents} className="mt-2 text-sm" />
                  <div className="mt-auto flex items-center gap-3 pt-3">
                    <div className="flex h-10 items-center rounded-full border border-border">
                      <button type="button" className="grid size-10 place-items-center" onClick={() => setQty(item.productId, item.size, item.qty - 1)} aria-label="Decrease quantity"><Minus size={14} /></button>
                      <span className="w-6 text-center text-sm tabular-nums">{item.qty}</span>
                      <button type="button" className="grid size-10 place-items-center" onClick={() => setQty(item.productId, item.size, item.qty + 1)} aria-label="Increase quantity"><Plus size={14} /></button>
                    </div>
                    <button type="button" className="grid size-10 place-items-center text-charcoal-400 hover:text-charcoal-800" onClick={() => remove(item.productId, item.size)} aria-label="Remove"><Trash2 size={15} /></button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <aside className="h-fit rounded-2xl border border-border bg-ivory-50 p-6">
            <p className="text-[10px] uppercase tracking-[0.16em] text-gold-600">Summary</p>
            <div className="mt-4 flex justify-between text-sm">
              <span className="text-charcoal-500">Subtotal</span>
              <Price cents={total} />
            </div>
            <p className="mt-2 text-xs text-charcoal-400">Duties and delivery are confirmed at checkout. Pieces ship from the atelier.</p>
            <Button asChild className="mt-6 w-full" size="lg"><Link to="/checkout">Checkout</Link></Button>
          </aside>
        </div>
      )}
    </main>
  );
}
