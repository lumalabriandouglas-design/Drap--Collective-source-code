import { liveFloor } from "@/lib/catalog-core";
import { getFloorSession } from "@/lib/floor-auth";
import {
  addPreviewPiece,
  buildPreviewPiece,
  getPreviewAtelier,
  listPreviewPieces,
  savePreviewAtelier,
} from "@/lib/preview-rail";
import type { AtelierProfile, Product } from "@/lib/types";

function sameHouse(left: string | null | undefined, right: string | null | undefined) {
  if (!left || !right) return false;
  return left.toLowerCase().trim() === right.toLowerCase().trim();
}

async function studioFromFloor(): Promise<{ atelier: AtelierProfile | null; pieces: Product[] }> {
  const session = getFloorSession();
  if (!session) return { atelier: null, pieces: [] };
  const floor = await liveFloor();
  const livePieces = floor.products.filter(
    (p) => p.listedBy === session.profileId || p.listedBy === session.userId,
  );
  const previewPieces = listPreviewPieces().filter(
    (p) => p.listedBy === session.profileId || p.listedBy === session.userId,
  );
  const pieces = [
    ...previewPieces.filter((p) => !livePieces.some((row) => row.slug === p.slug)),
    ...livePieces,
  ];
  const designer =
    floor.designers.find((d) => d.userId === session.profileId || d.userId === session.userId) ??
    floor.designers.find((d) => sameHouse(d.name, session.brandName) || sameHouse(d.name, session.displayName)) ??
    (pieces[0]
      ? floor.designers.find((d) => d.slug === pieces[0].designer.slug)
      : undefined);
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
  if (import.meta.env.DEV || import.meta.env.SSR) {
    try {
      const { getMyStudioRpc } = await import("@/lib/studio-rpc");
      return await getMyStudioRpc();
    } catch {
      /* floor */
    }
  }
  return studioFromFloor();
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
  if (import.meta.env.DEV || import.meta.env.SSR) {
    const { openAtelierRpc } = await import("@/lib/studio-rpc");
    return await openAtelierRpc({ data: opts.data });
  }
  throw new Error("Sign in to open an atelier.");
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
      designer: {
        id: studio.atelier.id,
        slug: studio.atelier.slug,
        name: studio.atelier.name,
        city: studio.atelier.city,
        country: studio.atelier.country,
        imageUrl: studio.atelier.imageUrl || imageUrls[0],
        userId: session.profileId || session.userId,
      },
      listedBy: session.profileId || session.userId,
    });
    addPreviewPiece(piece);
    return { slug: piece.slug };
  }
  if (import.meta.env.DEV || import.meta.env.SSR) {
    const { listPieceRpc } = await import("@/lib/studio-rpc");
    return await listPieceRpc({ data: opts.data });
  }
  throw new Error("Sign in to list a piece.");
}

export async function storageStatus() {
  try {
    const response = await fetch("/api/storage");
    if (response.ok) {
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
  if (import.meta.env.DEV || import.meta.env.SSR) {
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

export async function uploadPiecePhoto(opts: {
  data: { filename: string; mime: string; data: string };
}) {
  if (!opts.data.data?.startsWith("data:image")) {
    throw new Error("That file could not be stored.");
  }
  const session = getFloorSession();
  try {
    const response = await fetch("/api/photo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
      },
      body: JSON.stringify(opts.data),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      url?: string;
      backend?: "r2" | "preview";
      error?: string;
    };
    if (response.ok && payload.url) {
      return { url: payload.url, backend: payload.backend ?? "r2" };
    }
    if (response.status === 503) {
      throw new Error(
        payload.error ||
          "Cloudflare is not connected yet. Add the R2 keys on Vercel so photographs leave the house database.",
      );
    }
    if (response.status !== 404) {
      throw new Error(payload.error || "Could not store that photograph.");
    }
  } catch (err) {
    if (err instanceof TypeError) {
      /* no /api on this local preview */
    } else if (err instanceof Error) {
      throw err;
    }
  }
  if (import.meta.env.DEV || import.meta.env.SSR) {
    const { uploadPiecePhotoRpc } = await import("@/lib/studio-rpc");
    return await uploadPiecePhotoRpc({ data: opts.data });
  }
  throw new Error("Photographs now go to Cloudflare. Connect R2 on this preview to list a piece.");
}
