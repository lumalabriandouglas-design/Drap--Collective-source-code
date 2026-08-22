import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { DesignerShowroom } from "@/components/showroom";
import { Button } from "@/components/ui/button";
import { getDesigner } from "@/lib/catalog";

export const Route = createFileRoute("/s/$slug")({ component: ShowroomPage });

function ShowroomPage() {
  const { slug } = Route.useParams();
  const query = useQuery({
    queryKey: ["designer", slug],
    queryFn: () => getDesigner({ data: slug }),
  });

  if (query.isLoading) {
    return (
      <main className="min-h-dvh bg-charcoal-900">
        <div className="h-[88vh] animate-pulse bg-charcoal-800" />
      </main>
    );
  }

  if (!query.data) {
    return (
      <main className="mx-auto max-w-xl px-4 pt-32 pb-24 text-center">
        <h1 className="font-serif text-4xl text-charcoal-800">Showroom not found</h1>
        <p className="mt-3 text-sm text-charcoal-400">This atelier may have left the floor.</p>
        <Button asChild className="mt-8">
          <Link to="/ateliers">All ateliers</Link>
        </Button>
      </main>
    );
  }

  return <DesignerShowroom designer={query.data.designer} pieces={query.data.pieces} />;
}
