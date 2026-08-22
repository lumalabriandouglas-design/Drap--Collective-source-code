import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { listDesigners } from "@/lib/catalog";
import { displayImage } from "@/lib/media";

export const Route = createFileRoute("/ateliers/")({ component: Ateliers });

function Ateliers() {
  const query = useQuery({
    queryKey: ["designers"],
    queryFn: () => listDesigners(),
  });
  const designers = query.data ?? [];

  return (
    <main className="mx-auto max-w-7xl px-4 pt-24 pb-20 sm:px-6 lg:px-8 lg:pt-28">
      <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-gold-600">
        The house
      </p>
      <h1 className="mt-2 max-w-2xl font-serif text-4xl text-charcoal-800 sm:text-5xl">
        Independent ateliers
      </h1>
      <p className="mt-4 max-w-xl text-sm font-light leading-relaxed text-charcoal-500">
        Houses already on the floor — Julaina, City Mall, Ham Shopping Ground —
        and the studios that join them.
      </p>
      <div className="gold-line my-10" />
      <div className="grid grid-cols-1 gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        {designers.map((atelier) => (
          <Link
            key={atelier.slug}
            to="/s/$slug"
            params={{ slug: atelier.slug }}
            className="group block"
          >
            <div className="aspect-portrait overflow-hidden rounded-2xl bg-ivory-100">
              <img
                src={displayImage(atelier.imageUrl, 900)}
                alt={`${atelier.name} showroom`}
                className="img-cover transition-transform duration-700 group-hover:scale-[1.04]"
              />
            </div>
            <p className="mt-4 font-serif text-2xl text-charcoal-800">{atelier.name}</p>
            <p className="text-xs uppercase tracking-[0.14em] text-charcoal-400">
              {atelier.city}, {atelier.country} · {atelier.pieceCount}{" "}
              {atelier.pieceCount === 1 ? "piece" : "pieces"}
            </p>
            <p className="mt-2 line-clamp-3 text-sm font-light leading-relaxed text-charcoal-500">
              {atelier.bio}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
