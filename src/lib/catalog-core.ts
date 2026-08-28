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
    next = next.filter((p) => matchesSlug(p.designer.slug, data.atelier!));
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

function nameKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function matchesSlug(actual: string, wanted: string) {
  const have = actual.toLowerCase();
  const need = wanted.toLowerCase();
  if (have === need) return true;
  if (have.startsWith(`${need}-`)) return true;
  const tail = need.length >= 8 ? need.slice(-8) : "";
  if (tail && have.endsWith(`-${tail}`)) return true;
  return false;
}

export function designersOf(floor: Floor): Designer[] {
  const extra = new Map<string, Designer>();
  for (const product of floor.products) {
    if (!floor.designers.some((d) => d.slug === product.designer.slug || d.userId === product.designer.userId)) {
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
        userId: product.designer.userId,
        pieceCount: 0,
      });
    }
  }
  return [...floor.designers, ...extra.values()]
    .map((d) => ({
      ...d,
      pieceCount: floor.products.filter(
        (p) => p.designer.slug === d.slug || (d.userId && p.designer.userId === d.userId),
      ).length,
    }))
    .sort((a, b) => Number(b.featured) - Number(a.featured) || b.pieceCount - a.pieceCount || a.name.localeCompare(b.name));
}

export function relatedOf(
  floor: Floor,
  data: { slug: string; category: string; designerSlug: string },
): Product[] {
  return floor.products
    .filter(
      (p) =>
        p.slug !== data.slug && (p.category === data.category || matchesSlug(p.designer.slug, data.designerSlug)),
    )
    .slice(0, 4);
}

export function designerOf(floor: Floor, slug: string) {
  const wanted = slug.toLowerCase();
  const listed =
    floor.designers.find((d) => d.slug.toLowerCase() === wanted) ??
    floor.designers.find((d) => matchesSlug(d.slug, wanted)) ??
    floor.designers.find((d) => nameKey(d.name) === wanted) ??
    floor.designers.find((d) => d.userId?.startsWith(wanted.slice(-8)));
  const pieces = floor.products.filter((p) => {
    if (listed) {
      return (
        p.designer.slug === listed.slug ||
        (listed.userId && p.designer.userId === listed.userId) ||
        (listed.authId && p.listedBy === listed.authId)
      );
    }
    return matchesSlug(p.designer.slug, wanted);
  });
  if (!listed && pieces.length === 0) return null;
  const designer: Designer = listed
    ? { ...listed, pieceCount: pieces.length }
    : {
        id: pieces[0].designer.id,
        slug: pieces[0].designer.slug,
        name: pieces[0].designer.name,
        city: pieces[0].designer.city,
        country: pieces[0].designer.country,
        bio: "",
        philosophy: null,
        imageUrl: pieces[0].designer.imageUrl,
        featured: false,
        userId: pieces[0].designer.userId,
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
