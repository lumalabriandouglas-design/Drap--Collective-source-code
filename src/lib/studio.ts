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
  if (!designer && !local && !session.brandName && pieces.length === 0) {
    return { atelier: null, pieces: [] };
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
    : local ?? {
        id: 0,
        slug: session.profileId.slice(0, 8),
        name: session.brandName ?? session.displayName,
        city: "Kampala",
        country: "Uganda",
        bio: "",
        imageUrl: pieces[0]?.imageUrls[0] || null,
      };
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
    if (existing.atelier && existing.atelier.id !== 0) return { slug: existing.atelier.slug };
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
    imageUrl: string;
    leadTime: string;
  };
}) {
  const session = getFloorSession();
  if (session) {
    const studio = await studioFromFloor();
    if (!studio.atelier) throw new Error("Open an atelier first.");
    if (!opts.data.imageUrl) throw new Error("Add a photograph of the piece.");
    const piece = buildPreviewPiece({
      ...opts.data,
      designer: {
        id: studio.atelier.id,
        slug: studio.atelier.slug,
        name: studio.atelier.name,
        city: studio.atelier.city,
        country: studio.atelier.country,
        imageUrl: studio.atelier.imageUrl || opts.data.imageUrl,
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
  if (getFloorSession()) {
    return {
      r2: false,
      account: false,
      bucket: false,
      keys: false,
      publicUrl: false,
      preview: true,
      missing: [] as string[],
    };
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
    missing: ["preview"],
  };
}

export async function uploadPiecePhoto(opts: {
  data: { filename: string; mime: string; data: string };
}) {
  const session = getFloorSession();
  if (session) {
    if (!opts.data.data?.startsWith("data:image")) {
      throw new Error("That file could not be stored.");
    }
    return { url: opts.data.data, backend: "preview" as const };
  }
  if (import.meta.env.DEV || import.meta.env.SSR) {
    const { uploadPiecePhotoRpc } = await import("@/lib/studio-rpc");
    return await uploadPiecePhotoRpc({ data: opts.data });
  }
  if (!opts.data.data?.startsWith("data:image")) {
    throw new Error("That file could not be stored.");
  }
  return { url: opts.data.data, backend: "preview" as const };
}
