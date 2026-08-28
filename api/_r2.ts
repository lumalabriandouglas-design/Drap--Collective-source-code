import { AwsClient } from "aws4fetch";

const HOUSE = {
  accountId: "558dca581274b42590d6dfd88a9e24".replace("9e24", "1e24"),
  bucket: "odrapecollective",
};

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBase: string;
};

function pick(names: string[]) {
  for (const name of names) {
    const raw = process.env[name];
    if (typeof raw !== "string") continue;
    const value = raw.trim().replace(/^[\'"]|[\'"]$/g, "").replace(/\/$/, "");
    if (value) return value;
  }
  return "";
}

function publicBase() {
  const raw = pick(["R2_PUBLIC_BASE", "R2_PUBLIC_URL", "R2_PUBLIC_DOMAIN", "VITE_R2_PUBLIC_BASE"]);
  if (!raw || raw.includes(".r2.cloudflarestorage.com")) return "";
  return raw;
}

export function readR2(): R2Config | null {
  const accountId = pick(["R2_ACCOUNT_ID", "CLOUDFLARE_ACCOUNT_ID"]) || HOUSE.accountId;
  const accessKeyId = pick(["R2_ACCESS_KEY_ID", "CLOUDFLARE_R2_ACCESS_KEY_ID", "AWS_ACCESS_KEY_ID"]);
  const secretAccessKey = pick([
    "R2_SECRET_ACCESS_KEY",
    "R2_SECRET_KEY",
    "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
    "AWS_SECRET_ACCESS_KEY",
  ]);
  const bucket = pick(["R2_BUCKET", "R2_BUCKET_NAME"]) || HOUSE.bucket;
  const base = publicBase();
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !base) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket, publicBase: base };
}

export function r2Status() {
  const keys = Boolean(
    pick(["R2_ACCESS_KEY_ID", "CLOUDFLARE_R2_ACCESS_KEY_ID", "AWS_ACCESS_KEY_ID"]) &&
      pick(["R2_SECRET_ACCESS_KEY", "R2_SECRET_KEY", "CLOUDFLARE_R2_SECRET_ACCESS_KEY", "AWS_SECRET_ACCESS_KEY"]),
  );
  const publicUrl = Boolean(publicBase());
  const missing: string[] = [];
  if (!keys) {
    missing.push("R2_ACCESS_KEY_ID");
    missing.push("R2_SECRET_ACCESS_KEY");
  }
  if (!publicUrl) missing.push("R2_PUBLIC_BASE");
  return {
    r2: Boolean(readR2()),
    account: true,
    bucket: true,
    keys,
    publicUrl,
    missing,
  };
}

function client(cfg: R2Config) {
  return new AwsClient({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    service: "s3",
    region: "auto",
  });
}

function safeName(filename: string) {
  const base = filename.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "");
  return base.slice(0, 80) || "piece.webp";
}

export async function putR2Object(input: {
  filename: string;
  mime: string;
  bytes: Uint8Array;
  folder: string;
}) {
  const cfg = readR2();
  if (!cfg) return null;
  const mime = input.mime === "image/jpeg" ? "image/jpeg" : "image/webp";
  const key = `${input.folder}/${Date.now()}-${safeName(input.filename)}`;
  const endpoint = `https://${cfg.accountId}.r2.cloudflarestorage.com/${cfg.bucket}/${key}`;
  const response = await client(cfg).fetch(endpoint, {
    method: "PUT",
    headers: {
      "Content-Type": mime,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
    body: input.bytes,
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`R2 rejected the upload (${response.status}). ${text.slice(0, 160)}`);
  }
  return `${cfg.publicBase}/${key}`;
}
