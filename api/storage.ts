import { r2Status } from "./_r2";

export const config = { runtime: "nodejs" };

export default function handler(_req: unknown, res: {
  statusCode: number;
  setHeader: (k: string, v: string) => void;
  end: (body: string) => void;
}) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  try {
    const status = r2Status();
    res.end(JSON.stringify({ ...status, preview: !status.r2 }));
  } catch {
    res.end(
      JSON.stringify({
        r2: false,
        account: true,
        bucket: true,
        keys: false,
        publicUrl: false,
        preview: true,
        missing: ["R2_PUBLIC_BASE"],
      }),
    );
  }
}
