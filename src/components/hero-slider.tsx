import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { displayImage } from "@/lib/media";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

const INTERVAL = 5200;
const HERO_CAP = 18;

type Slide = {
  key: string;
  src: string;
  productSlug: string;
  productName: string;
  designerName: string;
  designerSlug: string;
  city: string;
};

function flatten(products: Product[]): Slide[] {
  const byHouse = new Map<string, Product[]>();
  for (const product of products) {
    if (!product.imageUrls.some(Boolean)) continue;
    const key = product.designer.slug || product.designer.userId || product.designer.name;
    const list = byHouse.get(key) ?? [];
    list.push(product);
    byHouse.set(key, list);
  }

  const houses = [...byHouse.values()];
  const slides: Slide[] = [];
  const nextAt = houses.map(() => 0);
  let progressed = true;
  while (progressed) {
    progressed = false;
    for (let h = 0; h < houses.length; h++) {
      const list = houses[h];
      const i = nextAt[h];
      if (i >= list.length) continue;
      const product = list[i];
      nextAt[h] += 1;
      progressed = true;
      const src = product.imageUrls.find(Boolean);
      if (!src) continue;
      slides.push({
        key: `${product.slug}-cover`,
        src,
        productSlug: product.slug,
        productName: product.name,
        designerName: product.designer.name,
        designerSlug: product.designer.slug,
        city: product.designer.city,
      });
    }
  }
  return slides.slice(0, HERO_CAP);
}

export function HeroSlider({ products }: { products: Product[] }) {
  const slides = useMemo(() => flatten(products), [products]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduce, setReduce] = useState(false);
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const total = slides.length;
  const current = slides[index] ?? slides[0];

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const onChange = (e: MediaEventListEvent) => setReduce(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const go = useCallback(
    (next: number) => {
      if (!total) return;
      setIndex(((next % total) + total) % total);
    },
    [total],
  );

  useEffect(() => {
    if (paused || reduce || total < 2) return;
    const id = window.setInterval(() => go(index + 1), INTERVAL);
    return () => window.clearInterval(id);
  }, [go, index, paused, reduce, total]);

  useEffect(() => {
    if (total < 2) return;
    const next = slides[(index + 1) % total];
    if (!next) return;
    const img = new Image();
    img.src = displayImage(next.src, 1800, 84);
  }, [index, slides, total]);

  const nearby = useMemo(() => {
    if (!total) return [];
    const keys = new Set<number>([index, (index - 1 + total) % total, (index + 1) % total]);
    return [...keys].map((i) => ({ i, slide: slides[i] }));
  }, [index, slides, total]);

  if (!current) {
    return (
      <section className="relative min-h-screen overflow-hidden bg-charcoal-900">
        <img src="/images/hero.jpg" alt="Drapé Collective" className="absolute inset-0 size-full object-cover object-top" />
        <div className="absolute inset-0 bg-linear-to-t from-charcoal-900 via-charcoal-900/40 to-charcoal-900/20" />
      </section>
    );
  }

  return (
    <section
      className="relative min-h-screen overflow-hidden bg-charcoal-900"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {nearby.map(({ i, slide }) => {
        const src = failed[slide.key] ? slide.src : displayImage(slide.src, 1800, 84);
        return (
          <img
            key={slide.key}
            src={src}
            alt={`${slide.productName} by ${slide.designerName}`}
            className={cn(
              "absolute inset-0 size-full object-contain object-top transition-opacity duration-700 ease-out",
              i === index ? "opacity-100" : "opacity-0",
              i === index && !reduce && "hero-kenburns",
            )}
            onError={() => setFailed((prev) => ({ ...prev, [slide.key]: true }))}
          />
        );
      })}
      <div className="absolute inset-0 bg-linear-to-t from-charcoal-900/75 via-transparent to-charcoal-900/30" />
      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col justify-end px-4 pb-16 pt-32 sm:px-6 lg:px-8 lg:pb-24">
        <h1 className="max-w-3xl font-serif text-5xl font-medium leading-[1.05] text-ivory-50 sm:text-6xl lg:text-7xl">
          {current.productName}
        </h1>
        <p className="mt-3 text-sm uppercase tracking-[0.16em] text-ivory-100/75">
          {current.designerName}
          {current.city ? ` · ${current.city}` : ""}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg" variant="light">
            <Link to="/shop/$slug" params={{ slug: current.productSlug }}>
              The piece
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-ivory-50/50 text-ivory-50 hover:bg-ivory-50 hover:text-charcoal-800"
          >
            <Link to="/s/$slug" params={{ slug: current.designerSlug }}>
              {current.designerName}
            </Link>
          </Button>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-end gap-2 border-t border-ivory-50/15 pt-5">
          <button type="button" aria-label="Previous photograph" className="grid size-11 place-items-center rounded-full border border-ivory-50/30 text-ivory-50" onClick={() => go(index - 1)}>
            <ChevronLeft size={16} />
          </button>
          <button type="button" aria-label={paused ? "Play slideshow" : "Pause slideshow"} className="grid size-11 place-items-center rounded-full border border-ivory-50/30 text-ivory-50" onClick={() => setPaused((v) => !v)}>
            {paused ? <Play size={14} /> : <Pause size={14} />}
          </button>
          <button type="button" aria-label="Next photograph" className="grid size-11 place-items-center rounded-full border border-ivory-50/30 text-ivory-50" onClick={() => go(index + 1)}>
            <ChevronRight size={16} />
          </button>
          <p className="ml-2 text-[10px] uppercase tracking-[0.16em] text-ivory-100/70">
            {index + 1} / {total}
          </p>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-px bg-ivory-50/10">
        <div
          key={current.key}
          className={cn("h-px bg-gold-400", !paused && !reduce && total > 1 && "hero-progress")}
          style={{ width: paused || reduce ? `${((index + 1) / total) * 100}%` : undefined }}
        />
      </div>
    </section>
  );
}
