import { liveFloor } from "@/lib/catalog-core";
import { getFloorSession, type FloorSession } from "@/lib/floor-auth";
import type { OrderSummary, Product } from "@/lib/types";

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
    designerSlug?: string;
    designerUserId?: string | null;
    image: string;
    priceCents: number;
    size: string;
    qty: number;
  }[];
};

const WISH_KEY = "drape.wishlist";
const ORDER_KEY = "drape.orders";
const SUPABASE_URL = "https://fpvbhlbqojxrgnvxpcng.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwdmJobGJxb2p4cmdudnhwY25nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2ODk4ODYsImV4cCI6MjA5NjI2NTg4Nn0.MHQq6Sq3xLyLxE3ZqcNW9_5k4knMKB4fp7vH7Ja-Ees";

const COMMISSION_MARK = "DRAPE_COMMISSION::";

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

function canTalkLive(session: FloorSession | null): session is FloorSession {
  return Boolean(session?.accessToken && session.accessToken.split(".").length === 3);
}

function liveHeaders(token: string): HeadersInit {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}

function ownerIds(session: FloorSession) {
  return [...new Set([session.userId, session.profileId].filter(Boolean))];
}

async function rest<T>(session: FloorSession, path: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...init,
      headers: { ...liveHeaders(session.accessToken), ...(init?.headers ?? {}) },
    });
    if (!res.ok) return null;
    if (res.status === 204) return [] as T;
    const text = await res.text();
    if (!text) return [] as T;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function findProduct(id: number): Promise<Product | undefined> {
  const floor = await liveFloor();
  return floor.products.find((item) => item.id === id);
}

function mapSaved(product: Product) {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    price_cents: product.priceCents,
    image: product.imageUrls[0] ?? null,
    designer_name: product.designer.name,
    designer_slug: product.designer.slug,
  };
}

async function houseWishRecords(session: FloorSession) {
  const ids = ownerIds(session);
  const rows: { product_id: string }[] = [];
  for (const userId of ids) {
    const likes = await rest<{ product_id: string }[]>(session, `likes?select=product_id&user_id=eq.${userId}&limit=200`);
    const saved = await rest<{ product_id: string }[]>(
      session,
      `saved_items?select=product_id&user_id=eq.${userId}&limit=200`,
    );
    if (likes) rows.push(...likes);
    if (saved) rows.push(...saved);
  }
  return [...new Set(rows.map((row) => row.product_id).filter(Boolean))];
}

async function houseNumericWishIds(session: FloorSession) {
  const records = await houseWishRecords(session);
  if (!records.length) return [] as number[];
  const floor = await liveFloor();
  const byRecord = new Map(floor.products.filter((p) => p.recordId).map((p) => [p.recordId as string, p.id]));
  const numeric = records.map((id) => {
    const asNumber = Number(id);
    if (Number.isFinite(asNumber) && asNumber > 0 && floor.products.some((p) => p.id === asNumber)) return asNumber;
    return byRecord.get(id);
  });
  return [...new Set(numeric.filter((id): id is number => typeof id === "number"))];
}

function localWishIds() {
  return readJson<number[]>(WISH_KEY, []);
}

export async function listWishlist() {
  const session = getFloorSession();
  if (canTalkLive(session)) {
    const house = await houseNumericWishIds(session);
    const local = localWishIds();
    const ids = [...new Set([...house, ...local])];
    return ids.map((product_id) => ({ product_id }));
  }
  if (import.meta.env.VITE_SPA !== "true" && (import.meta.env.DEV || import.meta.env.SSR) && !session) {
    try {
      const { listWishlistRpc } = await import("@/lib/commerce-rpc");
      return await listWishlistRpc();
    } catch {
      /* local */
    }
  }
  return localWishIds().map((product_id) => ({ product_id }));
}

async function writeHouseHeart(session: FloorSession, recordId: string, saved: boolean) {
  const userId = session.userId;
  const tables = ["likes", "saved_items"] as const;
  for (const table of tables) {
    if (saved) {
      await rest(session, table, {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ user_id: userId, product_id: recordId }),
      });
    } else {
      for (const owner of ownerIds(session)) {
        await rest(session, `${table}?user_id=eq.${owner}&product_id=eq.${recordId}`, {
          method: "DELETE",
          headers: { Prefer: "return=minimal" },
        });
      }
    }
  }
}

