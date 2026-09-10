const SUPABASE_URL = "https://fpvbhlbqojxrgnvxpcng.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwdmJobGJxb2p4cmdudnhwY25nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2ODk4ODYsImV4cCI6MjA5NjI2NTg4Nn0.MHQq6Sq3xLyLxE3ZqcNW9_5k4knMKB4fp7vH7Ja-Ees";
const SITE = "https://www.odrapecollective.com";
const FALLBACK_IMAGE =
  "https://fpvbhlbqojxrgnvxpcng.supabase.co/storage/v1/object/public/designer-assets/products/64154a08-600f-498a-a980-0b6b41728ce1/1782136335977-e4gd1ftqqfm.jpeg";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugify(name, id) {
  const base = String(name || "atelier")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42);
  return `${base || "atelier"}-${String(id || "room").slice(0, 8)}`;
}

function compact(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/-/g, "");
}

function matches(idOrSlug, wanted) {
  const have = String(idOrSlug || "").toLowerCase();
  const need = String(wanted || "").toLowerCase();
  if (!have || !need) return false;
  if (have === need) return true;
  if (have.startsWith(`${need}-`) || have.endsWith(`-${need}`)) return true;
  const a = compact(have);
  const b = compact(need);
  if (a && b && (a === b || a.startsWith(b.slice(0, 8)) || b.startsWith(a.slice(0, 8)))) return true;
  return false;
}

async function rest(path) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Accept: "application/json",
    },
  });
  if (!response.ok) return [];
  return response.json();
}

function cardHtml({ title, description, url, image }) {
  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(description);
  const safeUrl = escapeHtml(url);
  const safeImage = escapeHtml(image || FALLBACK_IMAGE);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle}</title>
    <meta name="description" content="${safeDesc}" />
    <link rel="canonical" href="${safeUrl}" />
    <meta property="og:site_name" content="Drapé Collective" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDesc}" />
    <meta property="og:url" content="${safeUrl}" />
    <meta property="og:image" content="${safeImage}" />
    <meta property="og:image:alt" content="${safeTitle}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDesc}" />
    <meta name="twitter:image" content="${safeImage}" />
  </head>
  <body>
    <p><a href="${safeUrl}">${safeTitle}</a></p>
  </body>
</html>`;
}

async function resolveShare(kind, slug) {
  const wanted = decodeURIComponent(String(slug || "")).trim();
  const [profiles, products] = await Promise.all([
    rest("profiles?select=id,user_id,brand_name,username,bio,location,profile_photo_url,role,is_suspended&limit=100"),
    rest("products?select=id,user_id,name,description,image_urls,status,is_hidden,is_deleted&order=created_at.desc&limit=100"),
  ]);
  const live = (products || []).filter(
    (row) => row.status === "published" && !row.is_hidden && !row.is_deleted && (row.image_urls || []).length,
  );

  if (kind === "shop") {
    const piece = live.find((row) => matches(slugify(row.name, row.id), wanted) || matches(row.id, wanted));
    if (!piece) {
      return {
        title: "Drapé Collective",
        description: "Original clothes from Kampala designers.",
        url: `${SITE}/shop`,
        image: FALLBACK_IMAGE,
      };
    }
    const house = (profiles || []).find((p) => p.id === piece.user_id || p.user_id === piece.user_id);
    const houseName = house?.brand_name?.trim() || house?.username?.trim() || "Kampala atelier";
    return {
      title: `${piece.name} — ${houseName}`,
      description: (piece.description || `Listed by ${houseName} on Drapé Collective.`).slice(0, 180),
      url: `${SITE}/shop/${slugify(piece.name, piece.id)}`,
      image: piece.image_urls[0] || FALLBACK_IMAGE,
    };
  }

  const profile = (profiles || []).find(
    (p) =>
      !p.is_suspended &&
      (matches(p.id, wanted) ||
        matches(p.user_id, wanted) ||
        matches(slugify(p.brand_name || p.username || "atelier", p.id), wanted) ||
        matches(String(p.brand_name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-"), wanted)),
  );
  if (!profile) {
    return {
      title: "Drapé Collective",
      description: "Original clothes from Kampala designers.",
      url: `${SITE}/ateliers`,
      image: FALLBACK_IMAGE,
    };
  }
  const name = profile.brand_name?.trim() || profile.username?.trim() || "Independent designer";
  const owned = live.filter((row) => row.user_id === profile.id || row.user_id === profile.user_id);
  const image = owned[0]?.image_urls?.[0] || profile.profile_photo_url || FALLBACK_IMAGE;
  const slugOut = slugify(name === "Independent designer" ? `atelier-${profile.id.slice(0, 6)}` : name, profile.id);
  return {
    title: `${name} — Drapé Collective`,
    description: (profile.bio || `${name} on Drapé Collective. Open the showroom.`).slice(0, 180),
    url: `${SITE}/s/${slugOut}`,
    image,
  };
}

export default async function handler(req, res) {
  const url = new URL(req.url || "/", SITE);
  const kind = url.searchParams.get("kind") === "shop" ? "shop" : "s";
  const slug = url.searchParams.get("slug") || "";
  const card = await resolveShare(kind, slug);
  const html = cardHtml(card);
  if (res && typeof res.end === "function") {
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.end(html);
    return;
  }
  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300" },
  });
}
