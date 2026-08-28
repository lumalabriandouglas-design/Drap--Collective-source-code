import { liveFloor } from "@/lib/catalog-core";
import { getFloorSession } from "@/lib/floor-auth";
import {
  fetchMyRawProducts,
  insertLiveProduct,
  mapRawToStudioPiece,
  patchDesignerProfile,
  setLiveProductFlags,
  slugFromRecord,
  updateLiveProduct,
} from "@/lib/floor-write";
import { invalidateFloor } from "@/lib/live-floor";
import type { AtelierProfile, Product } from "@/lib/types";

const SUPABASE_URL = "https://fpvbhlbqojxrgnvxpcng.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwdmJobGJxb2p4cmdudnhwY25nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2ODk4ODYsImV4cCI6MjA5NjI2NTg4Nn0.MHQq6Sq3xLyLxE3ZqcNW9_5k4knMKB4fp7vH7Ja-Ees";

function sameHouse(left: string | null | undefined, right: string | null | undefined) {
  if (!left || !right) return false;
  return left.toLowerCase().trim() === right.toLowerCase().trim();
}

function owns(piece: Product, session: { profileId: string; userId: string }) {
  return (
    piece.listedBy === session.profileId ||
    piece.listedBy === session.userId ||
    piece.designer.userId === session.profileId ||
    piece.designer.userId === session.userId
  );
}

function atelierFromSession(): AtelierProfile | null {
  const session = getFloorSession();
  if (!session) return null;
  if (session.role !== "designer" && session.role !== "admin" && !session.brandName) return null;
  const name = session.brandName || session.displayName;
  const id = session.profileId || session.userId;
  return {
    id: Number.parseInt(id.replace(/-/g, "").slice(0, 7), 16) || Date.now(),
    slug: slugFromRecord(name, id),
    name,
    city: "Kampala",
    country: "Uganda",
    bio: "",
    imageUrl: session.avatarUrl,
    recordId: session.profileId,
  };
}

async function studioFromFloor(): Promise<{ atelier: AtelierProfile | null; pieces: Product[] }> {
  const session = getFloorSession();
  if (!session) return { atelier: null, pieces: [] };

  const floor = await liveFloor();
  const livePieces = floor.products.filter((p) => owns(p, session));
  const designer =
    floor.designers.find((d) => d.userId === session.profileId || d.userId === session.userId) ??
    floor.designers.find((d) => sameHouse(d.name, session.brandName) || sameHouse(d.name, session.displayName)) ??
    (livePieces[0] ? floor.designers.find((d) => d.slug === livePieces[0].designer.slug) : undefined);

  const local = atelierFromSession();
  const atelier: AtelierProfile | null = designer
    ? {
        id: designer.id,
        slug: designer.slug,
        name: designer.name,
        city: designer.city,
        country: designer.country,
        bio: designer.bio ?? "",
        imageUrl: designer.imageUrl || livePieces[0]?.imageUrls[0] || session.avatarUrl,
        recordId: designer.userId ?? session.profileId,
      }
    : session.role === "designer" || session.role === "admin" || session.brandName
      ? local
      : null;

  if (!atelier) return { atelier: null, pieces: [] };

  try {
    const raw = await fetchMyRawProducts();
    return { atelier, pieces: raw.map((row) => mapRawToStudioPiece(row, atelier)) };
  } catch {
    return { atelier, pieces: livePieces };
  }
}

export async function getMyStudio() {
  if (getFloorSession()) return studioFromFloor();
  if (import.meta.env.VITE_SPA !== "true" && (import.meta.env.DEV || import.meta.env.SSR)) {
    try {
      const { getMyStudioRpc } = await import("@/lib/studio-rpc");
      return await getMyStudioRpc();
    } catch {
      /* floor */
    }
  }
  return studioFromFloor();
}

export async function getOwnedPiece(slug: string): Promise<Product | null> {
  const studio = await getMyStudio();
  return (
    studio.pieces.find((row) => row.slug === slug || row.recordId === slug || row.recordId?.startsWith(slug.slice(-8))) ??
    null
  );
}

export async function openAtelier(opts: {
  data: { name: string; city: string; country: string; bio: string };
}) {
  const session = getFloorSession();
  if (session) {
    const atelier = await patchDesignerProfile(opts.data);
    invalidateFloor();
    return { slug: atelier.slug };
  }
  if (import.meta.env.VITE_SPA !== "true" && (import.meta.env.DEV || import.meta.env.SSR)) {
    const { openAtelierRpc } = await import("@/lib/studio-rpc");
    return await openAtelierRpc({ data: opts.data });
  }
  throw new Error("Sign in to open a studio.");
}

