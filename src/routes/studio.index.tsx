import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bookmark, Eye, EyeOff, MapPin, Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { HouseRoom, RolePill, RoomEmpty, RoomSkeleton, RoomStat } from "@/components/house-room";
import { LazyImage } from "@/components/lazy-image";
import { ShowroomShareCard } from "@/components/showroom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { ATELIER_BIO_MAX } from "@/lib/constants";
import { houseError } from "@/lib/errors";
import { claimRole } from "@/lib/roles";
import { deletePiece, getMyStudio, hidePiece, openAtelier, reservePiece, unhidePiece } from "@/lib/studio";
import type { Product } from "@/lib/types";
import { useHouseRole } from "@/lib/use-role";

export const Route = createFileRoute("/studio/")({ component: Studio });

function pieceIsHidden(piece: Product) {
  return Boolean(piece.hidden) || piece.tags.includes("hidden");
}

function pieceIsReserved(piece: Product) {
  return Boolean(piece.reserved) || piece.tags.includes("reserved");
}

function Studio() {
  const { user, isPending, isDesigner, isAdmin } = useHouseRole();
  const client = useQueryClient();
  const studio = useQuery({
    queryKey: ["studio"],
    enabled: Boolean(user),
    queryFn: () => getMyStudio(),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  const [form, setForm] = useState({
    name: "",
    city: "Kampala",
    country: "Uganda",
    bio: "",
  });
  const [busy, setBusy] = useState(false);
  const prefilled = useRef(false);

  useEffect(() => {
    if (prefilled.current) return;
    const name = user?.displayName?.trim();
    if (!name) return;
    prefilled.current = true;
    setForm((prev) => (prev.name ? prev : { ...prev, name }));
  }, [user?.displayName]);

  useEffect(() => {
    const onRail = () => void client.invalidateQueries({ queryKey: ["studio"] });
    window.addEventListener("drape-preview-rail", onRail);
    return () => window.removeEventListener("drape-preview-rail", onRail);
  }, [client]);

  if (isPending || (user && studio.isPending)) return <RoomSkeleton />;
  if (!user) return <RedirectToSignIn />;

  const atelier = studio.data?.atelier;
  const pieces = studio.data?.pieces ?? [];
  const cover = atelier?.imageUrl || pieces[0]?.imageUrls[0] || "/images/products/studio-2.jpg";
  const hiddenPieces = pieces.filter(pieceIsHidden);
  const livePieces = pieces.filter((piece) => !pieceIsHidden(piece));

  async function onOpen(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await openAtelier({ data: form });
      await claimRole({ data: { role: "designer" } });
      toast.success("Your showroom is open. Copy the link for your clients.");
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
                <Label htmlFor="bio">Short bio</Label>
                <Textarea
                  id="bio"
                  className="mt-2"
                  required
                  maxLength={ATELIER_BIO_MAX}
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value.slice(0, ATELIER_BIO_MAX) })}
                  placeholder="What do you make, and from where?"
                />
                <p className="mt-1 text-xs tabular-nums text-charcoal-400">
                  {form.bio.length} / {ATELIER_BIO_MAX}
                </p>
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
            <Link to="/s/$slug" params={{ slug: atelier.slug }}>
              Open showroom
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/desk">Collector notes</Link>
          </Button>
          <Button asChild>
            <Link to="/studio/new">List a piece</Link>
          </Button>
        </>
      }
    >
      <section id="pieces" className="mb-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-gold-600">The rail</p>
            <h2 className="mt-2 font-serif text-3xl text-charcoal-800">Your pieces</h2>
            <p className="mt-2 max-w-xl text-sm font-light text-charcoal-500">
              Open a listing, hide it, change photographs, or remove it. Same rail on a phone or a computer.
            </p>
          </div>
          <p className="text-xs tabular-nums text-charcoal-400">
            {livePieces.length} live · {hiddenPieces.length} hidden
          </p>
        </div>
        {pieces.length === 0 ? (
          <RoomEmpty
            title="The rail is empty"
            body={
              user.primaryEmail
                ? `This computer is signed in as ${user.primaryEmail}. Pieces posted on another email or Google account stay with that house — sign out and open the same door you use on your phone.`
                : "Your showroom is open. List a piece when you are ready — collectors will find it on the floor."
            }
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button asChild>
                  <Link to="/studio/new">List a piece</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/account">Account</Link>
                </Button>
              </div>
            }
          />
        ) : (
          <StudioRail pieces={pieces} />
        )}
      </section>

      <section className="grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start">
        <LazyImage
          src={cover}
          alt={atelier.name}
          width={900}
          eager
          className="aspect-[4/5] max-h-80 rounded-2xl object-cover sm:aspect-[3/4] lg:max-h-none"
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
          <div className="mt-8">
            <ShowroomShareCard slug={atelier.slug} name={atelier.name} />
          </div>
        </div>
      </section>
    </HouseRoom>
  );
}

