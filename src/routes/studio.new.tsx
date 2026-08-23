import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { HouseRoom, RoomSkeleton } from "@/components/house-room";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { houseError } from "@/lib/errors";
import { PRODUCT_CATEGORIES, PRODUCT_SIZES } from "@/lib/constants";
import { compressImage, formatBytes } from "@/lib/media";
import { listPiece, storageStatus, uploadPiecePhoto } from "@/lib/studio";
import { useHouseRole } from "@/lib/use-role";

export const Route = createFileRoute("/studio/new")({ component: NewPiece });

function NewPiece() {
  const { user, isPending, isDesigner } = useHouseRole();
  const navigate = useNavigate();
  const client = useQueryClient();
  const storage = useQuery({ queryKey: ["storage"], queryFn: () => storageStatus() });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "Ready-to-Wear",
    price: "150000",
    leadTime: "Made to order · inquire",
    imageUrl: "",
    sizes: ["S", "M", "L"] as string[],
  });

  if (isPending) return <RoomSkeleton cards={2} />;
  if (!user) return <RedirectToSignIn />;
  if (!isDesigner) {
    return (
      <HouseRoom eyebrow="Studio" title="Open an atelier first" lede="Listing is for designers already on the floor.">
        <Button asChild>
          <Link to="/studio">Designer studio</Link>
        </Button>
      </HouseRoom>
    );
  }

  function toggleSize(size: string) {
    setForm((prev) => ({
      ...prev,
      sizes: prev.sizes.includes(size)
        ? prev.sizes.filter((s) => s !== size)
        : [...prev.sizes, size],
    }));
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    try {
      setNote("Compressing for the floor…");
      const result = await compressImage(file);
      setNote(
        `Stored ${formatBytes(result.compressedSize)} from ${formatBytes(result.originalSize)} · ${result.width}×${result.height}`,
      );
      const uploaded = await uploadPiecePhoto({
        data: {
          filename: result.file.name,
          mime: result.mimeType,
          data: result.dataUrl,
        },
      });
      setForm((prev) => ({ ...prev, imageUrl: uploaded.url }));
      if (uploaded.backend === "r2") {
        setNote((prev) => `${prev ?? "Photo ready"} · Cloudflare`);
      }
    } catch (err) {
      toast.error(houseError(err));
      setNote(null);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.imageUrl) {
      toast("Add a photograph of the piece");
      return;
    }
    setBusy(true);
    try {
      const result = await listPiece({
        data: {
          name: form.name,
          description: form.description,
          category: form.category,
          price: Number(form.price),
          sizes: form.sizes,
          imageUrl: form.imageUrl,
          leadTime: form.leadTime,
        },
      });
      toast.success("Listed on this preview");
      await client.invalidateQueries({ queryKey: ["studio"] });
      await client.invalidateQueries({ queryKey: ["products"] });
      await client.invalidateQueries({ queryKey: ["designers"] });
      void navigate({ to: "/shop/$slug", params: { slug: result.slug } });
    } catch (err) {
      toast.error(houseError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <HouseRoom
      eyebrow="Studio"
      title="List a piece"
      lede={
        storage.data?.r2
          ? "Photographs go to Cloudflare. The showroom keeps the cloth at full visual quality."
          : "The photograph stays in this preview. Existing live pieces are not overwritten — this listing is only on the preview rail until the house opens it on the floor."
      }
      actions={
        <Button asChild variant="outline">
          <Link to="/studio">Back to studio</Link>
        </Button>
      }
    >
      <form onSubmit={(e) => void onSubmit(e)} className="grid max-w-2xl gap-5">
        <div>
          <Label htmlFor="photo">Photograph</Label>
          <p className="mt-1 text-xs text-charcoal-400">
            We shrink the file for storage. The showroom still displays it at full visual quality.
          </p>
          <Input
            id="photo"
            className="mt-2"
            type="file"
            accept="image/*"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
          {note && <p className="mt-2 text-xs text-charcoal-500">{note}</p>}
          {form.imageUrl && (
            <div className="mt-3 overflow-hidden rounded-xl bg-ivory-100">
              <img src={form.imageUrl} alt="Cover preview" className="aspect-portrait w-full object-cover" />
            </div>
          )}
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
              className="mt-2 h-11 w-full rounded-lg border border-border bg-ivory-50 px-3 text-sm"
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
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-gold-600">
            Sizes
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {PRODUCT_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => toggleSize(size)}
                className={`h-10 rounded-full px-4 text-xs ${
                  form.sizes.includes(size)
                    ? "bg-charcoal-800 text-ivory-50"
                    : "border border-border text-charcoal-600"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
        <Button type="submit" disabled={busy}>
          {busy ? "Listing…" : "List on this preview"}
        </Button>
      </form>
    </HouseRoom>
  );
}
