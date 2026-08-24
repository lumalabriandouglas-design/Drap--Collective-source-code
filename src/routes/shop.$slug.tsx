import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Heart, MessageCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Price } from "@/components/price";
import { ProductGrid } from "@/components/product-card";
import { LazyImage } from "@/components/lazy-image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useBag } from "@/lib/bag-store";
import { getProduct, listRelated } from "@/lib/catalog";
import { sendInquiry, toggleWishlist } from "@/lib/commerce";
import { isPreviewPiece } from "@/lib/preview-rail";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/shop/$slug")({ component: ProductPage });

function ProductPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { user, isPending } = useCurrentUserState();
  const add = useBag((s) => s.add);
  const productQuery = useQuery({
    queryKey: ["product", slug],
    queryFn: () => getProduct({ data: slug }),
  });
  const product = productQuery.data;
  const related = useQuery({
    queryKey: ["related", slug],
    enabled: Boolean(product),
    queryFn: () =>
      listRelated({
        data: {
          slug,
          category: product!.category,
          designerSlug: product!.designer.slug,
        },
      }),
  });

  const [active, setActive] = useState(0);
  const [size, setSize] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const images = product?.imageUrls?.length
    ? product.imageUrls
    : ["/images/products/studio-2.jpg"];

  const selectedSize = useMemo(() => {
    if (size) return size;
    if (product?.sizes.length === 1) return product.sizes[0];
    return null;
  }, [size, product]);

  if (productQuery.isLoading) {
    return (
      <main className="mx-auto max-w-7xl px-4 pt-28 pb-20">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="aspect-portrait animate-pulse rounded-2xl bg-ivory-100" />
          <div className="h-80 animate-pulse rounded-2xl bg-ivory-100" />
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="mx-auto max-w-xl px-4 pt-32 pb-24 text-center">
        <h1 className="font-serif text-4xl text-charcoal-800">Piece not found</h1>
        <p className="mt-3 text-sm text-charcoal-400">It may have left the floor.</p>
        <Button asChild className="mt-8">
          <Link to="/shop">Return to the shop</Link>
        </Button>
      </main>
    );
  }

  const piece = product;

  function addToBag() {
    if (!selectedSize) {
      toast("Select a size to continue");
      return;
    }
    add({
      productId: piece.id,
      slug: piece.slug,
      name: piece.name,
      designerName: piece.designer.name,
      designerSlug: piece.designer.slug,
      designerUserId: piece.designer.userId,
      image: images[0],
      priceCents: piece.priceCents,
      size: selectedSize,
    });
    toast.success("Added to your bag");
  }

  async function onSave() {
    if (isPending) return;
    if (!user) {
      void navigate({ to: "/login" });
      return;
    }
    try {
      const result = await toggleWishlist({ data: piece.id });
      setSaved(result.saved);
      toast(result.saved ? "Saved to your closet" : "Removed from saved");
    } catch {
      toast.error("Could not update saved pieces");
    }
  }

  async function onEnquire() {
    if (!user) {
      void navigate({ to: "/login" });
      return;
    }
    try {
      const thread = await sendInquiry({
        data: {
          productId: piece.id,
          designerId: piece.designer.id,
          atelierId: piece.designer.userId ?? piece.designer.slug,
          atelierName: piece.designer.name,
          atelierSlug: piece.designer.slug,
          pieceSlug: piece.slug,
          pieceName: piece.name,
          pieceImage: images[0],
          message: note || `I would like to enquire about ${piece.name}.`,
        },
      });
      setNote("");
      toast.success("Note is on the desk");
      void navigate({ to: "/desk/$threadId", params: { threadId: thread.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send the note");
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 pt-24 pb-20 sm:px-6 lg:px-8 lg:pt-28">
      <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <div className="overflow-hidden rounded-2xl bg-ivory-100">
            <LazyImage
              src={images[active] ?? images[0]}
              alt={product.name}
              width={1440}
              eager
              className="aspect-portrait w-full"
            />
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {images.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActive(i)}
                  className={`h-20 w-16 overflow-hidden rounded-lg border ${
                    i === active ? "border-charcoal-800" : "border-transparent"
                  }`}
                >
                  <LazyImage src={src} alt="" width={480} className="size-full" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <Link
            to="/s/$slug"
            params={{ slug: product.designer.slug }}
            className="text-[11px] font-medium uppercase tracking-[0.16em] text-gold-600"
          >
            {product.designer.name} · showroom
          </Link>
          <h1 className="mt-3 font-serif text-4xl text-charcoal-800 sm:text-5xl">
            {product.name}
          </h1>
          <Price
            cents={product.priceCents}
            className="mt-4 block text-xl text-charcoal-800"
          />
          <p className="mt-6 max-w-md text-sm font-light leading-relaxed text-charcoal-500">
            {product.description}
          </p>
          {product.leadTime && (
            <p className="mt-4 text-xs uppercase tracking-[0.12em] text-charcoal-400">
              {product.leadTime}
            </p>
          )}
          {isPreviewPiece(product) && (
            <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.16em] text-gold-600">
              On this preview only
            </p>
          )}

          <div className="mt-8">
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-gold-600">
              Size
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {product.sizes.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSize(option)}
                  className={`h-11 min-w-11 rounded-full px-4 text-xs tracking-[0.08em] transition-colors ${
                    selectedSize === option
                      ? "bg-charcoal-800 text-ivory-50"
                      : "border border-border bg-ivory-50 text-charcoal-600 hover:border-charcoal-400"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {product.materials.length > 0 && (
            <p className="mt-6 text-sm text-charcoal-500">
              <span className="text-charcoal-400">Materials · </span>
              {product.materials.join(", ")}
            </p>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" onClick={addToBag}>
              Add to bag
            </Button>
            <Button size="lg" variant="outline" onClick={() => void onSave()}>
              <Heart size={15} fill={saved ? "currentColor" : "none"} />
              Save
            </Button>
          </div>

          <div className="mt-10 rounded-2xl border border-charcoal-100 bg-ivory-50 p-5">
            <p className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.16em] text-gold-600">
              <MessageCircle size={14} />
              Write to the atelier
            </p>
            <p className="mt-2 text-sm font-light text-charcoal-500">
              The house holds this note. {product.designer.name} replies at the desk — it never leaves Drapé.
            </p>
            <Textarea
              className="mt-3 bg-white text-base"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="A commission, a size question, a private viewing…"
            />
            <Button className="mt-3" variant="outline" onClick={() => void onEnquire()}>
              Send to the desk
            </Button>
          </div>
        </div>
      </div>

      {(related.data ?? []).length > 0 && (
        <section className="mt-20">
          <h2 className="font-serif text-3xl text-charcoal-800">You may also keep</h2>
          <div className="gold-line my-6" />
          <ProductGrid products={related.data ?? []} />
        </section>
      )}
    </main>
  );
}
