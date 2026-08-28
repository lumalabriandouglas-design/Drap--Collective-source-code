import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { HouseRoom, RoomSkeleton } from "@/components/house-room";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { houseError } from "@/lib/errors";
import { MAX_PHOTOS_PER_PIECE, PRODUCT_CATEGORIES, PRODUCT_SIZES } from "@/lib/constants";
import { clearListingDraft, draftIsUseful, readListingDraft, saveListingDraft } from "@/lib/listing-draft";
import { compressImage, formatBytes } from "@/lib/media";
import {
  getOwnedPiece,
  getMyStudio,
  listPiece,
  storageStatus,
  updatePiece,
  uploadPiecePhoto,
} from "@/lib/studio";
import { useHouseRole } from "@/lib/use-role";

export const Route = createFileRoute("/studio/new")({
  validateSearch: (search: Record<string, unknown>): { edit?: string } => {
    if (typeof search.edit === "string" && search.edit) return { edit: search.edit };
    return {};
  },
  component: NewPiece,
});

type FormState = {
  name: string;
  description: string;
  category: string;
  price: string;
  leadTime: string;
  imageUrls: string[];
  sizes: string[];
};

const emptyForm = (): FormState => ({
  name: "",
  description: "",
  category: "Ready-to-Wear",
  price: "150000",
  leadTime: "Made to order · inquire",
  imageUrls: [],
  sizes: ["S", "M", "L"],
});

