const HOUSE = {
  accountId: "558dca581274b42590d6dfd88a9a1e24",
  bucket: "odrapecollective",
};
const SUPABASE_URL = "https://fpvbhlbqojxrgnvxpcng.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwdmJobGJxb2p4cmdudnhwY25nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2ODk4ODYsImV4cCI6MjA5NjI2NTg4Nn0.MHQq6Sq3xLyLxE3ZqcNW9_5k4knMKB4fp7vH7Ja-Ees";
const BUCKETS = ["products", "product-images", "images", "avatars"];

export const config = { maxDuration: 30 };

function env(names) {
  for (const name of names) {
    const raw = process.env[name];
    if (typeof raw === "string" && raw.trim()) {
      return raw.trim().replace(/^['"]|['"]$/g, "").replace(/\/$/, "");
    }
  }
  return "";
}

function r2Config() {
  const accountId = env(["R2_ACCOUNT_ID", "CLOUDFLARE_ACCOUNT_ID"]) || HOUSE.accountId;
  const accessKeyId = env(["R2_ACCESS_KEY_ID", "CLOUDFLARE_R2_ACCESS_KEY_ID", "AWS_ACCESS_KEY_ID"]);
  const secretAccessKey = env([
    "R2_SECRET_ACCESS_KEY",
    "R2_SECRET_KEY",
    "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
    "AWS_SECRET_ACCESS_KEY",
  ]);
  const bucket = env(["R2_BUCKET", "R2_BUCKET_NAME"]) || HOUSE.bucket;
  const publicBase = env(["R2_PUBLIC_BASE", "R2_PUBLIC_URL", "R2_PUBLIC_DOMAIN", "VITE_R2_PUBLIC_BASE"]);
  if (
    !accountId ||
    !accessKeyId ||
    !secretAccessKey ||
    !bucket ||
    !publicBase ||
    publicBase.includes(".r2.cloudflarestorage.com")
  ) {
    return null;
  }
  return { accountId, accessKeyId, secretAccessKey, bucket, publicBase };
}

function send(res, status, payload) {
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(body);
}

function bearer(req) {
  const header = String((req.headers && (req.headers.authorization || req.headers.Authorization)) || "");
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function readBody(req) {
  if (req.body && typeof req.body === "object") return Promise.resolve(req.body);
  if (typeof req.body === "string" && req.body.trim()) {
    try {
      return Promise.resolve(JSON.parse(req.body));
    } catch {
      return Promise.reject(new Error("The photograph could not be read."));
    }
  }
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function bytesFromDataUrl(data) {
  const raw = data && data.includes(",") ? data.split(",")[1] : data;
  if (!raw) return Buffer.alloc(0);
  return Buffer.from(raw, "base64");
}

async function who(token) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;
  const user = await response.json();
  return user.id || null;
}

async function putR2(bytes, mime, filename, userId) {
  const cfg = r2Config();
  if (!cfg) return null;
  const { AwsClient } = await import("aws4fetch");
  const safe = String(filename || "piece.webp")
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .slice(0, 80);
  const key = `pieces/${userId}/${Date.now()}-${safe || "piece.webp"}`;
  const aws = new AwsClient({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    service: "s3",
    region: "auto",
  });
  const endpoint = `https://${cfg.accountId}.r2.cloudflarestorage.com/${cfg.bucket}/${key}`;
  const response = await aws.fetch(endpoint, {
    method: "PUT",
    headers: {
      "Content-Type": mime,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
    body: bytes,
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`R2 rejected the upload (${response.status}). ${text.slice(0, 160)}`);
  }
  return `${cfg.publicBase}/${key}`;
}

async function putSupabase(token, userId, mime, bytes) {
  const ext = mime === "image/jpeg" ? "jpg" : "webp";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  let last = "";
  for (const bucket of BUCKETS) {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
        "Content-Type": mime,
        "x-upsert": "true",
      },
      body: bytes,
    });
    if (res.ok) return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
    last = await res.text().catch(() => "");
  }
  throw new Error(last.slice(0, 160) || "The house could not store that photograph.");
}

function r2KeyFromUrl(url, userId) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/^\//, "");
    const prefix = `pieces/${userId}/`;
    if (!path.startsWith(prefix)) return null;
    if (parsed.hostname.endsWith(".r2.dev") || parsed.hostname.includes("r2.cloudflarestorage.com")) return path;
    const publicBase = env(["R2_PUBLIC_BASE", "R2_PUBLIC_URL", "R2_PUBLIC_DOMAIN", "VITE_R2_PUBLIC_BASE"]);
    if (publicBase && url.startsWith(publicBase)) return path;
    return null;
  } catch {
    return null;
  }
}

