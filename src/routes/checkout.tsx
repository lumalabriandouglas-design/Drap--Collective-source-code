import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { HouseRoom, RoomEmpty, RoomSkeleton } from "@/components/house-room";
import { Price } from "@/components/price";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { bagTotal, useBag } from "@/lib/bag-store";
import { placeOrder } from "@/lib/commerce";
import { openDeskNote } from "@/lib/desk";
import { getFloorSession } from "@/lib/floor-auth";
import { houseError } from "@/lib/errors";
import { useCurrency } from "@/lib/currency-store";

export const Route = createFileRoute("/checkout")({ component: Checkout });

function Checkout() {
  const { user, isPending } = useCurrentUserState();
  const items = useBag((s) => s.items);
  const clear = useBag((s) => s.clear);
  const currency = useCurrency((s) => s.currency);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    shippingName: "",
    shippingLine1: "",
    shippingCity: "Kampala",
    shippingCountry: "Uganda",
  });

  useEffect(() => {
    if (!user?.displayName) return;
    setForm((prev) => (prev.shippingName ? prev : { ...prev, shippingName: user.displayName ?? "" }));
  }, [user]);

  if (isPending) return <RoomSkeleton cards={2} />;
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
      let deskId: string | null = null;
      if (getFloorSession()) {
        const seen = new Set<string>();
        for (const item of items) {
          const atelierId = item.designerUserId || item.designerSlug;
          if (!atelierId || seen.has(atelierId)) continue;
          seen.add(atelierId);
          const lines = items
            .filter((row) => (row.designerUserId || row.designerSlug) === atelierId)
            .map((row) => `${row.name}, size ${row.size} × ${row.qty}`);
          try {
            const thread = await openDeskNote({
              atelierId,
              atelierName: item.designerName,
              atelierSlug: item.designerSlug,
              pieceSlug: item.slug,
              pieceName: item.name,
              pieceImage: item.image,
              message: `Commission placed with the house.\n${lines.join("\n")}\n${form.shippingName}, ${form.shippingCity}.`,
            });
            deskId = thread.id;
          } catch {
            /* desk is extra */
          }
        }
      }
      clear();
      toast.success(`Commission ${result.orderId} is with the house`);
      if (deskId) void navigate({ to: "/desk/$threadId", params: { threadId: deskId } });
      else void navigate({ to: "/account" });
    } catch (err) {
      toast.error(houseError(err));
    } finally {
      setBusy(false);
    }
  }

  if (!items.length) {
    return (
      <HouseRoom eyebrow="Checkout" title="Nothing to place">
        <RoomEmpty
          title="The bag is empty"
          body="Add a piece from the floor, then the house can take the commission."
          action={
            <Button asChild>
              <Link to="/shop">Return to the shop</Link>
            </Button>
          }
        />
      </HouseRoom>
    );
  }

  return (
    <HouseRoom
      eyebrow="Checkout"
      title="Commission"
      lede="The house records this. Payment is arranged after — not taken here. The atelier is written at the desk."
    >
      <form onSubmit={(e) => void onSubmit(e)} className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,18rem)]">
        <div className="grid gap-4 rounded-2xl border border-charcoal-100 bg-ivory-50 p-6 sm:p-8">
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              className="mt-2"
              required
              autoComplete="name"
              value={form.shippingName}
              onChange={(e) => setForm({ ...form, shippingName: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="line1">Address</Label>
            <Input
              id="line1"
              className="mt-2"
              required
              autoComplete="street-address"
              placeholder="Street, building, plot"
              value={form.shippingLine1}
              onChange={(e) => setForm({ ...form, shippingLine1: e.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                className="mt-2"
                required
                autoComplete="address-level2"
                value={form.shippingCity}
                onChange={(e) => setForm({ ...form, shippingCity: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                className="mt-2"
                required
                autoComplete="country-name"
                value={form.shippingCountry}
                onChange={(e) => setForm({ ...form, shippingCountry: e.target.value })}
              />
            </div>
          </div>
        </div>
        <aside className="h-fit rounded-2xl border border-charcoal-100 bg-ivory-50 p-6">
          <p className="text-[10px] uppercase tracking-[0.16em] text-gold-600">Order</p>
          <ul className="mt-4 space-y-3 text-sm">
            {items.map((item) => (
              <li key={`${item.productId}-${item.size}`} className="flex justify-between gap-3">
                <span className="text-charcoal-600">
                  {item.name} · {item.size} × {item.qty}
                </span>
                <Price cents={item.priceCents * item.qty} />
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between border-t border-charcoal-100 pt-4 font-medium">
            <span>Total</span>
            <Price cents={total} />
          </div>
          <Button type="submit" className="mt-6 w-full" size="lg" disabled={busy}>
            {busy ? "Placing…" : "Place with the house"}
          </Button>
        </aside>
      </form>
    </HouseRoom>
  );
}
