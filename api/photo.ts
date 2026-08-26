import type { IncomingMessage, ServerResponse } from "node:http";
import { r2Status, storeImage } from "../src/lib/r2";
import { bearer, preflight, readJson, send, who } from "./_http";

export const config = {
  runtime: "nodejs",
  maxDuration: 30,
  api: { bodyParser: true },
};

type Body = { filename?: string; mime?: string; data?: string };

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method === "OPTIONS") {
    preflight(res);
    return;
  }
  if (req.method !== "POST") {
    send(res, 405, { error: "Use POST." });
    return;
  }

  const status = r2Status();
  if (!status.r2) {
    send(res, 503, {
      error:
        "Cloudflare R2 is not connected on this preview. Add R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_PUBLIC_BASE.",
      missing: status.missing,
    });
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