function supabaseObjectFromUrl(url, userId) {
  const match = String(url).match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (!match) return null;
  const bucket = match[1];
  const path = decodeURIComponent(match[2]);
  if (!path.includes(userId)) return null;
  return { bucket, path };
}

async function deleteR2Key(key) {
  const cfg = r2Config();
  if (!cfg) return false;
  const { AwsClient } = await import("aws4fetch");
  const aws = new AwsClient({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    service: "s3",
    region: "auto",
  });
  const endpoint = `https://${cfg.accountId}.r2.cloudflarestorage.com/${cfg.bucket}/${key}`;
  const response = await aws.fetch(endpoint, { method: "DELETE" });
  return response.ok || response.status === 404;
}

async function deleteSupabaseObject(token, object) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${object.bucket}/${object.path}`, {
    method: "DELETE",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
  });
  return res.ok || res.status === 404;
}

async function purgeUrls(urls, userId, token) {
  const removed = [];
  for (const url of urls) {
    const key = r2KeyFromUrl(url, userId);
    if (key) {
      try {
        if (await deleteR2Key(key)) removed.push(url);
      } catch {
        /* keep going */
      }
      continue;
    }
    const object = supabaseObjectFromUrl(url, userId);
    if (object) {
      try {
        if (await deleteSupabaseObject(token, object)) removed.push(url);
      } catch {
        /* keep going */
      }
    }
  }
  return removed;
}

export default async function handler(req, res) {
  try {
    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.setHeader("Access-Control-Allow-Methods", "POST, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.end();
      return;
    }
    if (req.method === "DELETE") {
      const token = bearer(req);
      if (!token) {
        send(res, 401, { error: "Sign in to remove a photograph." });
        return;
      }
      const userId = await who(token);
      if (!userId) {
        send(res, 401, { error: "Sign in again to remove a photograph." });
        return;
      }
      const body = await readBody(req);
      const urls = Array.isArray(body.urls) ? body.urls.map(String).filter(Boolean) : [];
      const removed = await purgeUrls(urls, userId, token);
      send(res, 200, { removed });
      return;
    }
    if (req.method !== "POST") {
      send(res, 405, { error: "Use POST or DELETE." });
      return;
    }
    const token = bearer(req);
    if (!token) {
      send(res, 401, { error: "Sign in to store a photograph." });
      return;
    }
    const userId = await who(token);
    if (!userId) {
      send(res, 401, { error: "Sign in again to store a photograph." });
      return;
    }
    const body = await readBody(req);
    const mime = body.mime === "image/jpeg" ? "image/jpeg" : "image/webp";
    const bytes = bytesFromDataUrl(body.data);
    if (!bytes.length) {
      send(res, 400, { error: "The photograph did not arrive." });
      return;
    }
    if (bytes.length > 1_200_000) {
      send(res, 413, { error: "That photo is still too large after compression." });
      return;
    }
    try {
      const url = await putR2(bytes, mime, body.filename || "piece.webp", userId);
      if (url) {
        send(res, 200, { url, backend: "r2" });
        return;
      }
    } catch {
      /* fall through to the house store */
    }
    const url = await putSupabase(token, userId, mime, bytes);
    send(res, 200, { url, backend: "supabase" });
  } catch (err) {
    send(res, 500, { error: err instanceof Error ? err.message : "Could not store that photograph." });
  }
}
