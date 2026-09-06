import { putR2Object, r2Status } from "./_r2";
import { bearer, readJson, send, who } from "./_http";
import type { IncomingMessage, ServerResponse } from "node:http";

const SUPABASE_URL = "https://fpvbhlbqojxrgnvxpcng.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwdmJobGJxb2p4cmdudnhwY25nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2ODk4ODYsImV4cCI6MjA5NjI2NTg4Nn0.MHQq6Sq3xLyLxE3ZqcNW9_5k4knMKB4fp7vH7Ja-Ees";

export const config = { runtime: "nodejs", maxDuration: 30 };

type Body = { filename?: string; mime?: string; data?: string };

const BUCKETS = ["products", "product-images", "images", "avatars"];

async function putSupabase(input: {
  token: string;
  userId: string;
  mime: string;
  bytes: Buffer;
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
      body: new Uint8Array(input.bytes),
    });
    if (res.ok) {
      return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
    }
    last = await res.text().catch(() => "");
  }
  throw new Error(last.slice(0, 160) || "The house could not store that photograph.");
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== "POST") {
    send(res, 405, { error: "Use POST." });
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

  try {
    const body = await readJson<Body>(req);
    const mime = body.mime === "image/jpeg" ? "image/jpeg" : "image/webp";
    const raw = body.data?.includes(",") ? body.data.split(",")[1] : body.data;
    if (!raw) {
      send(res, 400, { error: "The photograph did not arrive." });
      return;
    }
    const bytes = Buffer.from(raw, "base64");
    if (!bytes.length) {
      send(res, 400, { error: "The photograph did not arrive." });
      return;
    }
    if (bytes.length > 1_200_000) {
      send(res, 413, { error: "That photo is still too large after compression." });
      return;
    }

    const status = r2Status();
    if (status.r2) {
      try {
        const url = await putR2Object({
          filename: body.filename || "piece.webp",
          mime,
          bytes: new Uint8Array(bytes),
          folder: `pieces/${userId}`,
        });
        if (url) {
          send(res, 200, { url, backend: "r2" });
          return;
        }
      } catch {
        /* fall through to the house store */
      }
    }

    const url = await putSupabase({ token, userId, mime, bytes });
    send(res, 200, { url, backend: "supabase" });
  } catch (err) {
    send(res, 500, { error: err instanceof Error ? err.message : "Could not store that photograph." });
  }
}
