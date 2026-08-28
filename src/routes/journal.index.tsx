import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { listLookbooks } from "@/lib/catalog";

export const Route = createFileRoute("/journal/")({ component: Journal });

function Journal() {
  const query = useQuery({
    queryKey: ["lookbooks"],
    queryFn: () => listLookbooks(),
  });
  const stories = query.data ?? [];

  return (
    <main className="mx-auto max-w-7xl px-4 pt-24 pb-20 sm:px-6 lg:px-8 lg:pt-28">
      <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-gold-600">Journal</p>
      <h1 className="mt-2 font-serif text-4xl text-charcoal-800 sm:text-5xl">From the floor</h1>
      <p className="mt-4 max-w-xl text-sm font-light text-charcoal-500">
        The cloth as the ateliers posted it — Kampala studios, ceremony pieces, and the hours after dark.
      </p>
      <div className="gold-line my-10" />
      <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
        {stories.map((story, i) => (
          <Link
            key={story.slug}
            to="/journal/$slug"
            params={{ slug: story.slug }}
            className={`group block ${i === 0 ? "md:col-span-2" : ""}`}
          >
            <div className={`overflow-hidden rounded-2xl bg-ivory-100 ${i === 0 ? "aspect-wide md:min-h-80" : "aspect-wide"}`}>
              <img src={story.coverUrl} alt={story.title} className="img-cover transition-transform duration-700 group-hover:scale-[1.03]" />
            </div>
            <p className="mt-4 text-[10px] uppercase tracking-[0.16em] text-gold-600">{story.designerName ?? "The house"}</p>
            <h2 className="mt-1 font-serif text-3xl text-charcoal-800">{story.title}</h2>
            <p className="mt-1 text-sm text-charcoal-400">{story.subtitle}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
