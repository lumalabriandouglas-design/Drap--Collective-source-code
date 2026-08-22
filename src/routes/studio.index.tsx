import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Price } from "@/components/price";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { houseError } from "@/lib/errors";
import { claimRole } from "@/lib/roles";
import { getMyStudio, openAtelier } from "@/lib/studio";
import { useHouseRole } from "@/lib/use-role";

export const Route = createFileRoute("/studio/")({ component: Studio });

function Studio() {
  const { user, isPending } = useHouseRole();
  const client = useQueryClient();
  const studio = useQuery({ queryKey: ["studio"], enabled: Boolean(user), queryFn: () => getMyStudio() });
  const [form, setForm] = useState({ name: "", city: "", country: "", bio: "" });
  const [busy, setBusy] = useState(false);

  if (isPending) return <main className="min-h-dvh bg-ivory-50 pt-28" />;
  if (!user) return <RedirectToSignIn />;

  const atelier = studio.data?.atelier;
  const pieces = studio.data?.pieces ?? [];

  async function onOpen(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await openAtelier({ data: form });
      await claimRole({ data: { role: "designer" } });
      toast.success("Your atelier is open");
      await client.invalidateQueries({ queryKey: ["studio"] });
      await client.invalidateQueries({ queryKey: ["designers"] });
      await client.invalidateQueries({ queryKey: ["house-role"] });
    } catch (err) {
      toast.error(houseError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 pt-24 pb-20 sm:px-6 lg:pt-28">
      <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-gold-600">Designer studio</p>
      <h1 className="mt-2 font-serif text-4xl text-charcoal-800">{atelier ? atelier.name : "Open an atelier"}</h1>
      <p className="mt-3 max-w-xl text-sm font-light text-charcoal-500">
        {atelier ? `${atelier.city}, ${atelier.country}` : "List original work with Drapé. Collectors meet the house; the house keeps the relationship."}
      </p>
      <div className="gold-line my-8" />
      {!atelier && (
        <form onSubmit={(e) => void onOpen(e)} className="grid max-w-lg gap-4">
          <div>
            <Label htmlFor="aname">Atelier name</Label>
            <Input id="aname" className="mt-2" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" className="mt-2" required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Input id="country" className="mt-2" required value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </div>
          </div>
          <div>
            <Label htmlFor="bio">House note</Label>
            <Textarea id="bio" className="mt-2" required value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="What do you make, and from where?" />
          </div>
          <Button type="submit" disabled={busy}>{busy ? "Opening…" : "Open atelier"}</Button>
        </form>
      )}
      {atelier && (
        <div>
          <p className="max-w-2xl text-sm font-light leading-relaxed text-charcoal-500">{atelier.bio}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild><Link to="/studio/new">List a piece</Link></Button>
            <Button asChild variant="outline"><Link to="/s/$slug" params={{ slug: atelier.slug }}>Open showroom</Link></Button>
          </div>
          <h2 className="mt-12 font-serif text-2xl">On the floor</h2>
          {pieces.length === 0 ? (
            <p className="mt-3 text-sm text-charcoal-400">No pieces listed yet.</p>
          ) : (
            <ul className="mt-6 divide-y divide-border">
              {pieces.map((piece) => (
                <li key={piece.id} className="flex items-center gap-4 py-4">
                  <img src={piece.imageUrls[0]} alt="" className="size-16 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <Link to="/shop/$slug" params={{ slug: piece.slug }} className="font-serif text-lg text-charcoal-800">{piece.name}</Link>
                    <p className="text-xs uppercase tracking-[0.12em] text-charcoal-400">{piece.category}</p>
                  </div>
                  <Price cents={piece.priceCents} className="text-sm" />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </main>
  );
}
