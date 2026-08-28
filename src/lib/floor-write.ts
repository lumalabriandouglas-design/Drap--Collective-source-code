import { getFloorSession, setFloorSession, type FloorSession } from "@/lib/floor-auth";
import { invalidateFloor, showroomSlug } from "@/lib/live-floor";
import type { AtelierProfile, Product } from "@/lib/types";

const SUPABASE_URL = "https://fpvbhlbqojxrgnvxpcng.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwdmJobGJxb2p4cmdudnhwY25nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2ODk4ODYsImV4cCI6MjA5NjI2NTg4Nn0.MHQq6Sq3xLyLxE3ZqcNW9_5k4knMKB4fp7vH7Ja-Ees";

export type RawFloorProduct = {
  id: string;
  user_id: string | null;
  name: string | null;
  description: string | null;
  category: string | null;
  price: number | null;
  materials: string[] | null;
  sizes: string[] | null;
  image_urls: string[] | null;
  tags: string[] | null;
  lead_time: string | null;
  artistic_statement: string | null;
  status: string | null;
  is_hidden: boolean | null;
  is_deleted: boolean | null;
  is_featured: boolean | null;
  created_at: string | null;
};

function sessionOrThrow(): FloorSession {
  const session = getFloorSession();
  if (!session?.accessToken) throw new Error("Sign in to continue.");
  return session;
}

function headers(token: string, prefer = "return=representation"): HeadersInit {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    Prefer: prefer,
  };
}

async function readError(res: Response) {
  const text = await res.text().catch(() => "");
  try {
    const json = JSON.parse(text) as { message?: string; error?: string; hint?: string; details?: string };
    return json.message || json.error || json.hint || json.details || text.slice(0, 180);
  } catch {
    return text.slice(0, 180) || `The house replied ${res.status}.`;
  }
}

async function rest<T>(path: string, init: RequestInit & { token: string }): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      ...headers(init.token, String((init.headers as Record<string, string> | undefined)?.Prefer ?? "return=representation")),
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  if (!res.ok) throw new Error(await readError(res));
  const text = await res.text();
  if (!text) return [] as T;
  return JSON.parse(text) as T;
}

export function slugFromRecord(name: string, id: string) {
  return showroomSlug(name, id);
}

export function assertPublicPhotos(urls: string[]) {
  const clean = urls.filter(Boolean);
  if (!clean.length) throw new Error("Add a photograph of the piece.");
  if (clean.some((url) => url.startsWith("data:") || url.startsWith("blob:"))) {
    throw new Error("Wait for the photograph to finish uploading, then publish.");
  }
  return clean;
}

export async function patchDesignerProfile(input: {
  name: string;
  city: string;
  country: string;
  bio: string;
}): Promise<AtelierProfile> {
  const session = sessionOrThrow();
  const name = input.name.trim();
  const city = input.city.trim() || "Kampala";
  const country = input.country.trim() || "Uganda";
  const bio = input.bio.trim();
  if (name.length < 2) throw new Error("Give your studio a name.");
  const location = `${city}, ${country}`;
  const body = {
    brand_name: name,
    username: name.slice(0, 48),
    bio,
    location,
    role: session.role === "admin" ? "admin" : "designer",
  };

  const tryPatch = async (column: string, value: string) =>
    rest<Array<{ id: string; brand_name: string | null; username: string | null; bio: string | null; location: string | null }>>(
      `profiles?${column}=eq.${encodeURIComponent(value)}`,
      { method: "PATCH", token: session.accessToken, body: JSON.stringify(body) },
    );

  let rows = (await tryPatch("id", session.profileId).catch(() => [])) || [];
  if (!rows.length && session.userId !== session.profileId) {
    rows = (await tryPatch("user_id", session.userId).catch(() => [])) || [];
  }
  if (!rows.length) {
    rows = (await tryPatch("email", session.email).catch(() => [])) || [];
  }
  if (!rows.length) {
    throw new Error("Could not open your studio on the house book.");
  }

  if (session.role !== "admin") {
    setFloorSession({
      ...session,
      role: "designer",
      brandName: name,
      displayName: name,
    });
  } else {
    setFloorSession({ ...session, brandName: name, displayName: name });
  }

  const profile = rows[0];
  return {
    id: Number.parseInt(profile.id.replace(/-/g, "").slice(0, 7), 16) || Date.now(),
    slug: slugFromRecord(name, profile.id),
    name,
    city,
    country,
    bio: profile.bio?.trim() || bio,
    imageUrl: session.avatarUrl,
    recordId: profile.id,
  };
}

