import { AwsClient } from "aws4fetch";

const HOUSE = {
  accountId: "558dca581274b42590d6dfd88a9a1e24",
  bucket: "odrapecollective",
};
const SUPABASE_URL = "https://fpvbhlbqojxrgnvxpcng.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwdmJobGJxb2p4cmdudnhwY25nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2ODk4ODYsImV4cCI6MjA5NjI2NTg4Nn0.MHQq6Sq3xLyLxE3ZqcNW9_5k4knMKB4fp7vH7Ja-Ees";
const BUCKETS = ["products", "product-images", "images", "avatars"];

function env(names) {
  for (const name of names) {
    const raw = process.env[name];
    if (typeof raw === "string" && raw.trim()) return raw.trim().replace(/^['"]|['"]$/g, "").replace(/\/$/, "");
  }
  return "";
}

function r2Config() {
  const accountId = env(["R2_ACCOUNT_ID", "CLOUDFLARE_ACCOUNT_ID"]) || HOUSE.accountId;
  const accessKeyId = env(["R2_ACCESS_KEY_ID", "CLOUDFLARE_R2_ACCESS_KEY_ID", "AWS_ACCESS_KEY_ID"]);
  const secretAccessKey = env(["R2_SECRET_ACCESS_KEY", "R2_SECRET_KEY", "CLOUDFLARE_R2_SECRET_ACCESS_KEY", "AWS_SECRET_ACCESS_KEY"]);
  const bucket = env(["R2_BUCKET", "R2_BUCKET_NAME"]) || HOUSE.bucket;
  const publicBase = env(["R2_PUBLIC_BASE", "R2_PUBLIC_URL", "R2_PUBLIC_DOMAIN", "VITE_R2_PUBLIC_BASE"]);
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBase || publicBase.includes(".r2.cloudflarestorage.com")) {
    return null;
  }
  return { accountId, accessKeyId, secretAccessKey, bucket, publicBase };
}

function send(res, status, payload) {
  const body = JSON.stringify(payload);
  if (res && typeof res.end === "function") {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    res.end(body);
    return;
  }
  return new Response(body, {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function bearer(req) {
  const header =
    (req.headers && (req.headers.authorization || req.headers.Authorization)) ||
    (typeof req.headers?.get === "function" ? req.headers.get("authorization") : "") ||
    "";
  return String(header).startsWith("Bearer ") ? String(header).slice(7) : "";
}

async function readBody(req) {
  if (typeof req.json === "function") return req.json();
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body.trim()) return JSON.parse(req.body);
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  return JSON.parse(text || "{}");
}

function bytesFromDataUrl(data) {
  const raw = data?.includes(",") ? data.split(",")[1] : data;
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
  const key = `pieces/${userId}/${Date.now()}-${String(filename || "piece.webp")
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .slice(0, 80)}`;
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

export default async function handler(req, res) {
  try {
    if (req.method === "OPTIONS") {
      if (res && typeof res.end === "function") {
        res.statusCode = 204;
        res.end();
        return;
      }
      return new Response(null, { status: 204 });
    }
    if (req.method !== "POST") return send(res, 405, { error: "Use POST." });
    const token = bearer(req);
    if (!token) return send(res, 401, { error: "Sign in to store a photograph." });
    const userId = await who(token);
    if (!userId) return send(res, 401, { error: "Sign in again to store a photograph." });
    const body = await readBody(req);
    const mime = body.mime === "image/jpeg" ? "image/jpeg" : "image/webp";
    const bytes = bytesFromDataUrl(body.data);
    if (!bytes.length) return send(res, 400, { error: "The photograph did not arrive." });
    if (bytes.length > 1_200_000) return send(res, 413, { error: "That photo is still too large after compression." });
    try {
      const url = await putR2(bytes, mime, body.filename || "piece.webp", userId);
      if (url) return send(res, 200, { url, backend: "r2" });
    } catch {
      /* fall through */
    }
    const url = await putSupabase(token, userId, mime, bytes);
    return send(res, 200, { url, backend: "supabase" });
  } catch (err) {
    return send(res, 500, { error: err instanceof Error ? err.message : "Could not store that photograph." });
  }
}
