import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState } from "react";
import { ProductGrid } from "@/components/product-card";
import { Input } from "@/components/ui/input";
import { listProducts } from "@/lib/catalog";
import { PRODUCT_CATEGORIES } from "@/lib/constants";

type ShopSearch = { q?: string; category?: string; atelier?: string };

export const Route = createFileRoute("/shop/")({
  validateSearch: (search: Record<string, unknown>): ShopSearch => ({
    q: typeof search.q === "string" ? search.q : undefined,
    category: typeof search.category === "string" ? search.category : undefined,
    atelier: typeof search.atelier === "string" ? search.atelier : undefined,
  }),
  component: Shop,
});

function Shop() {
  const { q, category, atelier } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [draft, setDraft] = useState(q ?? "");
  const active = category ?? "All";

  const query = useQuery({
    queryKey: ["products", { q, category, atelier }],
    queryFn: () => listProducts({ data: { q, category: category === "All" ? undefined : category, atelier, limit: 48 } }),
  });
  const products = query.data ?? [];

  function setCategory(next: string) {
    void navigate({ search: (prev) => ({ ...prev, category: next === "All" ? undefined : next }) });
  }

  return (
    <main className="mx-auto max-w-7xl px-4 pt-24 pb-20 sm:px-6 lg:px-8 lg:pt-28">
      <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-gold-600">The shop</p>
      <div className="mt-2 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <h1 className="font-serif text-4xl text-charcoal-800 sm:text-5xl">{atelier ? "From the atelier" : "The collection"}</h1>
        <form className="relative w-full max-w-sm" onSubmit={(e) => { e.preventDefault(); void navigate({ search: (prev) => ({ ...prev, q: draft.trim() || undefined }) }); }}>
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-charcoal-300" />
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Search pieces, houses…" className="pl-10" aria-label="Search the shop" />
        </form>
      </div>
      <div className="gold-line my-8" />
      <div className="-mx-4 mb-10 flex gap-2 overflow-x-auto px-4 pb-2">
        {["All", ...PRODUCT_CATEGORIES].map((cat) => (
          <button key={cat} type="button" onClick={() => setCategory(cat)} className={`h-10 shrink-0 rounded-full px-5 text-[11px] font-medium tracking-[0.08em] transition-colors ${active === cat ? "bg-charcoal-800 text-ivory-50" : "bg-ivory-100 text-charcoal-500 hover:bg-ivory-200 hover:text-charcoal-800"}`}>
            {cat}
          </button>
        ))}
      </div>
      {query.isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-portrait animate-pulse rounded-xl bg-ivory-100" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="py-20 text-center">
          <p className="font-serif text-2xl text-charcoal-800">Nothing in this edit yet</p>
          <p className="mt-2 text-sm text-charcoal-400">New pieces dropping from the ateliers soon.</p>
          <Link to="/shop" className="mt-6 inline-block text-xs uppercase tracking-[0.14em] text-gold-600">Clear filters</Link>
        </div>
      ) : (
        <>
          <p className="mb-6 text-[11px] uppercase tracking-[0.14em] text-charcoal-400">{products.length} {products.length === 1 ? "piece" : "pieces"}</p>
          <ProductGrid products={products} />
        </>
      )}
    </main>
  );
}
