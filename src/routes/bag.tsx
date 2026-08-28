import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2 } from "lucide-react";
import { HouseRoom, RoomEmpty } from "@/components/house-room";
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
    <HouseRoom
      eyebrow="Your bag"
      title={count ? `${count} ${count === 1 ? "piece" : "pieces"}` : "The bag is empty"}
      lede={count ? "Commissions stay with the house. The atelier is written at the desk when you place." : undefined}
    >
      {items.length === 0 ? (
        <RoomEmpty
          title="Nothing waiting"
          body="The floor is open. Heart a piece, or write to the atelier from the cloth itself."
          action={
            <Button asChild>
              <Link to="/shop">Shop the collection</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,18rem)]">
          <ul className="divide-y divide-charcoal-100 rounded-2xl border border-charcoal-100 bg-ivory-50 px-4 sm:px-6">
            {items.map((item) => (
              <li key={`${item.productId}-${item.size}`} className="flex gap-4 py-6">
                <Link
                  to="/shop/$slug"
                  params={{ slug: item.slug }}
                  className="h-36 w-28 shrink-0 overflow-hidden rounded-xl bg-ivory-100"
                >
                  <img src={item.image} alt={item.name} className="size-full object-cover" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-charcoal-400">{item.designerName}</p>
                  <Link to="/shop/$slug" params={{ slug: item.slug }} className="font-serif text-xl text-charcoal-800">
                    {item.name}
                  </Link>
                  <p className="mt-1 text-xs text-charcoal-400">Size {item.size}</p>
                  <Price cents={item.priceCents} className="mt-2 text-sm" />
                  <div className="mt-auto flex items-center gap-3 pt-3">
                    <div className="flex h-11 items-center rounded-full border border-charcoal-200">
                      <button
                        type="button"
                        className="grid size-11 place-items-center"
                        onClick={() => setQty(item.productId, item.size, item.qty - 1)}
                        aria-label="Decrease quantity"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-6 text-center text-sm tabular-nums">{item.qty}</span>
                      <button
                        type="button"
                        className="grid size-11 place-items-center"
                        onClick={() => setQty(item.productId, item.size, item.qty + 1)}
                        aria-label="Increase quantity"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <button
                      type="button"
                      className="grid size-11 place-items-center text-charcoal-400 hover:text-charcoal-800"
                      onClick={() => remove(item.productId, item.size)}
                      aria-label="Remove"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <aside className="h-fit rounded-2xl border border-charcoal-100 bg-ivory-50 p-6">
            <p className="text-[10px] uppercase tracking-[0.16em] text-gold-600">Summary</p>
            <div className="mt-4 flex justify-between text-sm">
              <span className="text-charcoal-500">Subtotal</span>
              <Price cents={total} />
            </div>
            <p className="mt-3 text-xs font-light leading-relaxed text-charcoal-400">
              The house records the commission. Payment is arranged after — not taken on this page.
            </p>
            <Button asChild className="mt-6 w-full" size="lg">
              <Link to="/checkout">Place with the house</Link>
            </Button>
          </aside>
        </div>
      )}
    </HouseRoom>
  );
}