function NewPiece() {
  const { user, isPending, isDesigner } = useHouseRole();
  const navigate = useNavigate();
  const { edit } = Route.useSearch();
  const client = useQueryClient();
  const storage = useQuery({ queryKey: ["storage"], queryFn: () => storageStatus() });
  const studio = useQuery({
    queryKey: ["studio"],
    enabled: Boolean(user),
    queryFn: () => getMyStudio(),
  });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [draftBanner, setDraftBanner] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const loadedEdit = useRef(false);

  useEffect(() => {
    if (edit || loadedEdit.current) return;
    const draft = readListingDraft();
    if (!draftIsUseful(draft) || !draft) return;
    loadedEdit.current = true;
    setForm({
      name: draft.name,
      description: draft.description,
      category: draft.category || "Ready-to-Wear",
      price: draft.price || "150000",
      leadTime: draft.leadTime,
      imageUrls: draft.imageUrls ?? [],
      sizes: draft.sizes?.length ? draft.sizes : ["S", "M", "L"],
    });
    setDraftBanner(true);
  }, [edit]);

  useEffect(() => {
    if (!edit || loadedEdit.current) return;
    void getOwnedPiece(edit).then((piece) => {
      if (!piece) return;
      loadedEdit.current = true;
      setForm({
        name: piece.name,
        description: piece.description,
        category: piece.category,
        price: String(piece.priceCents),
        leadTime: piece.leadTime || "Made to order · inquire",
        imageUrls: piece.imageUrls,
        sizes: piece.sizes.length ? piece.sizes : ["M"],
      });
    });
  }, [edit]);

  useEffect(() => {
    if (edit) return;
    const handle = window.setTimeout(() => {
      saveListingDraft(form);
    }, 400);
    return () => window.clearTimeout(handle);
  }, [form, edit]);

  if (isPending || (user && studio.isPending)) return <RoomSkeleton cards={2} />;
  if (!user) return <RedirectToSignIn />;
  if (!isDesigner || !studio.data?.atelier) {
    return (
      <HouseRoom eyebrow="Studio" title="Open an atelier first" lede="Your showroom is the door you send to clients. Open it, then list.">
        <Button asChild>
          <Link to="/studio">Designer studio</Link>
        </Button>
      </HouseRoom>
    );
  }

  function toggleSize(size: string) {
    setForm((prev) => ({
      ...prev,
      sizes: prev.sizes.includes(size) ? prev.sizes.filter((s) => s !== size) : [...prev.sizes, size],
    }));
  }

  function removePhoto(index: number) {
    setForm((prev) => ({ ...prev, imageUrls: prev.imageUrls.filter((_, i) => i !== index) }));
  }

  async function onFiles(list: FileList | null) {
    const files = list ? Array.from(list) : [];
    if (!files.length) return;
    const remaining = MAX_PHOTOS_PER_PIECE - form.imageUrls.length;
    if (remaining <= 0) {
      toast("Five photographs is the limit for one piece");
      return;
    }
    const batch = files.slice(0, remaining);
    try {
      for (const file of batch) {
        setNote("Compressing for the floor…");
        const result = await compressImage(file, { maxBytes: 280 * 1024, maxEdge: 1200 });
        const uploaded = await uploadPiecePhoto({
          data: {
            filename: result.file.name,
            mime: result.mimeType,
            data: result.dataUrl,
          },
        });
        setForm((prev) => {
          if (prev.imageUrls.length >= MAX_PHOTOS_PER_PIECE) return prev;
          return { ...prev, imageUrls: [...prev.imageUrls, uploaded.url] };
        });
        setNote(
          uploaded.backend === "r2"
            ? `On Cloudflare · ${formatBytes(result.compressedSize)}`
            : `Saved to the house · ${formatBytes(result.compressedSize)} · ${result.width}×${result.height}`,
        );
      }
    } catch (err) {
      toast.error(houseError(err));
      setNote(null);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.imageUrls.length) {
      toast("Add a photograph of the piece");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        category: form.category,
        price: Number(form.price),
        sizes: form.sizes,
        imageUrls: form.imageUrls,
        leadTime: form.leadTime,
      };
      const result = edit
        ? await updatePiece({ data: { ...payload, slug: edit } })
        : await listPiece({ data: payload });
      clearListingDraft();
      toast.success(edit ? "Piece updated on the floor" : "Listed on the floor");
      await client.invalidateQueries({ queryKey: ["studio"] });
      await client.invalidateQueries({ queryKey: ["products"] });
      await client.invalidateQueries({ queryKey: ["designers"] });
      await client.invalidateQueries({ queryKey: ["designer"] });
      if (edit) void navigate({ to: "/studio" });
      else void navigate({ to: "/shop/$slug", params: { slug: result.slug } });
    } catch (err) {
      toast.error(houseError(err));
    } finally {
      setBusy(false);
    }
  }

  const slotsLeft = MAX_PHOTOS_PER_PIECE - form.imageUrls.length;

  return (
    <HouseRoom
      eyebrow="Studio"
      title={edit ? "Edit a piece" : "List a piece"}
      lede={
        storage.data?.r2
          ? "Up to five photographs. They go to Cloudflare — the house only keeps your account."
          : "Up to five photographs. They are stored with the house. Cloudflare stays behind the drapes until its keys are set."
      }
      actions={
        <Button asChild variant="outline">
          <Link to="/studio">Back to studio</Link>
        </Button>
      }
    >
      {draftBanner && !edit ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-charcoal-100 bg-ivory-50 px-4 py-3">
          <p className="text-sm text-charcoal-600">A draft was waiting from last time. Continue, or start over.</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              clearListingDraft();
              setForm(emptyForm());
              setDraftBanner(false);
            }}
          >
            Discard draft
          </Button>
        </div>
      ) : null}
      <form onSubmit={(e) => void onSubmit(e)} className="grid max-w-2xl gap-5">
        <div>
          <Label htmlFor="photo">Photographs</Label>
          <p className="mt-1 text-xs text-charcoal-400">
            Up to {MAX_PHOTOS_PER_PIECE}. The first is the cover. We shrink the files so phones stay light.
          </p>
          {form.imageUrls.length > 0 && (
            <ul className="mt-3 grid grid-cols-5 gap-2">
              {form.imageUrls.map((src, i) => (
                <li key={`${src.slice(0, 24)}-${i}`} className="relative">
                  <div className="aspect-[3/4] overflow-hidden rounded-xl bg-ivory-100">
                    <img src={src} alt="" className="size-full object-cover" />
                  </div>
                  {i === 0 && (
                    <span className="absolute bottom-1 left-1 rounded-full bg-charcoal-800 px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-ivory-50">
                      Cover
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label="Remove photograph"
                    className="absolute top-1 right-1 grid size-8 place-items-center rounded-full bg-charcoal-800/80 text-ivory-50"
                    onClick={() => removePhoto(i)}
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {slotsLeft > 0 && (
            <Input
              id="photo"
              className="mt-3"
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                void onFiles(e.target.files);
                e.target.value = "";
              }}
            />
          )}
          {note && <p className="mt-2 text-xs text-charcoal-500">{note}</p>}
          <p className="mt-1 text-xs tabular-nums text-charcoal-400">
            {form.imageUrls.length} / {MAX_PHOTOS_PER_PIECE}
          </p>
        </div>
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            className="mt-2"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="desc">Atelier note</Label>
          <Textarea
            id="desc"
            className="mt-2"
            required
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="cat">Category</Label>
            <select
              id="cat"
              className="mt-2 h-11 w-full rounded-lg border border-charcoal-200 bg-ivory-50 px-3 text-sm"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="price">Price (UGX)</Label>
            <Input
              id="price"
              className="mt-2"
              type="number"
              min={5000}
              step="1000"
              required
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="lead">Lead time</Label>
          <Input
            id="lead"
            className="mt-2"
            value={form.leadTime}
            onChange={(e) => setForm({ ...form, leadTime: e.target.value })}
          />
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-gold-600">Sizes</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {PRODUCT_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => toggleSize(size)}
                className={`h-11 rounded-full px-4 text-xs ${
                  form.sizes.includes(size)
                    ? "bg-charcoal-800 text-ivory-50"
                    : "border border-charcoal-200 text-charcoal-600"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
        <Button type="submit" disabled={busy}>
          {busy ? (edit ? "Saving…" : "Publishing…") : edit ? "Save changes" : "List this piece"}
        </Button>
      </form>
    </HouseRoom>
  );
}
