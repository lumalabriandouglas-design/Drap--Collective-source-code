import { MAX_PHOTOS_PER_PIECE } from "@/lib/constants";
import type { AtelierProfile, Designer, Product } from "@/lib/types";
import type { Floor } from "@/lib/live-floor";

const KEY = "drape.preview-rail.v1";
const EVENT = "drape-preview-rail";

type PreviewStore = {
  ateliers: Record<string, AtelierProfile>;
  pieces: Product[];
};

function empty(): PreviewStore {
  return { ateliers: {}, pieces: [] };
}

function read(): PreviewStore {
  if (typeof window === "undefined") return empty();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as PreviewStore;
    const ateliers = parsed.ateliers && !Array.isArray(parsed.ateliers) ? parsed.ateliers : {};
    return {
      ateliers,
      pieces: Array.isArray(parsed.pieces) ? parsed.pieces : [],
    };
  } catch {
    return empty();
  }
}

function write(store: PreviewStore) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    throw new Error("This preview cannot hold that photograph. Try a smaller file.");
  }
}

function slugify(value: string, suffix: string) {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42);
  return `${base || "piece"}-${suffix}`;
}

export function isPreviewPiece(product: Product) {
  return product.tags.includes("preview") || product.slug.includes("-preview-");
}

export function listPreviewPieces(): Product[] {
  return read().pieces;
}

export function getPreviewAtelier(ownerId: string | null | undefined): AtelierProfile | null {
  if (!ownerId) return null;
  const store = read();
  return store.ateliers[ownerId] ?? null;
}

export function savePreviewAtelier(input: {
  ownerId: string;
  name: string;
  city: string;
  country: string;
  bio: string;
}): AtelierProfile {
  const store = read();
  const existing = store.ateliers[input.ownerId];
  const atelier: AtelierProfile = {
    id: existing?.id ?? Date.now(),
    slug: existing?.slug ?? slugify(input.name, `preview-${input.ownerId.slice(0, 6)}`),
    name: input.name.trim(),
    city: input.city.trim() || "Kampala",
    country: input.country.trim() || "Uganda",
    bio: input.bio.trim(),
    imageUrl: existing?.imageUrl ?? null,
  };
  store.ateliers[input.ownerId] = atelier;
  write(store);
  return atelier;
}

export function addPreviewPiece(piece: Product) {
  const store = read();
  store.pieces = [piece, ...store.pieces.filter((row) => row.slug !== piece.slug)];
  write(store);
}

export function buildPreviewPiece(input: {
  name: string;
  description: string;
  category: string;
  price: number;
  sizes: string[];
  imageUrl?: string;
  imageUrls?: string[];
  leadTime: string;
  designer: Pick<Designer, "id" | "slug" | "name" | "city" | "country" | "imageUrl" | "userId">;
  listedBy: string;
}): Product {
  const stamp = Date.now();
  const imageUrls = (input.imageUrls?.length ? input.imageUrls : input.imageUrl ? [input.imageUrl] : [])
    .filter(Boolean)
    .slice(0, MAX_PHOTOS_PER_PIECE);
  return {
    id: 900_000_000 + (stamp % 1_000_000),
    slug: slugify(input.name, `preview-${stamp.toString(36)}`),
    name: input.name.trim(),
    description: input.description.trim(),
    category: input.category,
    priceCents: Math.max(0, Math.round(input.price)),
    materials: [],
    sizes: input.sizes.length ? input.sizes : ["M"],
    imageUrls,
    tags: ["preview", input.category.toLowerCase()],
    leadTime: input.leadTime.trim() || "Made to order · inquire",
    featured: false,
    listedBy: input.listedBy,
    designer: input.designer,
  };
}

export function mergePreviewRail(floor: Floor): Floor {
  const store = read();
  if (!store.pieces.length && !Object.keys(store.ateliers).length) return floor;
  const products = [
    ...store.pieces.filter((piece) => !floor.products.some((row) => row.slug === piece.slug)),
    ...floor.products,
  ];
  const designers = [...floor.designers];
  for (const [ownerId, atelier] of Object.entries(store.ateliers)) {
    if (designers.some((d) => d.slug === atelier.slug)) continue;
    designers.push({
      id: atelier.id,
      slug: atelier.slug,
      name: atelier.name,
      city: atelier.city,
      country: atelier.country,
      bio: atelier.bio,
      philosophy: null,
      imageUrl: atelier.imageUrl || store.pieces.find((p) => p.designer.slug === atelier.slug)?.imageUrls[0] || "/images/products/studio-2.jpg",
      featured: false,
      userId: ownerId,
      pieceCount: products.filter((p) => p.designer.slug === atelier.slug).length,
    });
  }
  return {
    ...floor,
    products,
    designers: designers.map((d) => ({
      ...d,
      pieceCount: products.filter((p) => p.designer.slug === d.slug).length,
    })),
  };
}
