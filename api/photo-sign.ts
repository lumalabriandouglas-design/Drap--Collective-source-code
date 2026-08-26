import type { IncomingMessage, ServerResponse } from "node:http";
import { r2Status, signR2Put } from "../src/lib/r2";
import { bearer, preflight, readJson, send, who } from "./_http";

export const config = {
  runtime: "nodejs",
  maxDuration: 15,
  api: { bodyParser: true },
};

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
        "Cloudflare R2 is not connected. Add R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_PUBLIC_BASE on Vercel.",
      missing: status.missing,
    });
    return;
  }
  const token = bearer(req);
  const userId = token ? await who(token) : null;
  if (!userId) {
    send(res, 401, { error: "Sign in to store a photograph." });
    return;
  }
  try {
    const body = await readJson<{ filename?: string; mime?: string }>(req);
    const signed = await signR2Put({
      filename: body.filename || "piece.webp",
      mime: body.mime || "image/webp",
      folder: `pieces/${userId}`,
    });
    if (!signed) {
      send(res, 503, { error: "Cloudflare R2 is not connected." });
      return;
    }
    send(res, 200, signed);
  } catch (err) {
    send(res, 500, { error: err instanceof Error ? err.message : "Could not open Cloudflare storage." });
  }
}
