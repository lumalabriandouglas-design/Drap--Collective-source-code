import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { AwsClient } from "aws4fetch";

/** Public Cloudflare house — not secrets. Keys stay in env on publish. */
const HOUSE = {
  accountId: "558dca581274b42590d6dfd88a9a1e24",
  bucket: "odrapecollective",
};

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBase: string;
};

export type StoredImage = {
  url: string;
  backend: "r2" | "preview";
};

export type R2Status = {
  r2: boolean;
  account: boolean;
  bucket: boolean;
  keys: boolean;
  publicUrl: boolean;
  missing: string[];
};

function isApiEndpoint(url: string) {
  return url.includes(".r2.cloudflarestorage.com");
}

function publicBaseFromEnv() {
  const raw = (process.env.R2_PUBLIC_BASE || process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");
  if (!raw || isApiEndpoint(raw)) return "";
  return raw;
}

function readConfig(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || HOUSE.accountId;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";
  const bucket = process.env.R2_BUCKET || process.env.R2_BUCKET_NAME || HOUSE.bucket;
  const publicBase = publicBaseFromEnv();
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBase) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket, publicBase };
}

export function r2Status(): R2Status {
  const account = Boolean(process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || HOUSE.accountId);
  const bucket = Boolean(process.env.R2_BUCKET || process.env.R2_BUCKET_NAME || HOUSE.bucket);
  const keys = Boolean(process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY);
  const publicUrl = Boolean(publicBaseFromEnv());
  const missing: string[] = [];
  if (!keys) {
    missing.push("R2_ACCESS_KEY_ID");
    missing.push("R2_SECRET_ACCESS_KEY");
  }
  if (!publicUrl) missing.push("R2_PUBLIC_BASE");
  return {
    r2: Boolean(readConfig()),
    account,
    bucket,
    keys,
    publicUrl,
    missing,
  };
}

export function r2Ready() {
  return Boolean(readConfig());
}

function safeName(filename: string) {
  const base = filename.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "");
  return base.slice(0, 80) || "piece.webp";
}

function clientFor(cfg: R2Config) {
  return new AwsClient({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    service: "s3",
    region: "auto",
  });
}

async function putR2(cfg: R2Config, key: string, body: Buffer, mime: string) {
  const endpoint = `https://${cfg.accountId}.r2.cloudflarestorage.com/${cfg.bucket}/${key}`;
  const response = await clientFor(cfg).fetch(endpoint, {
    method: "PUT",
    headers: {
      "Content-Type": mime,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
    body: new Uint8Array(body),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Cloudflare storage rejected the upload (${response.status}). ${text.slice(0, 180)}`);
  }
  return `${cfg.publicBase}/${key}`;
}

async function putPreview(key: string, body: Buffer) {
  const filename = key.split("/").pop() || "piece.webp";
  const dir = join(process.cwd(), "public/images/uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, filename), body);
  return `/images/uploads/${filename}`;
}

export async function signR2Put(input: {
  filename: string;
  mime: string;
  folder: string;
}): Promise<{ uploadUrl: string; publicUrl: string; mime: string; key: string } | null> {
  const cfg = readConfig();
  if (!cfg) return null;
  const mime = input.mime === "image/jpeg" ? "image/jpeg" : "image/webp";
  const key = `${input.folder}/${Date.now()}-${safeName(input.filename)}`;
  const endpoint = `https://${cfg.accountId}.r2.cloudflarestorage.com/${cfg.bucket}/${key}`;
  const signed = await clientFor(cfg).sign(
    new Request(endpoint, {
      method: "PUT",
      headers: { "Content-Type": mime },
    }),
    { aws: { signQuery: true } },
  );
  return {
    uploadUrl: signed.url,
    publicUrl: `${cfg.publicBase}/${key}`,
    mime,
    key,
  };
}

export async function storeImage(input: {
  filename: string;
  mime: string;
  bytes: Buffer;
  folder: string;
}): Promise<StoredImage> {
  const mime = input.mime === "image/jpeg" ? "image/jpeg" : "image/webp";
  const key = `${input.folder}/${Date.now()}-${safeName(input.filename)}`;
  const cfg = readConfig();
  if (cfg) {
    const url = await putR2(cfg, key, input.bytes, mime);
    return { url, backend: "r2" };
  }
  try {
    const url = await putPreview(key, input.bytes);
    return { url, backend: "preview" };
  } catch {
    throw new Error("Photo storage is not connected. Add Cloudflare R2 on publish to keep pictures live.");
  }
}
