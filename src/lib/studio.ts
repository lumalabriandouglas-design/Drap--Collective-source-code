import { liveFloor } from "@/lib/catalog-core";
import { getFloorSession } from "@/lib/floor-auth";
import {
  addPreviewPiece,
  buildPreviewPiece,
  deletePreviewPiece,
  getPreviewAtelier,
  getPreviewPiece,
  hidePreviewPiece,
  isRemovedPiece,
  listPreviewPieces,
  savePreviewAtelier,
  showPreviewPiece,
  upsertPreviewPiece,
} from "@/lib/preview-rail";
import type { AtelierProfile, Product } from "@/lib/types";

function sameHouse(left: string | null | undefined, right: string | null | undefined) {
  if (!left || !right) return false;
  return left.toLowerCase().trim() === right.toLowerCase().trim();
}

function owns(piece: Product, session: { profileId: string; userId: string }) {
  return piece.listedBy === session.profileId || piece.listedBy === session.userId;
}

async function studioFromFloor(): Promise<{ atelier: AtelierProfile | null; pieces: Product[] }> {
  const session = getFloorSession();
  if (!session) return { atelier: null, pieces: [] };
  const floor = await liveFloor();
  const livePieces = floor.products.filter((p) => owns(p, session));
  const overlay = listPreviewPieces().filter((p) => owns(p, session));
  const bySlug = new Map<string, Product>();
  for (const piece of livePieces) bySlug.set(piece.slug, piece);
  for (const piece of overlay) {
    if (isRemovedPiece(piece)) {
      bySlug.delete(piece.slug);
      continue;
    }
    bySlug.set(piece.slug, piece);
  }
  const pieces = [...bySlug.values()];
  const designer =
    floor.designers.find((d) => d.userId === session.profileId || d.userId === session.userId) ??
    floor.designers.find((d) => sameHouse(d.name, session.brandName) || sameHouse(d.name, session.displayName)) ??
    (pieces[0] ? floor.designers.find((d) => d.slug === pieces[0].designer.slug) : undefined);
  const local = getPreviewAtelier(session.userId) ?? getPreviewAtelier(session.profileId);
  if (!designer && !local && pieces.length === 0) {
    return { atelier: null, pieces: [] };
  }
  if (!designer && !local) {
    return { atelier: null, pieces };
  }
  const atelier: AtelierProfile = designer
    ? {
        id: designer.id,
        slug: designer.slug,
        name: designer.name,
        city: designer.city,
        country: designer.country,
        bio: designer.bio ?? "",
        imageUrl: designer.imageUrl || pieces[0]?.imageUrls[0] || null,
      }
    : local!;
  return { atelier, pieces };
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
  return studio.pieces.find((row) => row.slug === slug) ?? getPreviewPiece(slug);
}

export async function openAtelier(opts: {
  data: { name: string; city: string; country: string; bio: string };
}) {
  const session = getFloorSession();
  if (session) {
    const existing = await studioFromFloor();
    if (existing.atelier) return { slug: existing.atelier.slug };
    const atelier = savePreviewAtelier({
      ownerId: session.userId,
      name: opts.data.name,
      city: opts.data.city,
      country: opts.data.country,
      bio: opts.data.bio,
    });
    return { slug: atelier.slug };
  }
  if (import.meta.env.VITE_SPA !== "true" && (import.meta.env.DEV || import.meta.env.SSR)) {
    const { openAtelierRpc } = await import("@/lib/studio-rpc");
    return await openAtelierRpc({ data: opts.data });
  }
  throw new Error("Sign in to open an atelier.");
}

function designerFromStudio(
  atelier: AtelierProfile,
  imageUrls: string[],
  session: { profileId: string; userId: string },
) {
  return {
    id: atelier.id,
    slug: atelier.slug,
    name: atelier.name,
    city: atelier.city,
    country: atelier.country,
    imageUrl: atelier.imageUrl || imageUrls[0],
    userId: session.profileId || session.userId,
  };
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
    if (!studio.atelier) throw new Error("Open an atelier first.");
    if (!imageUrls.length) throw new Error("Add a photograph of the piece.");
    const piece = buildPreviewPiece({
      ...opts.data,
      imageUrls,
      designer: designerFromStudio(studio.atelier, imageUrls, session),
      listedBy: session.profileId || session.userId,
    });
    addPreviewPiece(piece);
    return { slug: piece.slug };
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
  const studio = await studioFromFloor();
  if (!studio.atelier) throw new Error("Open an atelier first.");
  const current = studio.pieces.find((row) => row.slug === opts.data.slug);
  if (!current) throw new Error("That piece is not in your studio.");
  const imageUrls = opts.data.imageUrls.filter(Boolean);
  if (!imageUrls.length) throw new Error("Keep at least one photograph.");
  const piece = buildPreviewPiece({
    ...opts.data,
    imageUrls,
    slug: current.slug,
    designer: designerFromStudio(studio.atelier, imageUrls, session),
    listedBy: current.listedBy || session.profileId || session.userId,
  });
  piece.id = current.id;
  piece.tags = current.tags.includes("preview") ? piece.tags : ["preview", ...piece.tags.filter((t) => t !== "preview")];
  upsertPreviewPiece(piece);
  return { slug: piece.slug };
}