export async function toggleWishlist(opts: { data: number }) {
  const id = opts.data;
  const local = localWishIds();
  const currentlyLocal = local.includes(id);
  const session = getFloorSession();
  let currentlySaved = currentlyLocal;
  if (canTalkLive(session)) {
    const house = await houseNumericWishIds(session);
    currentlySaved = house.includes(id) || currentlyLocal;
  }
  const nextSaved = !currentlySaved;
  const nextLocal = nextSaved ? [...new Set([...local, id])] : local.filter((item) => item !== id);
  writeJson(WISH_KEY, nextLocal);

  if (canTalkLive(session)) {
    const product = await findProduct(id);
    if (product?.recordId) {
      try {
        await writeHouseHeart(session, product.recordId, nextSaved);
      } catch {
        /* local already written */
      }
    }
  } else if (import.meta.env.VITE_SPA !== "true" && (import.meta.env.DEV || import.meta.env.SSR) && !session) {
    try {
      const { toggleWishlistRpc } = await import("@/lib/commerce-rpc");
      return await toggleWishlistRpc({ data: opts.data });
    } catch {
      /* local */
    }
  }
  return { saved: nextSaved };
}

export async function listSavedProducts() {
  const wished = await listWishlist();
  const ids = new Set(wished.map((row) => row.product_id));
  if (!ids.size) return [];
  const products = (await liveFloor()).products.filter((p) => ids.has(p.id));
  return products.map(mapSaved);
}

function writeLocalOrder(data: CheckoutInput) {
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
  return order;
}

export function encodeCommission(order: OrderSummary) {
  return `${COMMISSION_MARK}${JSON.stringify(order)}`;
}

export function parseCommission(text: string): OrderSummary | null {
  const raw = text.trim();
  const idx = raw.indexOf(COMMISSION_MARK);
  if (idx < 0) return null;
  try {
    const parsed = JSON.parse(raw.slice(idx + COMMISSION_MARK.length)) as OrderSummary;
    if (!parsed?.id || !Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function notifyAteliers(data: CheckoutInput, order: OrderSummary) {
  const { openDeskNote } = await import("@/lib/desk");
  const groups = new Map<string, CheckoutInput["items"]>();
  for (const item of data.items) {
    const key = item.designerUserId || item.designerSlug || item.designerName;
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  for (const items of groups.values()) {
    const lead = items[0];
    const slice: OrderSummary = {
      ...order,
      totalCents: items.reduce((sum, item) => sum + item.priceCents * item.qty, 0),
      items: items.map((item) => ({
        name: item.name,
        designerName: item.designerName,
        size: item.size,
        qty: item.qty,
        priceCents: item.priceCents,
        imageUrl: item.image ?? null,
      })),
    };
    try {
      await openDeskNote({
        atelierId: lead.designerUserId || lead.designerSlug || "atelier",
        atelierName: lead.designerName,
        atelierSlug: lead.designerSlug,
        pieceSlug: lead.slug,
        pieceName: lead.name,
        pieceImage: lead.image,
        message: encodeCommission(slice),
      });
    } catch {
      /* local order already stored */
    }
  }
}

export async function placeOrder(opts: { data: CheckoutInput }) {
  const session = getFloorSession();
  if (!session) {
    if (import.meta.env.VITE_SPA !== "true" && (import.meta.env.DEV || import.meta.env.SSR)) {
      try {
        const { placeOrderRpc } = await import("@/lib/commerce-rpc");
        return await placeOrderRpc({ data: opts.data });
      } catch {
        /* fall through */
      }
    }
    throw new Error("Sign in to place an order.");
  }
  const order = writeLocalOrder(opts.data);
  await notifyAteliers(opts.data, order);
  return { orderId: order.id, totalCents: order.totalCents };
}

export async function listOrders() {
  const local = readJson<OrderSummary[]>(ORDER_KEY, []);
  const session = getFloorSession();
  if (canTalkLive(session)) {
    try {
      const { listCommissionOrders } = await import("@/lib/desk");
      const house = await listCommissionOrders();
      const seen = new Set<number>();
      const merged: OrderSummary[] = [];
      for (const order of [...house, ...local]) {
        if (seen.has(order.id)) continue;
        seen.add(order.id);
        merged.push(order);
      }
      return merged.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch {
      return local;
    }
  }
  if (import.meta.env.VITE_SPA !== "true" && (import.meta.env.DEV || import.meta.env.SSR) && !session) {
    try {
      const { listOrdersRpc } = await import("@/lib/commerce-rpc");
      return await listOrdersRpc();
    } catch {
      /* local */
    }
  }
  return local;
}

export async function sendInquiry(opts: {
  data: {
    productId?: number;
    designerId?: number;
    message: string;
    atelierId?: string;
    atelierName?: string;
    atelierSlug?: string;
    pieceSlug?: string;
    pieceName?: string;
    pieceImage?: string;
  };
}) {
  const { openDeskNote } = await import("@/lib/desk");
  if (!opts.data.atelierId && !opts.data.atelierSlug) {
    throw new Error("This atelier cannot be reached from here.");
  }
  return openDeskNote({
    atelierId: opts.data.atelierId || String(opts.data.designerId ?? ""),
    atelierName: opts.data.atelierName || "Atelier",
    atelierSlug: opts.data.atelierSlug,
    pieceSlug: opts.data.pieceSlug,
    pieceName: opts.data.pieceName,
    pieceImage: opts.data.pieceImage,
    message: opts.data.message,
  });
}
