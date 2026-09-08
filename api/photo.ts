import { putR2Object, r2Status } from "./_r2";
import { bearerFrom, json, pipe, who } from "./_http";

const SUPABASE_URL = "https://fpvbhlbqojxrgnvxpcng.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwdmJobGJxb2p4cmdudnhwY25nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2ODk4ODYsImV4cCI6MjA5NjI2NTg4Nn0.MHQq6Sq3xLyLxE3ZqcNW9_5k4knMKB4fp7vH7Ja-Ees";

export const config = { runtime: "nodejs", maxDuration: 30 };

type Body = { filename?: string; mime?: string; data?: string };

const BUCKETS = ["products", "product-images", "images", "avatars"];

function bytesFromDataUrl(data?: string) {
  const raw = data?.includes(",") ? data.split(",")[1] : data;
  if (!raw) return new Uint8Array();
  const bin = atob(raw);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

async function putSupabase(input: {
  token: string;
  userId: string;
  mime: string;
  bytes: Uint8Array;
}) {
  const ext = input.mime === "image/jpeg" ? "jpg" : "webp";
  const path = `${input.userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  let last = "";
  for (const bucket of BUCKETS) {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${input.token}`,
        "Content-Type": input.mime,
        "x-upsert": "true",
      },
      body: input.bytes,
    });
    if (res.ok) {
      return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
    }
    last = await res.text().catch(() => "");
  }
  throw new Error(last.slice(0, 160) || "The house could not store that photograph.");
}

async function handle(request: Request) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }
  if (request.method !== "POST") return json({ error: "Use POST." }, 405);

  const token = bearerFrom(request);
  if (!token) return json({ error: "Sign in to store a photograph." }, 401);
  const userId = await who(token);
  if (!userId) return json({ error: "Sign in again to store a photograph." }, 401);

  try {
    const body = (await request.json()) as Body;
    const mime = body.mime === "image/jpeg" ? "image/jpeg" : "image/webp";
    const bytes = bytesFromDataUrl(body.data);
    if (!bytes.length) return json({ error: "The photograph did not arrive." }, 400);
    if (bytes.length > 1_200_000) {
      return json({ error: "That photo is still too large after compression." }, 413);
    }

    const status = r2Status();
    if (status.r2) {
      try {
        const url = await putR2Object({
          filename: body.filename || "piece.webp",
          mime,
          bytes,
          folder: `pieces/${userId}`,
        });
        if (url) return json({ url, backend: "r2" });
      } catch {
        /* fall through to the house store */
      }
    }

    const url = await putSupabase({ token, userId, mime, bytes });
    return json({ url, backend: "supabase" });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Could not store that photograph." }, 500);
  }
}

export function OPTIONS(request: Request) {
  return handle(request);
}

export function POST(request: Request) {
  return handle(request);
}

export default async function handler(
  req: Request,
  res?: { statusCode: number; setHeader: (k: string, v: string) => void; end: (body: string) => void },
) {
  return pipe(req, res, await handle(req));
}