export async function hidePiece(slug: string) {
  const session = getFloorSession();
  if (!session) throw new Error("Sign in to hide a piece.");
  const studio = await studioFromFloor();
  const current = studio.pieces.find((row) => row.slug === slug);
  hidePreviewPiece(slug, current);
}

export async function unhidePiece(slug: string) {
  const session = getFloorSession();
  if (!session) throw new Error("Sign in to show a piece.");
  const studio = await studioFromFloor();
  const current = studio.pieces.find((row) => row.slug === slug);
  showPreviewPiece(slug, current);
}

export async function deletePiece(slug: string) {
  const session = getFloorSession();
  if (!session) throw new Error("Sign in to remove a piece.");
  const studio = await studioFromFloor();
  const current = studio.pieces.find((row) => row.slug === slug);
  deletePreviewPiece(slug, current);
}

export async function storageStatus() {
  try {
    const response = await fetch("/api/storage");
    const type = response.headers.get("content-type") || "";
    if (response.ok && type.includes("application/json")) {
      return (await response.json()) as {
        r2: boolean;
        account: boolean;
        bucket: boolean;
        keys: boolean;
        publicUrl: boolean;
        preview?: boolean;
        missing: string[];
      };
    }
  } catch {
    /* local house */
  }
  if (import.meta.env.VITE_SPA !== "true" && (import.meta.env.DEV || import.meta.env.SSR)) {
    try {
      const { storageStatusRpc } = await import("@/lib/studio-rpc");
      return await storageStatusRpc();
    } catch {
      /* preview */
    }
  }
  return {
    r2: false,
    account: false,
    bucket: false,
    keys: false,
    publicUrl: false,
    preview: true,
    missing: ["R2_PUBLIC_BASE"],
  };
}

function dataUrlToBlob(dataUrl: string) {
  const [header, raw] = dataUrl.split(",");
  const mime = header.match(/data:(.*?);/)?.[1] || "image/webp";
  const bytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
  return { blob: new Blob([bytes], { type: mime }), mime };
}

function isJsonResponse(response: Response) {
  return (response.headers.get("content-type") || "").includes("application/json");
}

export async function uploadPiecePhoto(opts: {
  data: { filename: string; mime: string; data: string };
}) {
  if (!opts.data.data?.startsWith("data:image")) {
    throw new Error("That file could not be stored.");
  }
  const session = getFloorSession();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (session?.accessToken) headers.Authorization = `Bearer ${session.accessToken}`;

  try {
    const signedRes = await fetch("/api/photo-sign", {
      method: "POST",
      headers,
      body: JSON.stringify({ filename: opts.data.filename, mime: opts.data.mime }),
    });
    const signed = (await signedRes.json().catch(() => ({}))) as {
      uploadUrl?: string;
      publicUrl?: string;
      mime?: string;
      error?: string;
    };
    if (isJsonResponse(signedRes) && signedRes.ok && signed.uploadUrl && signed.publicUrl) {
      const { blob, mime } = dataUrlToBlob(opts.data.data);
      const put = await fetch(signed.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": signed.mime || mime },
        body: blob,
      });
      if (put.ok) return { url: signed.publicUrl, backend: "r2" as const };
    }
  } catch {
    /* signed PUT blocked or /api missing */
  }

  try {
    const response = await fetch("/api/photo", {
      method: "POST",
      headers,
      body: JSON.stringify(opts.data),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      url?: string;
      backend?: "r2" | "preview";
      error?: string;
    };
    if (isJsonResponse(response) && response.ok && payload.url) {
      return { url: payload.url, backend: payload.backend ?? "r2" };
    }
    if (isJsonResponse(response) && response.status === 401) {
      throw new Error(payload.error || "Sign in to store a photograph.");
    }
  } catch (err) {
    if (err instanceof Error && err.message.toLowerCase().includes("sign in")) throw err;
  }

  if (import.meta.env.VITE_SPA !== "true" && (import.meta.env.DEV || import.meta.env.SSR)) {
    try {
      const { uploadPiecePhotoRpc } = await import("@/lib/studio-rpc");
      return await uploadPiecePhotoRpc({ data: opts.data });
    } catch {
      /* preview */
    }
  }

  return { url: opts.data.data, backend: "preview" as const };
}
