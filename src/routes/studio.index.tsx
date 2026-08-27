import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, EyeOff, MapPin, Pencil, Trash2 } from "lucide-react";
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
import { isHiddenPiece, isPreviewPiece } from "@/lib/preview-rail";
import { claimRole } from "@/lib/roles";
import { deletePiece, getMyStudio, hidePiece, openAtelier, unhidePiece } from "@/lib/studio";
import type { Product } from "@/lib/types";
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
  const previewPieces = pieces.filter(isPreviewPiece);
  const livePieces = pieces.filter((piece) => !isPreviewPiece(piece));

  async function onOpen(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await openAtelier({ data: form });
      await claimRole({ data: { role: "designer" } });
      toast.success("Your page is open. Copy the link for your clients.");
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
        eyebrow="Studio"
        title="Open your studio"
        lede="Add your name and a short note. Then you can list clothes and send people your page."
        actions={
          isAdmin ? (
            <Button asChild variant="outline">
              <Link to="/atelier-house">Admin</Link>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link to="/account">Account</Link>
            </Button>
          )
        }
      >
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
          <form onSubmit={(e) => void onOpen(e)} className="rounded-2xl border border-charcoal-100 bg-ivory-50 p-6 sm:p-8">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-gold-600">Your name</p>
            <div className="mt-6 grid gap-4">
              <div>
                <Label htmlFor="aname">Brand name</Label>
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
                {busy ? "Opening…" : "Open studio"}
              </Button>
            </div>
          </form>
          <aside className="rounded-2xl bg-charcoal-900 px-6 py-10 text-ivory-50 sm:px-8">
            <p className="text-[10px] uppercase tracking-[0.22em] text-gold-300">Studio</p>
            <h2 className="mt-3 font-serif text-3xl">Your page. Your pieces.</h2>
            <p className="mt-4 text-sm font-light leading-relaxed text-ivory-200">
              If you already sell on Drapé, sign in with that email. Your clothes will show here.
            </p>
          </aside>
        </div>
      </HouseRoom>
    );
  }

  return (
    <HouseRoom
      eyebrow="Studio"
      title={atelier.name}
      lede={`${atelier.city}, ${atelier.country}`}
      actions={
        <>
          {isAdmin && (
            <Button asChild variant="outline">
              <Link to="/atelier-house">Admin</Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link to="/desk">Messages</Link>
          </Button>
          <Button asChild>
            <Link to="/studio/new">Add a piece</Link>
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
              This is your work room. Hide, edit, or remove a piece any time.
            </p>
          )}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <RoomStat label="Pieces" value={pieces.length} />
            <RoomStat label="City" value={atelier.city} />
            <RoomStat label="Role" value={isDesigner ? "Designer" : "Guest"} />
          </div>
          <div className="mt-8">
            <ShowroomShareCard slug={atelier.slug} name={atelier.name} />
          </div>
        </div>
      </section>

      <section className="mt-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-gold-600">Your list</p>
            <h2 className="mt-2 font-serif text-3xl text-charcoal-800">Your pieces</h2>
            <p className="mt-2 max-w-xl text-sm font-light text-charcoal-500">
              Hide, change photos, or remove a listing.
            </p>
          </div>
          <p className="text-xs tabular-nums text-charcoal-400">
            {livePieces.length} live · {previewPieces.length} preview
          </p>
        </div>
        {pieces.length === 0 ? (
          <RoomEmpty
            title="No pieces yet"
            body="Add a piece when you are ready. People will see it on your page."
            action={
              <Button asChild>
                <Link to="/studio/new">Add a piece</Link>
              </Button>
            }
          />
        ) : (
          <StudioRail pieces={pieces} />
        )}
      </section>
    </HouseRoom>
  );
}

function StudioRail({ pieces }: { pieces: Product[] }) {
  const client = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh() {
    await client.invalidateQueries({ queryKey: ["studio"] });
    await client.invalidateQueries({ queryKey: ["products"] });
    await client.invalidateQueries({ queryKey: ["designers"] });
  }

  async function onHide(piece: Product) {
    setBusy(piece.slug);
    try {
      if (isHiddenPiece(piece)) {
        await unhidePiece(piece.slug);
        toast.success("Shown again");
      } else {
        await hidePiece(piece.slug);
        toast.success("Hidden");
      }
      await refresh();
    } catch (err) {
      toast.error(houseError(err));
    } finally {
      setBusy(null);
    }
  }

  async function onDelete(piece: Product) {
    if (!window.confirm(`Remove “${piece.name}”?`)) return;
    setBusy(piece.slug);
    try {
      await deletePiece(piece.slug);
      toast.success("Removed");
      await refresh();
    } catch (err) {
      toast.error(houseError(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <ul className="grid gap-4">
      {pieces.map((piece) => {
        const hidden = isHiddenPiece(piece);
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
                <p className="truncate font-serif text-xl text-charcoal-800">{piece.name}</p>
                {hidden ? (
                  <span className="rounded-full bg-charcoal-800 px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-ivory-50">
                    Hidden
                  </span>
                ) : isPreviewPiece(piece) ? (
                  <span className="rounded-full border border-charcoal-200 px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-charcoal-500">
                    Preview
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
                onClick={() => void onDelete(piece)}
              >
                <Trash2 size={14} />
                Remove
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
