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
  const status = r2Status();
  send(res, 200, { ...status, preview: !status.r2 });
}
