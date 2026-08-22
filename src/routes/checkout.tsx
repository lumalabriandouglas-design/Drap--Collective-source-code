import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Price } from "@/components/price";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { bagTotal, useBag } from "@/lib/bag-store";
import { placeOrder } from "@/lib/commerce";
import { useCurrency } from "@/lib/currency-store";

export const Route = createFileRoute("/checkout")({ component: Checkout });

function Checkout() {
  const { user, isPending } = useCurrentUserState();
  const items = useBag((s) => s.items);
  const clear = useBag((s) => s.clear);
  const currency = useCurrency((s) => s.currency);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ shippingName: "", shippingLine1: "", shippingCity: "", shippingCountry: "" });

  if (isPending) return <main className="min-h-dvh bg-ivory-50 pt-28" />;
  if (!user) return <RedirectToSignIn />;

  const total = bagTotal(items);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!items.length) return;
    setBusy(true);
    try {
      const result = await placeOrder({
        data: {
          ...form,
          currency,
          items: items.map((item) => ({
            productId: item.productId,
            slug: item.slug,
            name: item.name,
            designerName: item.designerName,
            image: item.image,
            priceCents: item.priceCents,
            size: item.size,
            qty: item.qty,
          })),
        },
      });
      clear();
      toast.success(`Order ${result.orderId} confirmed`);
      void navigate({ to: "/account" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout could not complete");
    } finally {
      setBusy(false);
    }
  }

  if (!items.length) {
    return (
      <main className="mx-auto max-w-xl px-4 pt-32 pb-24 text-center">
        <h1 className="font-serif text-4xl">Nothing to check out</h1>
        <Button asChild className="mt-8"><Link to="/shop">Return to the shop</Link></Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 pt-24 pb-20 sm:px-6 lg:pt-28">
      <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-gold-600">Checkout</p>
      <h1 className="mt-2 font-serif text-4xl text-charcoal-800">Delivery</h1>
      <p className="mt-2 text-sm text-charcoal-500">Payment is recorded with the house. Ateliers ship made-to-order pieces on their lead time.</p>
      <div className="gold-line my-8" />
      <form onSubmit={(e) => void onSubmit(e)} className="grid gap-12 lg:grid-cols-[1fr_280px]">
        <div className="grid gap-4">
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" className="mt-2" required value={form.shippingName} onChange={(e) => setForm({ ...form, shippingName: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="line1">Address</Label>
            <Input id="line1" className="mt-2" required value={form.shippingLine1} onChange={(e) => setForm({ ...form, shippingLine1: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" className="mt-2" required value={form.shippingCity} onChange={(e) => setForm({ ...form, shippingCity: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Input id="country" className="mt-2" required value={form.shippingCountry} onChange={(e) => setForm({ ...form, shippingCountry: e.target.value })} />
            </div>
          </div>
        </div>
        <aside className="h-fit rounded-2xl border border-border bg-ivory-50 p-6">
          <p className="text-[10px] uppercase tracking-[0.16em] text-gold-600">Order</p>
          <ul className="mt-4 space-y-3 text-sm">
            {items.map((item) => (
              <li key={`${item.productId}-${item.size}`} className="flex justify-between gap-3">
                <span className="text-charcoal-600">{item.name} · {item.size} × {item.qty}</span>
                <Price cents={item.priceCents * item.qty} />
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between border-t border-border pt-4 font-medium">
            <span>Total</span>
            <Price cents={total} />
          </div>
          <Button type="submit" className="mt-6 w-full" size="lg" disabled={busy}>{busy ? "Placing…" : "Place order"}</Button>
        </aside>
      </form>
    </main>
  );
}
