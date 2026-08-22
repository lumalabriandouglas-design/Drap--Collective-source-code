import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { loadFloor } from "@/lib/live-floor";
import type { Designer, Lookbook, Product } from "@/lib/types";

type ProductRow = {
  id: number;
  slug: string;
  name: string;
  description: string;
  category: string;
  price_cents: number;
  materials: unknown;
  sizes: unknown;
  image_urls: unknown;
  tags: unknown;
  lead_time: string | null;
  featured: boolean;
  listed_by: string | null;
  designer_id: number;
  designer_slug: string;
  designer_name: string;
  designer_city: string;
  designer_country: string;
  designer_image: string;
};

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapLocalProduct(row: ProductRow): Product {
  return {
    id: Number(row.id),
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.category,
    priceCents: Number(row.price_cents),
    materials: asStringArray(row.materials),
    sizes: asStringArray(row.sizes),
    imageUrls: asStringArray(row.image_urls),
    tags: asStringArray(row.tags),
    leadTime: row.lead_time,
    featured: Boolean(row.featured),
    listedBy: row.listed_by,
    designer: {
      id: Number(row.designer_id),
      slug: row.designer_slug,
      name: row.designer_name,
      city: row.designer_city,
      country: row.designer_country,
      imageUrl: row.designer_image,
    },
  };
}

const LOCAL_SELECT = `
  p.id, p.slug, p.name, p.description, p.category, p.price_cents,
  p.materials, p.sizes, p.image_urls, p.tags, p.lead_time, p.featured, p.listed_by,
  d.id as designer_id, d.slug as designer_slug, d.name as designer_name,
  d.city as designer_city, d.country as designer_country, d.image_url as designer_image
`;

async function localStudioPieces(): Promise<Product[]> {
  try {
    const sql = await getSql();
    const rows = await sql.query<ProductRow>(
      `select ${LOCAL_SELECT}
       from products p
       join designers d on d.id = p.designer_id
       where p.listed_by is not null
       order by p.created_at desc`,
    );
    return rows.map(mapLocalProduct);
  } catch {
    return [];
  }
}

async function floorWithStudio() {
  let floor;
  try {
    floor = await loadFloor();
  } catch {
    floor = { products: [] as Product[], designers: [] as Designer[], lookbooks: [] as Lookbook[] };
  }
  const studio = await localStudioPieces();
  const products = [...studio, ...floor.products];
  return { ...floor, products };
}

function filterProducts(
  products: Product[],
  data: { category?: string; q?: string; atelier?: string; featured?: boolean; limit?: number },
) {
  let next = products;
  if (data.category && data.category !== "All") next = next.filter((p) => p.category === data.category);
  if (data.atelier) next = next.filter((p) => p.designer.slug === data.atelier);
  if (data.q?.trim()) {
    const q = data.q.trim().toLowerCase();
    next = next.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.designer.name.toLowerCase().includes(q),
    );
  }
  if (data.featured) next = next.filter((p) => p.featured);
  const limit = data.limit == null ? next.length : Math.min(Math.max(data.limit, 1), 400);
  return next.slice(0, limit);
}

export const listProducts = createServerFn({ method: "GET" })
  .validator((input: { category?: string; q?: string; atelier?: string; featured?: boolean; limit?: number }) => input)
  .handler(async ({ data }) => {
    const floor = await floorWithStudio();
    return filterProducts(floor.products, data);
  });

export const getProduct = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const floor = await floorWithStudio();
    return floor.products.find((p) => p.slug === slug) ?? null;
  });

export const listRelated = createServerFn({ method: "GET" })
  .validator((input: { slug: string; category: string; designerSlug: string }) => input)
  .handler(async ({ data }) => {
    const floor = await floorWithStudio();
    return floor.products
      .filter((p) => p.slug !== data.slug && (p.category === data.category || p.designer.slug === data.designerSlug))
      .slice(0, 4);
  });

export const listDesigners = createServerFn({ method: "GET" }).handler(async () => {
  const floor = await floorWithStudio();
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
  const designers = [...floor.designers, ...extra.values()].map((d) => ({
    ...d,
    pieceCount: floor.products.filter((p) => p.designer.slug === d.slug).length,
  }));
  return designers.sort((a, b) => Number(b.featured) - Number(a.featured) || b.pieceCount - a.pieceCount);
});

export const getDesigner = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const floor = await floorWithStudio();
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
  });

export const listLookbooks = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const floor = await loadFloor();
    return floor.lookbooks;
  } catch {
    return [] as Lookbook[];
  }
});

export const getLookbook = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const floor = await floorWithStudio();
    const lookbook = floor.lookbooks.find((l) => l.slug === slug);
    if (!lookbook) return null;
    const pieces = floor.products.filter((p) => lookbook.productSlugs.includes(p.slug));
    return { lookbook, pieces };
  });

export const recommendProducts = createServerFn({ method: "GET" })
  .validator((tags: string[]) => tags)
  .handler(async ({ data: tags }) => {
    const floor = await floorWithStudio();
    const wanted = new Set(tags.map((t) => t.toLowerCase()));
    const scored = floor.products
      .map((product) => ({
        product,
        score: product.tags.filter((tag) => wanted.has(tag.toLowerCase())).length,
      }))
      .sort((a, b) => b.score - a.score);
    const picked = scored.filter((s) => s.score > 0).slice(0, 8);
    return (picked.length ? picked : scored.slice(0, 8)).map((s) => s.product);
  });
