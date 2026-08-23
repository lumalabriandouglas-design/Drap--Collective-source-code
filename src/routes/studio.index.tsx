import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, MapPin } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { HouseRoom, RolePill, RoomEmpty, RoomSkeleton, RoomStat } from "@/components/house-room";
import { LazyImage } from "@/components/lazy-image";
import { ProductGrid } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { houseError } from "@/lib/errors";
import { claimRole } from "@/lib/roles";
import { getMyStudio, openAtelier } from "@/lib/studio";
import { isPreviewPiece } from "@/lib/preview-rail";
import { useHouseRole } from "@/lib/use-role";

export const Route = createFileRoute("/studio/")({ component: Studio });

function Studio() {
  const { user, isPending, isDesigner, isAdmin } = useHouseRole();
  const client = useQueryClient();
  const studio = useQuery({
    queryKey: ["studio"],
    enabled: Boolean(user),
    queryFn: () => getMyStudio(),
  });
  const [form, setForm] = useState({
    name: "",
    city: "Kampala",
    country: "Uganda",
    bio: "",
  });
  const [busy, setBusy] = useState(false);

  if (isPending || (user && studio.isPending)) return <RoomSkeleton />;
  if (!user) return <RedirectToSignIn />;

  const atelier = studio.data?.atelier;
  const pieces = studio.data?.pieces ?? [];
  const cover = atelier?.imageUrl || pieces[0]?.imageUrls[0] || "/images/products/studio-2.jpg";
  const previewPieces = pieces.filter(isPreviewPiece);
  const livePieces = pieces.filter((piece) => !isPreviewPiece(piece));

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

  if (!atelier) {
    return (
      <HouseRoom
        eyebrow="Designer studio"
        title="Open an atelier"
        lede="List original work with Drapé. Collectors meet the house; the house keeps the relationship."
        actions={
          isAdmin ? (
            <Button asChild variant="outline">
              <Link to="/atelier-house">House ledger</Link>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link to="/account">Your account</Link>
            </Button>
          )
        }
      >
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
          <form onSubmit={(e) => void onOpen(e)} className="rounded-2xl border border-charcoal-100 bg-ivory-50 p-6 sm:p-8">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-gold-600">Atelier door</p>
            <div className="mt-6 grid gap-4">
              <div>
                <Label htmlFor="aname">Atelier name</Label>
                <Input
                  id="aname"
                  className="mt-2"
                  required
                  placeholder="House of…"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    className="mt-2"
                    required
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    className="mt-2"
                    required
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="bio">House note</Label>
                <Textarea
                  id="bio"
                  className="mt-2"
                  required
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="What do you make, and from where?"
                />
              </div>
              <Button type="submit" disabled={busy}>
                {busy ? "Opening…" : "Open atelier"}
              </Button>
            </div>
          </form>
          <aside className="rounded-2xl bg-charcoal-900 px-6 py-10 text-ivory-50 sm:px-8">
            <p className="text-[10px] uppercase tracking-[0.22em] text-gold-300">The floor</p>
            <h2 className="mt-3 font-serif text-3xl">A private showroom, not a stall.</h2>
            <p className="mt-4 text-sm font-light leading-relaxed text-ivory-200">
              Existing Kampala houses already sit on the live floor. Sign in with that email and your pieces appear here — House of Zion, Tassy Stitches, Ensemble, UCJ, May Stitches.
            </p>
          </aside>
        </div>
      </HouseRoom>
    );
  }

  return (
    <HouseRoom
      eyebrow="Designer studio"
      title={atelier.name}
      lede={`${atelier.city}, ${atelier.country}`}
      actions={
        <>
          {isAdmin && (
            <Button asChild variant="outline">
              <Link to="/atelier-house">House ledger</Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link to="/desk">Collector notes</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/s/$slug" params={{ slug: atelier.slug }}>
              Open showroom
              <ArrowUpRight size={14} />
            </Link>
          </Button>
          <Button asChild>
            <Link to="/studio/new">List a piece</Link>
          </Button>
        </>
      }
    >
      <section className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
        <LazyImage
          src={cover}
          alt={atelier.name}
          width={900}
          eager
          className="aspect-[4/5] rounded-2xl sm:aspect-[3/4]"
        />
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <RolePill role={isAdmin ? "admin" : "designer"} />
            <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-charcoal-400">
              <MapPin size={12} />
              {atelier.city}
            </p>
          </div>
          {atelier.bio ? (
            <p className="mt-5 max-w-xl font-serif text-xl leading-snug text-pretty text-charcoal-700">
              {atelier.bio}
            </p>
          ) : (
            <p className="mt-5 max-w-xl text-sm font-light text-charcoal-500">
              Your pieces are already on the Kampala floor. The showroom is the public door; this room is yours.
            </p>
          )}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <RoomStat label="On the floor" value={pieces.length} />
            <RoomStat label="City" value={atelier.city} />
            <RoomStat label="Door" value={isDesigner ? "Atelier" : "Guest"} />
          </div>
        </div>
      </section>

      <section className="mt-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-gold-600">The rail</p>
            <h2 className="mt-2 font-serif text-3xl text-charcoal-800">On the floor</h2>
          </div>
          <p className="text-xs tabular-nums text-charcoal-400">
            {livePieces.length} live · {previewPieces.length} preview
          </p>
        </div>
        {livePieces.length === 0 && previewPieces.length === 0 ? (
          <RoomEmpty
            title="The rail is empty"
            body="Your atelier is open. List a piece when you are ready — it will sit on this preview until the house opens it on the live floor."
            action={
              <Button asChild>
                <Link to="/studio/new">List a piece</Link>
              </Button>
            }
          />
        ) : (
          <>
            {livePieces.length > 0 ? <ProductGrid products={livePieces} showDesigner={false} /> : null}
            {previewPieces.length > 0 ? (
              <div className="mt-14">
                <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-gold-600">On this preview</p>
                <h3 className="mt-2 font-serif text-2xl text-charcoal-800">Not yet on the live floor</h3>
                <p className="mt-2 max-w-xl text-sm font-light text-charcoal-500">
                  These pieces are only in this preview. The Kampala houses already listed stay as they are.
                </p>
                <div className="mt-8">
                  <ProductGrid products={previewPieces} showDesigner={false} />
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>
    </HouseRoom>
  );
}