function StudioRail({ pieces }: { pieces: Product[] }) {
  const client = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, setPending] = useState<Product | null>(null);

  async function refresh() {
    await client.invalidateQueries({ queryKey: ["studio"] });
    await client.invalidateQueries({ queryKey: ["products"] });
    await client.invalidateQueries({ queryKey: ["designers"] });
  }

  async function onReserve(piece: Product) {
    setBusy(piece.slug);
    try {
      const next = !pieceIsReserved(piece);
      await reservePiece(piece.slug, next);
      toast.success(next ? "Marked reserved" : "Back for collectors");
      await refresh();
    } catch (err) {
      toast.error(houseError(err));
    } finally {
      setBusy(null);
    }
  }

  async function onHide(piece: Product) {
    setBusy(piece.slug);
    try {
      if (pieceIsHidden(piece)) {
        await unhidePiece(piece.slug);
        toast.success("Back on the floor");
      } else {
        await hidePiece(piece.slug);
        toast.success("Hidden from collectors");
      }
      await refresh();
    } catch (err) {
      toast.error(houseError(err));
    } finally {
      setBusy(null);
    }
  }

  async function confirmDelete() {
    const piece = pending;
    if (!piece) return;
    setBusy(piece.slug);
    try {
      await deletePiece(piece.slug);
      setPending(null);
      toast.success("Removed from the floor and the bucket");
      await refresh();
    } catch (err) {
      toast.error(houseError(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
    <ul className="grid gap-4">
      {pieces.map((piece) => {
        const hidden = pieceIsHidden(piece);
        return (
          <li
            key={piece.slug}
            className="grid gap-4 rounded-2xl border border-charcoal-100 bg-ivory-50 p-3 sm:grid-cols-[7rem_minmax(0,1fr)_auto] sm:items-center sm:p-4"
          >
            <div className="aspect-[3/4] overflow-hidden rounded-xl bg-ivory-100 sm:aspect-auto sm:h-24">
              <img src={piece.imageUrls[0]} alt="" className="size-full object-cover" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-serif text-xl text-charcoal-800">
                  <Link to="/shop/$slug" params={{ slug: piece.slug }} className="hover:text-gold-700">
                    {piece.name}
                  </Link>
                </p>
                {hidden ? (
                  <span className="rounded-full bg-charcoal-800 px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-ivory-50">
                    Hidden
                  </span>
                ) : pieceIsReserved(piece) ? (
                  <span className="rounded-full bg-gold-500 px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-ivory-50">
                    Reserved
                  </span>
                ) : (
                  <span className="rounded-full border border-charcoal-200 px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-charcoal-500">
                    Live
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-charcoal-500">
                {piece.imageUrls.length} photo{piece.imageUrls.length === 1 ? "" : "s"} · {piece.category}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/shop/$slug" params={{ slug: piece.slug }}>
                  Open
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/studio/new" search={{ edit: piece.slug }}>
                  <Pencil size={14} />
                  Edit
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy === piece.slug}
                onClick={() => void onHide(piece)}
              >
                {hidden ? <Eye size={14} /> : <EyeOff size={14} />}
                {hidden ? "Show" : "Hide"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy === piece.slug}
                onClick={() => void onReserve(piece)}
              >
                <Bookmark size={14} fill={pieceIsReserved(piece) ? "currentColor" : "none"} />
                {pieceIsReserved(piece) ? "Unreserve" : "Reserve"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy === piece.slug}
                onClick={() => setPending(piece)}
              >
                <Trash2 size={14} />
                Remove
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
    {pending ? (
      <div className="fixed inset-0 z-[80] flex items-end justify-center bg-charcoal-900/50 p-4 sm:items-center">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-piece-title"
          className="w-full max-w-sm rounded-2xl bg-ivory-50 p-5 shadow-[0_16px_40px_rgb(0_0_0_/_0.18)]"
        >
          <p id="remove-piece-title" className="font-serif text-2xl text-charcoal-800">
            Remove this piece?
          </p>
          <p className="mt-2 text-sm text-charcoal-600">
            “{pending.name}” leaves the floor. Its photographs are deleted from the bucket and cannot be undone.
          </p>
          <div className="mt-5 grid gap-2">
            <Button
              type="button"
              className="w-full bg-charcoal-800 text-ivory-50 hover:bg-charcoal-700"
              disabled={busy === pending.slug}
              onClick={() => void confirmDelete()}
            >
              {busy === pending.slug ? "Removing…" : "Yes, remove it"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={busy === pending.slug}
              onClick={() => setPending(null)}
            >
              Keep it
            </Button>
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
}
