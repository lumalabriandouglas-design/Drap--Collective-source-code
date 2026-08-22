import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { loadFloor, type Floor } from "@/lib/live-floor";
import type { Designer, Lookbook, Product } from "@/lib/types";

type ProductFilter = {
  category?: string;
  q?: string;
  atelier?: string;
  featured?: boolean;
  limit?: number;
};

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

async function liveFloor(): Promise<Floor> {
  try {
    return await loadFloor();
  } catch {
    return { products: [], designers: [], lookbooks: [] };
  }
}

async function floorWithStudio() {
  const floor = await liveFloor();
  const studio = await localStudioPieces();
  return { ...floor, products: [...studio, ...floor.products] };
}

function filterProducts(products: Product[], data: ProductFilter) {
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

function designersOf(floor: Floor): Designer[] {
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

function relatedOf(
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

function designerOf(floor: Floor, slug: string) {
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

function lookbookOf(floor: Floor, slug: string) {
  const lookbook = floor.lookbooks.find((l) => l.slug === slug);
  if (!lookbook) return null;
  const pieces = floor.products.filter((p) => lookbook.productSlugs.includes(p.slug));
  return { lookbook, pieces };
}

function recommendOf(floor: Floor, tags: string[]): Product[] {
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

const listProductsRpc = createServerFn({ method: "GET" })
  .validator((input: ProductFilter) => input)
  .handler(async ({ data }) => {
    const floor = await floorWithStudio();
    return filterProducts(floor.products, data);
  });

const getProductRpc = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const floor = await floorWithStudio();
    return floor.products.find((p) => p.slug === slug) ?? null;
  });

const listRelatedRpc = createServerFn({ method: "GET" })
  .validator((input: { slug: string; category: string; designerSlug: string }) => input)
  .handler(async ({ data }) => {
    const floor = await floorWithStudio();
    return relatedOf(floor, data);
  });

const listDesignersRpc = createServerFn({ method: "GET" }).handler(async () => {
  return designersOf(await floorWithStudio());
});

const getDesignerRpc = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => designerOf(await floorWithStudio(), slug));

const listLookbooksRpc = createServerFn({ method: "GET" }).handler(async () => {
  try {
    return (await loadFloor()).lookbooks;
  } catch {
    return [] as Lookbook[];
  }
});

const getLookbookRpc = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => lookbookOf(await floorWithStudio(), slug));

const recommendProductsRpc = createServerFn({ method: "GET" })
  .validator((tags: string[]) => tags)
  .handler(async ({ data: tags }) => recommendOf(await floorWithStudio(), tags));

export async function listProducts(opts: { data?: ProductFilter } = {}) {
  const data = opts.data ?? {};
  try {
    return await listProductsRpc({ data });
  } catch {
    return filterProducts((await liveFloor()).products, data);
  }
}

export async function getProduct(opts: { data: string }) {
  try {
    return await getProductRpc({ data: opts.data });
  } catch {
    return (await liveFloor()).products.find((p) => p.slug === opts.data) ?? null;
  }
}

export async function listRelated(opts: {
  data: { slug: string; category: string; designerSlug: string };
}) {
  try {
    return await listRelatedRpc({ data: opts.data });
  } catch {
    return relatedOf(await liveFloor(), opts.data);
  }
}

export async function listDesigners() {
  try {
    return await listDesignersRpc();
  } catch {
    return designersOf(await liveFloor());
  }
}

export async function getDesigner(opts: { data: string }) {
  try {
    return await getDesignerRpc({ data: opts.data });
  } catch {
    return designerOf(await liveFloor(), opts.data);
  }
}

export async function listLookbooks() {
  try {
    return await listLookbooksRpc();
  } catch {
    return (await liveFloor()).lookbooks;
  }
}

export async function getLookbook(opts: { data: string }) {
  try {
    return await getLookbookRpc({ data: opts.data });
  } catch {
    return lookbookOf(await liveFloor(), opts.data);
  }
}

export async function recommendProducts(opts: { data: string[] }) {
  try {
    return await recommendProductsRpc({ data: opts.data });
  } catch {
    return recommendOf(await liveFloor(), opts.data);
  }
}
