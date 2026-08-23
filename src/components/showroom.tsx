import { Link } from "@tanstack/react-router";
import { Check, MapPin, Share2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DrapeReveal } from "@/components/drape-reveal";
import { LazyImage } from "@/components/lazy-image";
import { Price } from "@/components/price";
import { Button } from "@/components/ui/button";
import type { Designer, Product } from "@/lib/types";
import { cn } from "@/lib/utils";

export function showroomPath(slug: string) {
  return `/s/${slug}`;
}

export function DesignerShowroom({
  designer,
  pieces,
}: {
  designer: Designer;
  pieces: Product[];
}) {
  const [copied, setCopied] = useState(false);
  const [active, setActive] = useState(0);
  const hero = pieces[active] ?? pieces[0];
  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return showroomPath(designer.slug);
    return `${window.location.origin}${showroomPath(designer.slug)}`;
  }, [designer.slug]);

  async function share() {
    const payload = {
      title: `${designer.name} — Drapé Collective`,
      text: `The ${designer.name} showroom on Drapé Collective.`,
      url: shareUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(payload);
        return;
      }
    } catch {
      /* fall through to copy */
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const field = document.createElement("textarea");
        field.value = shareUrl;
        field.setAttribute("readonly", "");
        field.style.position = "fixed";
        field.style.left = "-9999px";
        document.body.appendChild(field);
        field.select();
        document.execCommand("copy");
        field.remove();
      }
      setCopied(true);
      toast.success("Showroom link copied");
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      toast.message(shareUrl);
    }
  }

  return (
    <DrapeReveal house={designer.name}>
    <main>
      <section className="relative min-h-[88vh] overflow-hidden bg-charcoal-900">
        {hero ? (
          <LazyImage
            src={hero.imageUrls[0] ?? designer.imageUrl}
            alt={hero.name}
            width={1800}
            eager
            className="absolute inset-0 size-full"
            imgClassName="object-cover object-top"
          />
        ) : (
          <LazyImage
            src={designer.imageUrl}
            alt={designer.name}
            width={1800}
            eager
            className="absolute inset-0 size-full"
            imgClassName="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-charcoal-900 via-charcoal-900/45 to-charcoal-900/25" />
        <div className="relative mx-auto flex min-h-[88vh] max-w-7xl flex-col justify-end px-4 pb-12 pt-28 sm:px-6 lg:px-8 lg:pb-16">
          <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-gold-300">
            <MapPin size={12} />
            {designer.city}, {designer.country}
          </p>
          <h1 className="mt-3 font-serif text-5xl text-ivory-50 sm:text-6xl lg:text-7xl">
            {designer.name}
          </h1>
          <p className="mt-4 max-w-xl text-sm font-light leading-relaxed text-ivory-100/80">
            {designer.bio}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button type="button" variant="light" size="lg" onClick={() => void share()}>
              {copied ? <Check size={16} /> : <Share2 size={16} />}
              {copied ? "Link copied" : "Share showroom"}
            </Button>
            {hero && (
              <Button asChild size="lg" variant="outline" className="border-ivory-50/50 text-ivory-50 hover:bg-ivory-50 hover:text-charcoal-800">
                <Link to="/shop/$slug" params={{ slug: hero.slug }}>
                  Write to the atelier
                </Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-gold-600">
              Private showroom
            </p>
            <h2 className="mt-2 font-serif text-3xl text-charcoal-800">The collection</h2>
          </div>
          <p className="text-xs uppercase tracking-[0.14em] text-charcoal-400">
            {pieces.length} {pieces.length === 1 ? "piece" : "pieces"} · {shareUrl.replace(/^https?:\/\//, "")}
          </p>
        </div>
        <div className="gold-line my-8" />

        {pieces.length === 0 ? (
          <p className="text-sm text-charcoal-400">This atelier is preparing its first drop.</p>
        ) : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
            {pieces.map((piece, i) => {
              const featured = i === 0;
              return (
                <Link
                  key={piece.slug}
                  to="/shop/$slug"
                  params={{ slug: piece.slug }}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    "group block",
                    featured ? "md:col-span-7" : "md:col-span-5",
                  )}
                >
                  <LazyImage
                    src={piece.imageUrls[0] ?? designer.imageUrl}
                    alt={piece.name}
                    width={featured ? 1440 : 900}
                    eager={i < 2}
                    className={cn("rounded-2xl", featured ? "aspect-portrait md:min-h-[32rem]" : "aspect-portrait")}
                    imgClassName="transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                  <div className="mt-4 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-serif text-2xl text-charcoal-800">{piece.name}</h3>
                      <p className="mt-1 text-xs uppercase tracking-[0.12em] text-charcoal-400">
                        {piece.category}
                        {piece.leadTime ? ` · ${piece.leadTime}` : ""}
                      </p>
                    </div>
                    <Price cents={piece.priceCents} className="text-sm text-charcoal-700" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
    </DrapeReveal>
  );
}
