import type { IncomingMessage, ServerResponse } from "node:http";
import { r2Status, storeImage } from "../src/lib/r2";

const SUPABASE_URL = "https://fpvbhlbqojxrgnvxpcng.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwdmJobGJxb2p4cmdudnhwY25nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2ODk4ODYsImV4cCI6MjA5NjI2NTg4Nn0.MHQq6Sq3xLyLxE3ZqcNW9_5k4knMKB4fp7vH7Ja-Ees";

type Body = { filename?: string; mime?: string; data?: string };

function readJson(req: IncomingMessage): Promise<Body> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}") as Body);
      } catch {
        reject(new Error("That photograph could not be read."));
      }
    });
    req.on("error", reject);
  });
}

function send(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

async function who(token: string) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) return null;
  const user = (await response.json()) as { id?: string };
  return user.id ?? null;
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

  const status = r2Status();
  if (!status.r2) {
    send(res, 503, {
      error: "Cloudflare R2 is not connected on this preview. Add R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_PUBLIC_BASE.",
      missing: status.missing,
    });
    return;
  }

  const header = String(req.headers.authorization || "");
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
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
    const body = await readJson(req);
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
    const stored = await storeImage({
      filename: body.filename || "piece.webp",
      mime,
      bytes,
      folder: `pieces/${userId}`,
    });
    send(res, 200, stored);
  } catch (err) {
    send(res, 500, { error: err instanceof Error ? err.message : "Could not store that photograph." });
  }
}
