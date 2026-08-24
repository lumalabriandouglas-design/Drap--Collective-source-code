import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { PRODUCT_CATEGORIES, PRODUCT_SIZES } from "@/lib/constants";
import { getSql } from "@/lib/db";
import { invalidateFloor } from "@/lib/live-floor";
import type { AtelierProfile, Product } from "@/lib/types";

function slugify(value: string) {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${base || "piece"}-${Date.now().toString(36)}`;
}

export const getMyStudioRpc = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const ateliers = await sql.query<AtelierProfile & { bio: string }>(
      `select id, slug, name, city, country, bio from designers where user_id = $1 limit 1`,
      [context.userId],
    );
    const atelier = ateliers[0] ?? null;
    if (!atelier) return { atelier: null, pieces: [] as Product[] };

    const pieces = await sql.query<{
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
    }>(
      `select id, slug, name, description, category, price_cents, materials, sizes, image_urls, tags, lead_time, featured, listed_by
       from products
       where designer_id = $1
       order by created_at desc`,
      [atelier.id],
    );

    return {
      atelier: {
        id: Number(atelier.id),
        slug: atelier.slug,
        name: atelier.name,
        city: atelier.city,
        country: atelier.country,
        bio: atelier.bio,
      },
      pieces: pieces.map((row) => ({
        id: Number(row.id),
        slug: row.slug,
        name: row.name,
        description: row.description,
        category: row.category,
        priceCents: Number(row.price_cents),
        materials: Array.isArray(row.materials) ? row.materials.map(String) : [],
        sizes: Array.isArray(row.sizes) ? row.sizes.map(String) : [],
        imageUrls: Array.isArray(row.image_urls) ? row.image_urls.map(String) : [],
        tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
        leadTime: row.lead_time,
        featured: Boolean(row.featured),
        listedBy: row.listed_by,
        designer: {
          id: Number(atelier.id),
          slug: atelier.slug,
          name: atelier.name,
          city: atelier.city,
          country: atelier.country,
          imageUrl: "",
        },
      })),
    };
  });

export const openAtelierRpc = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { name: string; city: string; country: string; bio: string }) => input)
  .handler(async ({ context, data }) => {
    const name = data.name.trim();
    const city = data.city.trim();
    const country = data.country.trim();
    const bio = data.bio.trim();
    if (name.length < 2) throw new Error("Give your atelier a name.");
    if (!city || !country) throw new Error("Where is the studio based?");
    if (bio.length < 12) throw new Error("Tell collectors a little about the house.");

    const sql = await getSql();
    const existing = await sql.query<{ id: number }>(
      `select id from designers where user_id = $1`,
      [context.userId],
    );
    if (existing.length) return { slug: (await sql.query<{ slug: string }>(`select slug from designers where user_id = $1`, [context.userId]))[0].slug };

    const slug = slugify(name);
    await sql.query(
      `insert into designers (slug, name, city, country, bio, philosophy, image_url, user_id, featured)
       values ($1, $2, $3, $4, $5, $6, $7, $8, false)`,
      [
        slug,
        name,
        city,
        country,
        bio,
        null,
        "/images/products/studio-2.jpg",
        context.userId,
      ],
    );
    await sql.query(
      `insert into profiles (user_id, display_name, role)
       values ($1, $2, 'designer')
       on conflict (user_id) do update set role = 'designer', display_name = excluded.display_name`,
      [context.userId, name],
    );
    return { slug };
  });

export const listPieceRpc = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: {
      name: string;
      description: string;
      category: string;
      price: number;
      sizes: string[];
      imageUrl?: string;
      imageUrls?: string[];
      leadTime: string;
    }) => input,
  )
  .handler(async ({ context, data }) => {
    const name = data.name.trim();
    const description = data.description.trim();
    if (name.length < 2) throw new Error("Name the piece.");
    if (description.length < 12) throw new Error("Add a short atelier note.");
    if (!PRODUCT_CATEGORIES.includes(data.category as (typeof PRODUCT_CATEGORIES)[number])) {
      throw new Error("Choose a category.");
    }
    const priceCents = Math.round(Number(data.price));
    if (!Number.isFinite(priceCents) || priceCents < 5000) {
      throw new Error("Set a price of at least USh 5,000.");
    }
    const sizes = data.sizes.filter((size) =>
      PRODUCT_SIZES.includes(size as (typeof PRODUCT_SIZES)[number]),
    );
    if (!sizes.length) throw new Error("Select at least one size.");

    const sql = await getSql();
    const ateliers = await sql.query<{ id: number; slug: string; name: string }>(
      `select id, slug, name from designers where user_id = $1 limit 1`,
      [context.userId],
    );
    const atelier = ateliers[0];
    if (!atelier) throw new Error("Open an atelier before listing a piece.");

    const slug = slugify(name);
    const imageUrls = (data.imageUrls?.length ? data.imageUrls : data.imageUrl ? [data.imageUrl] : [])
      .filter(Boolean)
      .slice(0, 5);
    if (!imageUrls.length) throw new Error("Add a photograph of the piece.");
    await sql.query(
      `insert into products (
         slug, designer_id, name, description, category, price_cents,
         materials, sizes, image_urls, tags, lead_time, featured, listed_by
       ) values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11,false,$12)`,
      [
        slug,
        atelier.id,
        name,
        description,
        data.category,
        priceCents,
        JSON.stringify([]),
        JSON.stringify(sizes),
        JSON.stringify(imageUrls),
        JSON.stringify(["atelier"]),
        data.leadTime.trim() || "Made to order · 3 weeks",
        context.userId,
      ],
    );
    invalidateFloor();
    return { slug };
  });

export const storageStatusRpc = createServerFn({ method: "GET" }).handler(async () => {
  const { r2Status } = await import("@/lib/r2");
  return r2Status();
});

export const uploadPiecePhotoRpc = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { filename: string; mime: string; data: string }) => input)
  .handler(async ({ context, data }) => {
    const { storeImage } = await import("@/lib/r2");
    const mime = data.mime === "image/jpeg" ? "image/jpeg" : "image/webp";
    const raw = data.data.includes(",") ? data.data.split(",")[1] : data.data;
    const bytes = Buffer.from(raw, "base64");
    if (!bytes.length) throw new Error("The photo did not arrive.");
    if (bytes.length > 1_200_000) throw new Error("That photo is still too large after compression.");
    return storeImage({
      filename: data.filename || "piece.webp",
      mime,
      bytes,
      folder: `pieces/${context.userId}`,
    });
  });