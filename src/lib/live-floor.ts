import type { Designer, Lookbook, Product } from "@/lib/types";

const SUPABASE_URL = "https://fpvbhlbqojxrgnvxpcng.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwdmJobGJxb2p4cmdudnhwY25nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2ODk4ODYsImV4cCI6MjA5NjI2NTg4Nn0.MHQq6Sq3xLyLxE3ZqcNW9_5k4knMKB4fp7vH7Ja-Ees";

type RawProduct = {
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

type RawProfile = {
  id: string;
  user_id?: string | null;
  role: string | null;
  brand_name: string | null;
  username: string | null;
  bio: string | null;
  location: string | null;
  profile_photo_url: string | null;
  design_philosophy: string | null;
  primary_materials: string[] | null;
  status: string | null;
  is_suspended: boolean | null;
};

export type Floor = {
  products: Product[];
  designers: Designer[];
  lookbooks: Lookbook[];
};

const CACHE_MS = 45_000;
let cache: { at: number; floor: Floor } | null = null;

function numericId(uuid: string): number {
  const n = Number.parseInt(uuid.replace(/-/g, "").slice(0, 7), 16);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function slugify(value: string, id: string) {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42);
  return `${base || "piece"}-${id.slice(0, 8)}`;
}

function titleCase(value: string) {
  const cleaned = value.trim().replace(/\s+/g, " ");
  if (/^2\s*piece$/i.test(cleaned)) return "Two-Piece";
  return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
}

function mapCategory(name: string, raw: string | null): string {
  const hay = `${name} ${raw ?? ""}`.toLowerCase();
  if (hay.includes("wedding") || hay.includes("bridal")) return "Evening";
  if (hay.includes("party") || hay.includes("dinner") || hay.includes("evening")) return "Evening";
  if (hay.includes("press") || hay.includes("machine")) return "Other";
  if (hay.includes("2piece") || hay.includes("two-piece") || hay.includes("clothing")) {
    return "Ready-to-Wear";
  }
  return "Ready-to-Wear";
}

function kampalaLocation(raw: string | null): { city: string; country: string } {
  const loc = (raw ?? "").trim();
  if (!loc) return { city: "Kampala", country: "Uganda" };
  if (/uganda/i.test(loc) && !/kampala/i.test(loc)) {
    return { city: loc, country: "Uganda" };
  }
  return { city: loc.replace(/,?\s*uganda$/i, "").trim() || "Kampala", country: "Uganda" };
}

function designerName(profile: RawProfile): string {
  const brand = profile.brand_name?.trim();
  if (brand) {
    const pretty: Record<string, string> = {
      "house of zion": "House of Zion",
      "tassy stitches": "Tassy Stitches",
      "ensemble fashions": "Ensemble Fashions",
      "ucj fashions": "UCJ Fashions",
      "may stitches": "May Stitches",
    };
    return pretty[brand.toLowerCase()] ?? brand.replace(/\s+/g, " ");
  }
  if (profile.username?.trim()) return profile.username.trim();
  return "Independent Designer";
}

function designerBio(profile: RawProfile, name: string, city: string): string {
  if (profile.bio?.trim()) return profile.bio.trim();
  if (name !== "Independent Designer") {
    return `${name} is a Kampala atelier on Drapé Collective, based at ${city}.`;
  }
  return "An independent Kampala designer listing original pieces on Drapé Collective.";
}

function productTags(name: string, category: string, materials: string[]): string[] {
  const tags = new Set<string>([category.toLowerCase()]);
  const hay = name.toLowerCase();
  if (hay.includes("wedding")) {
    tags.add("bridal"); tags.add("ivory"); tags.add("evening");
  }
  if (hay.includes("party")) {
    tags.add("party"); tags.add("evening"); tags.add("bold");
  }
  if (hay.includes("dinner") || hay.includes("corset")) {
    tags.add("evening"); tags.add("sculptural");
  }
  if (hay.includes("two-piece") || hay.includes("2piece")) {
    tags.add("everyday"); tags.add("ready-to-wear");
  }
  for (const material of materials) tags.add(material.toLowerCase());
  return [...tags];
}

async function rest<T>(path: string): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Accept: "application/json",
    },
  });
  if (!response.ok) throw new Error(`Floor request failed (${response.status})`);
  return (await response.json()) as T;
}

