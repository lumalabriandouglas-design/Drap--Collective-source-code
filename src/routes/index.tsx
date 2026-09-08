import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { HeroSlider } from "@/components/hero-slider";
import { ProductGrid } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { listDesigners, listProducts } from "@/lib/catalog";
import { displayImage } from "@/lib/media";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const products = useQuery({
    queryKey: ["products", "floor"],
    queryFn: () => listProducts({ data: { limit: 400 } }),
  });
  const featured = useQuery({
    queryKey: ["products", "featured"],
    queryFn: () => listProducts({ data: { featured: true, limit: 8 } }),
  });
  const designers = useQuery({
    queryKey: ["designers"],
    queryFn: () => listDesigners(),
  });

  const floor = products.data ?? [];
  const spotlight = (featured.data ?? []).length ? featured.data! : floor.slice(0, 8);
  const ateliers = (designers.data ?? []).filter((d) => d.featured || d.pieceCount > 0).slice(0, 4);

  return (
    <main>
      <HeroSlider products={floor} />
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-gold-600">The collection</p>
            <h2 className="mt-2 font-serif text-3xl text-charcoal-800 sm:text-4xl">From the floor</h2>
          </div>
          <Link to="/shop" className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-charcoal-400 transition-colors hover:text-gold-600">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="gold-line mb-10" />
        {featured.isLoading && products.isLoading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-portrait animate-pulse rounded-xl bg-ivory-100" />
            ))}
          </div>
        ) : (
          <ProductGrid products={spotlight} />
        )}
      </section>
      <section className="bg-ivory-100 py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-gold-600">The ateliers</p>
              <h2 className="mt-2 font-serif text-3xl text-charcoal-800 sm:text-4xl">Private showrooms</h2>
            </div>
            <Link to="/ateliers" className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-charcoal-400 hover:text-gold-600">
              All ateliers <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {ateliers.map((atelier) => (
              <Link key={atelier.slug} to="/s/$slug" params={{ slug: atelier.slug }} className="group block">
                <div className="aspect-portrait overflow-hidden rounded-xl bg-ivory-200">
                  <img src={displayImage(atelier.imageUrl, 900)} alt={`${atelier.name} showroom`} className="img-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                </div>
                <p className="mt-3 font-serif text-lg text-charcoal-800">{atelier.name}</p>
                <p className="text-xs uppercase tracking-[0.12em] text-charcoal-400">{atelier.city} · Shareable showroom</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="px-4 py-16 md:py-24">
        <div className="mx-auto max-w-3xl rounded-3xl border border-gold-200/30 bg-ivory-100 px-8 py-12 text-center sm:px-14">
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-gold-600">Collectors & makers</p>
          <h2 className="mt-3 font-serif text-3xl text-charcoal-800 sm:text-4xl">Ready for the next statement piece?</h2>
          <p className="mx-auto mt-4 max-w-md text-sm font-light text-charcoal-500">Walk the floor, or open an atelier and send clients your showroom link.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg"><Link to="/shop">Enter the shop</Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/studio">Open an atelier</Link></Button>
          </div>
        </div>
      </section>
    </main>
  );
}
