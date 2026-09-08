import { r2Status } from "./_r2";
import { json, pipe } from "./_http";

export const config = { runtime: "nodejs", maxDuration: 15 };

function body() {
  const status = r2Status();
  return {
    ready: status.r2,
    missing: status.missing,
    note: "The house now puts photographs through /api/photo so the browser never talks to the bucket.",
  };
}

export function GET() {
  const status = r2Status();
  return json(body(), status.r2 ? 200 : 503);
}

export function POST() {
  return GET();
}

export default async function handler(
  req: Request,
  res?: { statusCode: number; setHeader: (k: string, v: string) => void; end: (body: string) => void },
) {
  return pipe(req, res, GET());
}
