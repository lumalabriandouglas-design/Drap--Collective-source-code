import { loadFloor, type Floor } from "@/lib/live-floor";
import type { Designer, Lookbook, Product } from "@/lib/types";

export type ProductFilter = {
  category?: string;
  q?: string;
  atelier?: string;
  featured?: boolean;
  limit?: number;
};

export async function liveFloor(): Promise<Floor> {
  try {
    return await loadFloor();
  } catch {
    return { products: [], designers: [], lookbooks: [] };
  }
}

export function filterProducts(products: Product[], data: ProductFilter) {
  let next = products;
  if (data.category && data.category !== "All") {
    next = next.filter((p) => p.category === data.category);
  }
  if (data.atelier) {
    next = next.filter((p) => p.designer.slug === data.atelier);
  }
  if (data.q?.trim()) {
    const q = data.q.trim().toLowerCase();
    next = next.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.designer.name.toLowerCase().includes(q),
    );
  }
  if (data.featured) {
    next = next.filter((p) => p.featured);
  }
  const limit = data.limit == null ? next.length : Math.min(Math.max(data.limit, 1), 400);
  return next.slice(0, limit);
}

export function designersOf(floor: Floor): Designer[] {
  const extra = new Map<string, Designer>();
  for (const product of floor.products) {
    if (!floor.designers.some((d) => d.slug === product.designer.slug)) {
      extra.set(product.designer.slug, {
        id: product.designer.id,
        slug: product.designer.slug,
        name: product.designer.name,
        city: product.designer.city,
        country: product.designer.country,
        bio: "",
        philosophy: null,
        imageUrl: product.designer.imageUrl,
        featured: false,
        userId: null,
        pieceCount: 0,
      });
    }
  }
  return [...floor.designers, ...extra.values()]
    .map((d) => ({
      ...d,
      pieceCount: floor.products.filter((p) => p.designer.slug === d.slug).length,
    }))
    .sort((a, b) => Number(b.featured) - Number(a.featured) || b.pieceCount - a.pieceCount);
}

export function relatedOf(
  floor: Floor,
  data: { slug: string; category: string; designerSlug: string },
): Product[] {
  return floor.products
    .filter(
      (p) =>
        p.slug !== data.slug && (p.category === data.category || p.designer.slug === data.designerSlug),
    )
    .slice(0, 4);
}

export function designerOf(floor: Floor, slug: string) {
  const pieces = floor.products.filter((p) => p.designer.slug === slug);
  const listed = floor.designers.find((d) => d.slug === slug);
  if (!listed && pieces.length === 0) return null;
  const designer: Designer = listed
    ? { ...listed, pieceCount: pieces.length }
    : {
        id: pieces[0].designer.id,
        slug,
        name: pieces[0].designer.name,
        city: pieces[0].designer.city,
        country: pieces[0].designer.country,
        bio: "",
        philosophy: null,
        imageUrl: pieces[0].designer.imageUrl,
        featured: false,
        userId: null,
        pieceCount: pieces.length,
      };
  return { designer, pieces };
}

export function lookbookOf(floor: Floor, slug: string) {
  const lookbook = floor.lookbooks.find((l) => l.slug === slug);
  if (!lookbook) return null;
  const pieces = floor.products.filter((p) => lookbook.productSlugs.includes(p.slug));
  return { lookbook, pieces };
}

export function recommendOf(floor: Floor, tags: string[]): Product[] {
  const wanted = new Set(tags.map((t) => t.toLowerCase()));
  const scored = floor.products
    .map((product) => ({
      product,
      score: product.tags.filter((tag) => wanted.has(tag.toLowerCase())).length,
    }))
    .sort((a, b) => b.score - a.score);
  const picked = scored.filter((s) => s.score > 0).slice(0, 8);
  return (picked.length ? picked : scored.slice(0, 8)).map((s) => s.product);
}

export type { Lookbook, Product };
