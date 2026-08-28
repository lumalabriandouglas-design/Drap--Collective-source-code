import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ProductGrid } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { getLookbook } from "@/lib/catalog";

export const Route = createFileRoute("/journal/$slug")({ component: LookbookPage });

function LookbookPage() {
  const { slug } = Route.useParams();
  const query = useQuery({
    queryKey: ["lookbook", slug],
    queryFn: () => getLookbook({ data: slug }),
  });

  if (query.isLoading) {
    return (
      <main className="mx-auto max-w-3xl px-4 pt-28">
        <div className="aspect-wide animate-pulse rounded-2xl bg-ivory-100" />
      </main>
    );
  }
  if (!query.data) {
    return (
      <main className="mx-auto max-w-xl px-4 pt-32 pb-24 text-center">
        <h1 className="font-serif text-4xl">Story not found</h1>
        <Button asChild className="mt-8">
          <Link to="/journal">Journal</Link>
        </Button>
      </main>
    );
  }

  const { lookbook, pieces } = query.data;
  const paragraphs = lookbook.body.split(/\n\n+/);

  return (
    <main>
      <section className="relative min-h-[60vh] overflow-hidden bg-charcoal-900">
        <img
          src={lookbook.coverUrl}
          alt={lookbook.title}
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-charcoal-900/45" />
        <div className="relative mx-auto flex min-h-[60vh] max-w-4xl flex-col justify-end px-4 pb-12 pt-32">
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold-300">
            {lookbook.designerSlug ? (
              <Link to="/s/$slug" params={{ slug: lookbook.designerSlug }} className="hover:text-gold-200">
                {lookbook.designerName ?? "Journal"}
              </Link>
            ) : (
              (lookbook.designerName ?? "Journal")
            )}
          </p>
          <h1 className="mt-3 font-serif text-5xl text-ivory-50">{lookbook.title}</h1>
          {lookbook.subtitle && (
            <p className="mt-3 font-serif text-xl italic text-ivory-100/80">
              {lookbook.subtitle}
            </p>
          )}
        </div>
      </section>
      <article className="mx-auto max-w-2xl px-4 py-16">
        {paragraphs.map((p) => (
          <p key={p.slice(0, 24)} className="mb-6 text-base font-light leading-relaxed text-charcoal-600">
            {p}
          </p>
        ))}
      </article>
      {pieces.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <h2 className="font-serif text-3xl text-charcoal-800">From this story</h2>
          <div className="gold-line my-6" />
          <ProductGrid products={pieces} />
        </section>
      )}
    </main>
  );
}