export async function listPiece(opts: {
  data: {
    name: string;
    description: string;
    category: string;
    price: number;
    sizes: string[];
    imageUrl?: string;
    imageUrls?: string[];
    leadTime: string;
    slug?: string;
  };
}) {
  const session = getFloorSession();
  const imageUrls = (opts.data.imageUrls?.length
    ? opts.data.imageUrls
    : opts.data.imageUrl
      ? [opts.data.imageUrl]
      : []
  ).filter(Boolean);
  if (session) {
    const studio = await studioFromFloor();
    if (!studio.atelier) throw new Error("Open a studio first.");
    if (!imageUrls.length) throw new Error("Add a photograph of the piece.");
    return insertLiveProduct({
      name: opts.data.name,
      description: opts.data.description,
      category: opts.data.category,
      price: opts.data.price,
      sizes: opts.data.sizes,
      imageUrls,
      leadTime: opts.data.leadTime,
    });
  }
  if (import.meta.env.VITE_SPA !== "true" && (import.meta.env.DEV || import.meta.env.SSR)) {
    const { listPieceRpc } = await import("@/lib/studio-rpc");
    return await listPieceRpc({ data: opts.data });
  }
  throw new Error("Sign in to list a piece.");
}

export async function updatePiece(opts: {
  data: {
    slug: string;
    name: string;
    description: string;
    category: string;
    price: number;
    sizes: string[];
    imageUrls: string[];
    leadTime: string;
  };
}) {
  const session = getFloorSession();
  if (!session) throw new Error("Sign in to edit a piece.");
  const current = await getOwnedPiece(opts.data.slug);
  if (!current?.recordId) throw new Error("That piece is not in your studio.");
  return updateLiveProduct({
    recordId: current.recordId,
    name: opts.data.name,
    description: opts.data.description,
    category: opts.data.category,
    price: opts.data.price,
    sizes: opts.data.sizes,
    imageUrls: opts.data.imageUrls,
    leadTime: opts.data.leadTime,
  });
}

export async function hidePiece(slug: string) {
  const session = getFloorSession();
  if (!session) throw new Error("Sign in to hide a piece.");
  const current = await getOwnedPiece(slug);
  if (!current?.recordId) throw new Error("That piece is not in your studio.");
  await setLiveProductFlags(current.recordId, { is_hidden: true });
}

export async function unhidePiece(slug: string) {
  const session = getFloorSession();
  if (!session) throw new Error("Sign in to show a piece.");
  const current = await getOwnedPiece(slug);
  if (!current?.recordId) throw new Error("That piece is not in your studio.");
  await setLiveProductFlags(current.recordId, { is_hidden: false });
}

export async function deletePiece(slug: string) {
  const session = getFloorSession();
  if (!session) throw new Error("Sign in to remove a piece.");
  const current = await getOwnedPiece(slug);
  if (!current?.recordId) throw new Error("That piece is not in your studio.");
  await setLiveProductFlags(current.recordId, { is_deleted: true });
}

export async function storageStatus() {
  return {
    r2: false,
    account: true,
    bucket: true,
    keys: true,
    publicUrl: true,
    preview: false,
    missing: [] as string[],
  };
}

function dataUrlToBlob(dataUrl: string) {
  const [header, raw] = dataUrl.split(",");
  const mime = header.match(/data:(.*?);/)?.[1] || "image/webp";
  const bytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
  return { blob: new Blob([bytes], { type: mime }), mime };
}

async function uploadToSupabase(input: {
  token: string;
  userId: string;
  filename: string;
  dataUrl: string;
}) {
  const { blob, mime } = dataUrlToBlob(input.dataUrl);
  const ext = mime === "image/jpeg" ? "jpg" : "webp";
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const path = `${input.userId}/${stamp}.${ext}`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/products/${path}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${input.token}`,
      "Content-Type": mime,
      "x-upsert": "true",
    },
    body: blob,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text.slice(0, 160) || "The house could not store that photograph.");
  }
  return `${SUPABASE_URL}/storage/v1/object/public/products/${path}`;
}

export async function uploadPiecePhoto(opts: {
  data: { filename: string; mime: string; data: string };
}) {
  if (!opts.data.data?.startsWith("data:image")) {
    throw new Error("That file could not be stored.");
  }
  const session = getFloorSession();
  if (!session?.accessToken) throw new Error("Sign in to store a photograph.");

  const url = await uploadToSupabase({
    token: session.accessToken,
    userId: session.userId,
    filename: opts.data.filename,
    dataUrl: opts.data.data,
  });
  return { url, backend: "supabase" as const };
}
