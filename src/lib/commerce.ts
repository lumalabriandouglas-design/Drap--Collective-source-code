import { liveFloor } from "@/lib/catalog-core";
import { getFloorSession } from "@/lib/floor-auth";
import { CONTACT_EMAIL } from "@/lib/constants";
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

const WISH_KEY = "drape.wishlist";
const ORDER_KEY = "drape.orders";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export async function listWishlist() {
  if (import.meta.env.DEV || import.meta.env.SSR) {
    try {
      const { listWishlistRpc } = await import("@/lib/commerce-rpc");
      return await listWishlistRpc();
    } catch {
      /* local */
    }
  }
  const ids = readJson<number[]>(WISH_KEY, []);
  return ids.map((product_id) => ({ product_id }));
}

export async function toggleWishlist(opts: { data: number }) {
  if (import.meta.env.DEV || import.meta.env.SSR) {
    try {
      const { toggleWishlistRpc } = await import("@/lib/commerce-rpc");
      return await toggleWishlistRpc({ data: opts.data });
    } catch {
      /* local */
    }
  }
  const ids = readJson<number[]>(WISH_KEY, []);
  const next = ids.includes(opts.data) ? ids.filter((id) => id !== opts.data) : [...ids, opts.data];
  writeJson(WISH_KEY, next);
  return { saved: next.includes(opts.data) };
}

export async function listSavedProducts() {
  if (import.meta.env.DEV || import.meta.env.SSR) {
    try {
      const { listSavedProductsRpc } = await import("@/lib/commerce-rpc");
      return await listSavedProductsRpc();
    } catch {
      /* local */
    }
  }
  const ids = new Set(readJson<number[]>(WISH_KEY, []));
  if (!ids.size) return [];
  const products = (await liveFloor()).products.filter((p) => ids.has(p.id));
  return products.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    price_cents: p.priceCents,
    image: p.imageUrls[0] ?? null,
    designer_name: p.designer.name,
    designer_slug: p.designer.slug,
  }));
}

export async function placeOrder(opts: { data: CheckoutInput }) {
  if (import.meta.env.DEV || import.meta.env.SSR) {
    try {
      const { placeOrderRpc } = await import("@/lib/commerce-rpc");
      return await placeOrderRpc({ data: opts.data });
    } catch {
      /* local */
    }
  }
  if (!getFloorSession()) throw new Error("Sign in to place an order.");
  const data = opts.data;
  const name = data.shippingName.trim();
  const line1 = data.shippingLine1.trim();
  const city = data.shippingCity.trim();
  const country = data.shippingCountry.trim();
  if (!name || !line1 || !city || !country) {
    throw new Error("Please complete your delivery details.");
  }
  if (!data.items.length) throw new Error("Your bag is empty.");
  const total = data.items.reduce((sum, item) => sum + item.priceCents * item.qty, 0);
  const order: OrderSummary = {
    id: Date.now(),
    status: "confirmed",
    totalCents: total,
    currency: data.currency || "UGX",
    shippingName: name,
    shippingCity: city,
    shippingCountry: country,
    createdAt: new Date().toISOString(),
    items: data.items.map((item) => ({
      name: item.name,
      designerName: item.designerName,
      size: item.size,
      qty: item.qty,
      priceCents: item.priceCents,
      imageUrl: item.image ?? null,
    })),
  };
  writeJson(ORDER_KEY, [order, ...readJson<OrderSummary[]>(ORDER_KEY, [])].slice(0, 20));
  return { orderId: order.id, totalCents: total };
}

export async function listOrders() {
  if (import.meta.env.DEV || import.meta.env.SSR) {
    try {
      const { listOrdersRpc } = await import("@/lib/commerce-rpc");
      return await listOrdersRpc();
    } catch {
      /* local */
    }
  }
  return readJson<OrderSummary[]>(ORDER_KEY, []);
}

export async function sendInquiry(opts: {
  data: { productId?: number; designerId?: number; message: string };
}) {
  if (import.meta.env.DEV || import.meta.env.SSR) {
    try {
      const { sendInquiryRpc } = await import("@/lib/commerce-rpc");
      return await sendInquiryRpc({ data: opts.data });
    } catch {
      /* preview */
    }
  }
  const message = opts.data.message.trim();
  if (message.length < 8) throw new Error("Write a little more so the atelier can reply.");
  throw new Error(`Inquiries from this preview reach the house at ${CONTACT_EMAIL}.`);
}
