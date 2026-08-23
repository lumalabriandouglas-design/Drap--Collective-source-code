import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { loadFloor } from "@/lib/live-floor";
import type { Product } from "@/lib/types";
import {
  designerOf,
  designersOf,
  filterProducts,
  liveFloor,
  lookbookOf,
  recommendOf,
  relatedOf,
  type ProductFilter,
} from "@/lib/catalog-core";

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
      userId: row.listed_by,
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
  const floor = await liveFloor();
  const studio = await localStudioPieces();
  return { ...floor, products: [...studio, ...floor.products] };
}

export const listProductsRpc = createServerFn({ method: "GET" })
  .validator((input: ProductFilter) => input)
  .handler(async ({ data }) => {
    const floor = await floorWithStudio();
    return filterProducts(floor.products, data);
  });

export const getProductRpc = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const floor = await floorWithStudio();
    return floor.products.find((p) => p.slug === slug) ?? null;
  });

export const listRelatedRpc = createServerFn({ method: "GET" })
  .validator((input: { slug: string; category: string; designerSlug: string }) => input)
  .handler(async ({ data }) => {
    const floor = await floorWithStudio();
    return relatedOf(floor, data);
  });

export const listDesignersRpc = createServerFn({ method: "GET" }).handler(async () => {
  return designersOf(await floorWithStudio());
});

export const getDesignerRpc = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => designerOf(await floorWithStudio(), slug));

export const listLookbooksRpc = createServerFn({ method: "GET" }).handler(async () => {
  try {
    return (await loadFloor()).lookbooks;
  } catch {
    return [];
  }
});

export const getLookbookRpc = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => lookbookOf(await floorWithStudio(), slug));

export const recommendProductsRpc = createServerFn({ method: "GET" })
  .validator((tags: string[]) => tags)
  .handler(async ({ data: tags }) => recommendOf(await floorWithStudio(), tags));
