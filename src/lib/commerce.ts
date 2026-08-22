import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { loadFloor } from "@/lib/live-floor";
import { getSql } from "@/lib/db";
import type { OrderSummary } from "@/lib/types";

export type CheckoutInput = {
  shippingName: string;
  shippingLine1: string;
  shippingCity: string;
  shippingCountry: string;
  currency: string;
  items: {
    productId: number;
    slug: string;
    name: string;
    designerName: string;
    image: string;
    priceCents: number;
    size: string;
    qty: number;
  }[];
};

export const listWishlist = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    return sql.query<{ product_id: number }>(
      `select product_id from wishlist where user_id = $1 order by created_at desc`,
      [context.userId],
    );
  });

export const toggleWishlist = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((productId: number) => productId)
  .handler(async ({ context, data: productId }) => {
    const sql = await getSql();
    const existing = await sql.query<{ product_id: number }>(
      `select product_id from wishlist where user_id = $1 and product_id = $2`,
      [context.userId, productId],
    );
    if (existing.length) {
      await sql.query(`delete from wishlist where user_id = $1 and product_id = $2`, [
        context.userId,
        productId,
      ]);
      return { saved: false };
    }
    await sql.query(`insert into wishlist (user_id, product_id) values ($1, $2)`, [
      context.userId,
      productId,
    ]);
    return { saved: true };
  });

export const listSavedProducts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const saved = await sql.query<{ product_id: number }>(
      `select product_id from wishlist where user_id = $1 order by created_at desc`,
      [context.userId],
    );
    const ids = new Set(saved.map((row) => Number(row.product_id)));
    if (!ids.size) return [];

    let live: Awaited<ReturnType<typeof loadFloor>>["products"] = [];
    try {
      live = (await loadFloor()).products;
    } catch {
      live = [];
    }
    const fromLive = live.filter((p) => ids.has(p.id));

    const local = await sql.query<{
      id: number;
      slug: string;
      name: string;
      price_cents: number;
      image: string | null;
      designer_name: string;
      designer_slug: string;
    }>(
      `select p.id, p.slug, p.name, p.price_cents,
              p.image_urls->>0 as image,
              d.name as designer_name, d.slug as designer_slug
       from products p
       join designers d on d.id = p.designer_id
       where p.id = any(string_to_array($1, ',')::int[])`,
      [[...ids].join(",") || "0"],
    );

    const seen = new Set(fromLive.map((p) => p.id));
    return [
      ...fromLive.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        price_cents: p.priceCents,
        image: p.imageUrls[0] ?? null,
        designer_name: p.designer.name,
        designer_slug: p.designer.slug,
      })),
      ...local.filter((row) => !seen.has(Number(row.id))),
    ];
  });

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: CheckoutInput) => input)
  .handler(async ({ context, data }) => {
    const name = data.shippingName.trim();
    const line1 = data.shippingLine1.trim();
    const city = data.shippingCity.trim();
    const country = data.shippingCountry.trim();
    if (!name || !line1 || !city || !country) {
      throw new Error("Please complete your delivery details.");
    }
    if (!data.items.length) throw new Error("Your bag is empty.");

    let catalog: Awaited<ReturnType<typeof loadFloor>>["products"] = [];
    try {
      catalog = (await loadFloor()).products;
    } catch {
      catalog = [];
    }
    const byId = new Map(catalog.map((p) => [p.id, p]));

    let total = 0;
    const lines: {
      productId: number | null;
      name: string;
      designerName: string;
      size: string;
      qty: number;
      priceCents: number;
      imageUrl: string | null;
    }[] = [];

    for (const item of data.items) {
      const live = byId.get(item.productId);
      const qty = Math.min(Math.max(item.qty, 1), 8);
      const price = live?.priceCents ?? item.priceCents;
      const label = live?.name ?? item.name;
      if (!label || !Number.isFinite(price)) continue;
      total += price * qty;
      lines.push({
        productId: null,
        name: label,
        designerName: live?.designer.name ?? item.designerName,
        size: item.size,
        qty,
        priceCents: price,
        imageUrl: live?.imageUrls[0] ?? item.image ?? null,
      });
    }
    if (!lines.length) throw new Error("Those pieces are no longer available.");

    const sql = await getSql();
    const orderRows = await sql.query<{ id: number }>(
      `insert into orders (user_id, status, total_cents, currency, shipping_name, shipping_line1, shipping_city, shipping_country)
       values ($1, 'confirmed', $2, $3, $4, $5, $6, $7)
       returning id`,
      [context.userId, total, data.currency || "UGX", name, line1, city, country],
    );
    const orderId = Number(orderRows[0].id);
    for (const line of lines) {
      await sql.query(
        `insert into order_items (order_id, product_id, name, designer_name, size, qty, price_cents, image_url)
         values ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [orderId, line.productId, line.name, line.designerName, line.size, line.qty, line.priceCents, line.imageUrl],
      );
    }
    return { orderId, totalCents: total };
  });

export const listOrders = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const orders = await sql.query<{
      id: number;
      status: string;
      total_cents: number;
      currency: string;
      shipping_name: string;
      shipping_city: string;
      shipping_country: string;
      created_at: string;
    }>(
      `select id, status, total_cents, currency, shipping_name, shipping_city, shipping_country, created_at
       from orders where user_id = $1 order by created_at desc`,
      [context.userId],
    );
    const result: OrderSummary[] = [];
    for (const order of orders) {
      const items = await sql.query<{
        name: string;
        designer_name: string;
        size: string;
        qty: number;
        price_cents: number;
        image_url: string | null;
      }>(`select name, designer_name, size, qty, price_cents, image_url from order_items where order_id = $1`, [order.id]);
      result.push({
        id: Number(order.id),
        status: order.status,
        totalCents: Number(order.total_cents),
        currency: order.currency,
        shippingName: order.shipping_name,
        shippingCity: order.shipping_city,
        shippingCountry: order.shipping_country,
        createdAt: order.created_at,
        items: items.map((item) => ({
          name: item.name,
          designerName: item.designer_name,
          size: item.size,
          qty: Number(item.qty),
          priceCents: Number(item.price_cents),
          imageUrl: item.image_url,
        })),
      });
    }
    return result;
  });

export const sendInquiry = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { productId?: number; designerId?: number; message: string }) => input)
  .handler(async ({ context, data }) => {
    const message = data.message.trim();
    if (message.length < 8) throw new Error("Write a little more so the atelier can reply.");
    const sql = await getSql();
    await sql.query(
      `insert into inquiries (user_id, product_id, designer_id, message) values ($1, $2, $3, $4)`,
      [context.userId, data.productId ?? null, data.designerId ?? null, message],
    );
    return { ok: true };
  });