export async function fetchMyRawProducts(): Promise<RawFloorProduct[]> {
  const session = sessionOrThrow();
  const ids = [...new Set([session.profileId, session.userId].filter(Boolean))];
  const batches = await Promise.all(
    ids.map((id) =>
      rest<RawFloorProduct[]>(
        `products?user_id=eq.${id}&is_deleted=eq.false&select=*&order=created_at.desc&limit=100`,
        { method: "GET", token: session.accessToken },
      ).catch(() => [] as RawFloorProduct[]),
    ),
  );
  const byId = new Map<string, RawFloorProduct>();
  for (const row of batches.flat()) byId.set(row.id, row);
  return [...byId.values()];
}

export async function insertLiveProduct(input: {
  name: string;
  description: string;
  category: string;
  price: number;
  sizes: string[];
  imageUrls: string[];
  leadTime: string;
}): Promise<{ id: string; slug: string }> {
  const session = sessionOrThrow();
  const imageUrls = assertPublicPhotos(input.imageUrls);
  const bodyFor = (userId: string) =>
    JSON.stringify({
      user_id: userId,
      name: input.name.trim(),
      description: input.description.trim(),
      category: input.category,
      price: Math.round(input.price),
      materials: [],
      sizes: input.sizes,
      image_urls: imageUrls,
      tags: [input.category.toLowerCase()],
      lead_time: input.leadTime.trim() || "Made to order · inquire",
      artistic_statement: input.description.trim(),
      status: "published",
      is_hidden: false,
      is_deleted: false,
    });
  let rows: RawFloorProduct[];
  try {
    rows = await rest<RawFloorProduct[]>("products", {
      method: "POST",
      token: session.accessToken,
      body: bodyFor(session.profileId || session.userId),
    });
  } catch (err) {
    if (!session.userId || session.userId === session.profileId) throw err;
    rows = await rest<RawFloorProduct[]>("products", {
      method: "POST",
      token: session.accessToken,
      body: bodyFor(session.userId),
    });
  }
  const row = Array.isArray(rows) ? rows[0] : (rows as RawFloorProduct);
  if (!row?.id) throw new Error("The piece was not saved.");
  invalidateFloor();
  return { id: row.id, slug: slugFromRecord(row.name || input.name, row.id) };
}

export async function updateLiveProduct(input: {
  recordId: string;
  name: string;
  description: string;
  category: string;
  price: number;
  sizes: string[];
  imageUrls: string[];
  leadTime: string;
}): Promise<{ id: string; slug: string }> {
  const session = sessionOrThrow();
  const imageUrls = assertPublicPhotos(input.imageUrls);
  const rows = await rest<RawFloorProduct[]>(`products?id=eq.${input.recordId}`, {
    method: "PATCH",
    token: session.accessToken,
    body: JSON.stringify({
      name: input.name.trim(),
      description: input.description.trim(),
      category: input.category,
      price: Math.round(input.price),
      sizes: input.sizes,
      image_urls: imageUrls,
      lead_time: input.leadTime.trim() || "Made to order · inquire",
      artistic_statement: input.description.trim(),
      status: "published",
      is_deleted: false,
    }),
  });
  const row = Array.isArray(rows) ? rows[0] : (rows as RawFloorProduct);
  invalidateFloor();
  return { id: input.recordId, slug: slugFromRecord(row?.name || input.name, input.recordId) };
}

export async function setLiveProductFlags(recordId: string, flags: { is_hidden?: boolean; is_deleted?: boolean }) {
  const session = sessionOrThrow();
  await rest(`products?id=eq.${recordId}`, {
    method: "PATCH",
    token: session.accessToken,
    body: JSON.stringify(flags),
    headers: { Prefer: "return=minimal" },
  });
  invalidateFloor();
}

export function mapRawToStudioPiece(row: RawFloorProduct, atelier: AtelierProfile): Product {
  const name = row.name?.trim() || "Untitled piece";
  const tags = (row.tags ?? []).map(String);
  if (row.is_hidden && !tags.includes("hidden")) tags.push("hidden");
  return {
    id: Number.parseInt(row.id.replace(/-/g, "").slice(0, 7), 16) || 1,
    recordId: row.id,
    slug: slugFromRecord(name, row.id),
    name,
    description: row.description?.trim() || row.artistic_statement?.trim() || "",
    category: row.category || "Ready-to-Wear",
    priceCents: Math.max(0, Math.round(Number(row.price) || 0)),
    materials: (row.materials ?? []).map(String),
    sizes: (row.sizes ?? []).map(String).length ? (row.sizes ?? []).map(String) : ["M"],
    imageUrls: (row.image_urls ?? []).filter(Boolean),
    tags,
    leadTime: row.lead_time || "Made to order · inquire",
    featured: Boolean(row.is_featured),
    hidden: Boolean(row.is_hidden),
    listedBy: row.user_id,
    designer: {
      id: atelier.id,
      slug: atelier.slug,
      name: atelier.name,
      city: atelier.city,
      country: atelier.country,
      imageUrl: atelier.imageUrl || row.image_urls?.[0] || "/images/products/studio-2.jpg",
      userId: row.user_id,
    },
  };
}
