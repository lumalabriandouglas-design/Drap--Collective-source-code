import { r2Status } from "./_r2";
import { json, pipe } from "./_http";

export const config = { runtime: "nodejs" };

function payload() {
  try {
    const status = r2Status();
    return { ...status, preview: !status.r2 };
  } catch (err) {
    return {
      r2: false,
      account: true,
      bucket: true,
      keys: false,
      publicUrl: false,
      preview: true,
      missing: ["R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_PUBLIC_BASE"],
      error: err instanceof Error ? err.message : "status-failed",
    };
  }
}

export function GET() {
  return json(payload());
}

export default async function handler(
  _req: Request,
  res?: { statusCode: number; setHeader: (k: string, v: string) => void; end: (body: string) => void },
) {
  return pipe(_req, res, GET());
}
