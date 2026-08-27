import type { IncomingMessage, ServerResponse } from "node:http";
import { r2Status } from "../src/lib/r2";
import { preflight, send } from "./_http";

export const config = {
  runtime: "nodejs",
};

export default function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method === "OPTIONS") {
    preflight(res);
    return;
  }
  try {
    const status = r2Status();
    send(res, 200, { ...status, preview: !status.r2 });
  } catch {
    send(res, 200, {
      r2: false,
      account: false,
      bucket: false,
      keys: false,
      publicUrl: false,
      preview: true,
      missing: ["R2_PUBLIC_BASE"],
    });
  }
}