function buildLookbooks(products: Product[], designers: Designer[]): Lookbook[] {
  const wedding = products.find((p) => /wedding/i.test(p.name));
  const dinner = products.find((p) => /dinner/i.test(p.name));
  const party = products.find(
    (p) => /party/i.test(p.name) && p.designer.name.toLowerCase().includes("tassy"),
  );
  const zion = designers.find((d) => /zion/i.test(d.name));
  const tassy = designers.find((d) => /tassy/i.test(d.name));
  const stories: Lookbook[] = [];
  if (wedding) {
    stories.push({
      id: 1,
      slug: "ceremony-cloth",
      title: "Ceremony cloth",
      subtitle: "House of Zion, Julaina",
      coverUrl: wedding.imageUrls[0] ?? "/images/hero.jpg",
      body: "A lace mermaid wedding dress listed from Julaina — one of the first ceremony pieces on the Drapé floor.",
      productSlugs: [
        wedding.slug,
        ...products.filter((p) => p.designer.slug === wedding.designer.slug && p.slug !== wedding.slug).map((p) => p.slug),
      ].slice(0, 4),
      designerSlug: zion?.slug ?? wedding.designer.slug,
      designerName: wedding.designer.name,
    });
  }
  if (dinner) {
    stories.push({
      id: 2,
      slug: "after-dark-kampala",
      title: "After dark",
      subtitle: "Draped corset, listed as a dinner dress",
      coverUrl: dinner.imageUrls[0] ?? "/images/hero.jpg",
      body: "The designer called it a dinner dress: draped corset long dress. Bridal satin, size XS.",
      productSlugs: [dinner.slug],
      designerSlug: dinner.designer.slug,
      designerName: dinner.designer.name,
    });
  }
  if (party) {
    stories.push({
      id: 3,
      slug: "city-mall-floor",
      title: "On the mall floor",
      subtitle: "Tassy Stitches, City Mall",
      coverUrl: party.imageUrls[0] ?? "/images/hero.jpg",
      body: "Tassy Stitches lists from City Mall: gold sequin party dresses, sandwich cloth, sizes through XXL.",
      productSlugs: products.filter((p) => p.designer.slug === party.designer.slug).map((p) => p.slug),
      designerSlug: tassy?.slug ?? party.designer.slug,
      designerName: party.designer.name,
    });
  }
  return stories;
}

export async function loadFloor(force = false): Promise<Floor> {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache.floor;

  const [rawProducts, rawProfiles] = await Promise.all([
    rest<RawProduct[]>("products?select=*&order=created_at.desc&limit=100"),
    rest<RawProfile[]>(
      "profiles?select=id,user_id,role,brand_name,username,bio,location,profile_photo_url,design_philosophy,primary_materials,status,is_suspended&limit=100",
    ),
  ]);

  const profiles = rawProfiles.filter((p) => !p.is_suspended && p.role === "designer");
  const published = rawProducts.filter(
    (p) => p.status === "published" && !p.is_hidden && !p.is_deleted && (p.image_urls?.length ?? 0) > 0,
  );

  const designerIds = new Set(published.map((p) => p.user_id).filter(Boolean) as string[]);
  const activeProfiles = profiles.filter(
    (p) => designerIds.has(p.id) || Boolean(p.brand_name?.trim()),
  );

  const designers: Designer[] = activeProfiles.map((profile) => {
    const name = designerName(profile);
    const { city, country } = kampalaLocation(profile.location);
    const pieces = published.filter((p) => p.user_id === profile.id);
    const cover = pieces[0]?.image_urls?.[0] || profile.profile_photo_url || "/images/products/studio-2.jpg";
    return {
      id: numericId(profile.id),
      slug: slugify(name === "Independent Designer" ? `atelier-${profile.id.slice(0, 6)}` : name, profile.id),
      name,
      city,
      country,
      bio: designerBio(profile, name, city),
      philosophy: profile.design_philosophy?.trim() || null,
      imageUrl: cover,
      featured: Boolean(profile.brand_name?.trim()) && pieces.length > 0,
      userId: profile.id,
      pieceCount: pieces.length,
    };
  });

  const designerByUser = new Map(designers.map((d) => [d.userId, d]));

  const products: Product[] = published.map((row) => {
    const house = row.user_id ? designerByUser.get(row.user_id) : undefined;
    const designer =
      house ??
      ({
        id: 0,
        slug: "independent",
        name: "Independent Designer",
        city: "Kampala",
        country: "Uganda",
        imageUrl: "/images/products/studio-2.jpg",
      } satisfies Product["designer"]);
    const name = titleCase(row.name?.trim() || "Untitled piece");
    const materials = (row.materials ?? []).map(String).filter(Boolean);
    const sizes = (row.sizes ?? []).map((s) => (s === "All" ? "One Size" : s));
    const category = mapCategory(name, row.category);
    const description =
      row.description?.trim() ||
      row.artistic_statement?.trim() ||
      `Listed by ${designer.name}${designer.city ? `, ${designer.city}` : ""}. Inquire for measurements, cloth, and finish.`;
    return {
      id: numericId(row.id),
      slug: slugify(name, row.id),
      name,
      description,
      category,
      priceCents: Math.max(0, Math.round(Number(row.price) || 0)),
      materials,
      sizes: sizes.length ? sizes : ["M"],
      imageUrls: (row.image_urls ?? []).filter(Boolean),
      tags: productTags(name, category, materials),
      leadTime: row.lead_time?.trim() || "Made to order · inquire",
      featured: Boolean(house?.featured) || /dinner|wedding/i.test(name),
      listedBy: row.user_id,
      designer,
    };
  });

  const lookbooks = buildLookbooks(products, designers);
  const floor: Floor = {
    products,
    designers: designers.sort((a, b) => Number(b.featured) - Number(a.featured) || b.pieceCount - a.pieceCount),
    lookbooks,
  };
  cache = { at: Date.now(), floor };
  return floor;
}

export function invalidateFloor() {
  cache = null;
}
