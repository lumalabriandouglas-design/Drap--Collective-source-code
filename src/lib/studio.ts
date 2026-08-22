import { liveFloor } from "@/lib/catalog-core";
import { getFloorSession } from "@/lib/floor-auth";
import type { AtelierProfile, Product } from "@/lib/types";

const PREVIEW_WRITE =
  "Your existing pieces are already on the floor. Listing new work from this preview will open with the full house.";

async function studioFromFloor(): Promise<{ atelier: AtelierProfile | null; pieces: Product[] }> {
  const session = getFloorSession();
  if (!session) return { atelier: null, pieces: [] };
  const floor = await liveFloor();
  const pieces = floor.products.filter(
    (p) => p.listedBy === session.profileId || p.listedBy === session.userId,
  );
  const designer =
    floor.designers.find((d) => d.userId === session.profileId || d.userId === session.userId) ??
    (pieces[0]
      ? floor.designers.find((d) => d.slug === pieces[0].designer.slug)
      : undefined);
  if (!designer && !session.brandName && pieces.length === 0) {
    return { atelier: null, pieces: [] };
  }
  const atelier: AtelierProfile = {
    id: designer?.id ?? 0,
    slug: designer?.slug ?? session.profileId.slice(0, 8),
    name: designer?.name ?? session.brandName ?? session.displayName,
    city: designer?.city ?? "Kampala",
    country: designer?.country ?? "Uganda",
    bio: designer?.bio ?? "",
  };
  return { atelier, pieces };
}

export async function getMyStudio() {
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
  if (import.meta.env.DEV || import.meta.env.SSR) {
    const { openAtelierRpc } = await import("@/lib/studio-rpc");
    return await openAtelierRpc({ data: opts.data });
  }
  const existing = await studioFromFloor();
  if (existing.atelier) return { slug: existing.atelier.slug };
  throw new Error(PREVIEW_WRITE);
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
  if (import.meta.env.DEV || import.meta.env.SSR) {
    const { listPieceRpc } = await import("@/lib/studio-rpc");
    return await listPieceRpc({ data: opts.data });
  }
  throw new Error(PREVIEW_WRITE);
}

export async function storageStatus() {
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
    missing: ["preview"],
  };
}

export async function uploadPiecePhoto(opts: {
  data: { filename: string; mime: string; data: string };
}) {
  if (import.meta.env.DEV || import.meta.env.SSR) {
    const { uploadPiecePhotoRpc } = await import("@/lib/studio-rpc");
    return await uploadPiecePhotoRpc({ data: opts.data });
  }
  throw new Error(PREVIEW_WRITE);
}
