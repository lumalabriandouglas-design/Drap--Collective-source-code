import type { IncomingMessage, ServerResponse } from "node:http";
import { r2Status } from "./_r2";
import { bearer, readJson, send, who } from "./_http";

export const config = { runtime: "nodejs", maxDuration: 15 };

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") {
    send(res, 405, { error: "Use POST." });
    return;
  }
  const status = r2Status();
  send(res, status.r2 ? 200 : 503, {
    ready: status.r2,
    missing: status.missing,
    note: "The house now puts photographs through /api/photo so the browser never talks to the bucket.",
  });
  void bearer;
  void readJson;
  void who;
  void req;
}
