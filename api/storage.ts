import type { IncomingMessage, ServerResponse } from "node:http";
import { r2Status } from "../src/lib/r2";

export default function handler(_req: IncomingMessage, res: ServerResponse) {
  const status = r2Status();
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ ...status, preview: !status.r2 }));
}
