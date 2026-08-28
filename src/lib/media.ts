export type ImageWidth = 480 | 900 | 1440 | 1800;

export type CompressionResult = {
  file: File;
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
  quality: number;
  mimeType: string;
};

const MAX_EDGE = 1440;
const TARGET_BYTES = 800 * 1024;
const MIN_QUALITY = 0.55;
const START_QUALITY = 0.88;

function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image."));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Encode failed."))), type, quality);
  });
}

function outputMime(): string {
  const canvas = document.createElement("canvas");
  return canvas.toDataURL("image/webp").startsWith("data:image/webp") ? "image/webp" : "image/jpeg";
}

/** Shrink the file for storage. Display still uses the 1440px master, so it looks sharp. */
export async function compressImage(
  file: File,
  opts?: { maxBytes?: number; maxEdge?: number },
): Promise<CompressionResult> {
  const originalSize = file.size;
  const mimeType = outputMime();
  const img = await blobToImage(file);
  const originalWidth = img.naturalWidth || img.width;
  const originalHeight = img.naturalHeight || img.height;
  const maxEdge = opts?.maxEdge ?? MAX_EDGE;
  const targetBytes = opts?.maxBytes ?? TARGET_BYTES;

  let width = originalWidth;
  let height = originalHeight;
  const long = Math.max(width, height);
  if (long > maxEdge) {
    const scale = maxEdge / long;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  if (width % 2) width -= 1;
  if (height % 2) height -= 1;

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(width, 2);
  canvas.height = Math.max(height, 2);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  let quality = START_QUALITY;
  let blob = await canvasToBlob(canvas, mimeType, quality);
  while (blob.size > targetBytes && quality > MIN_QUALITY) {
    quality = Math.max(MIN_QUALITY, Math.round((quality - 0.08) * 100) / 100);
    blob = await canvasToBlob(canvas, mimeType, quality);
  }

  const ext = mimeType === "image/webp" ? "webp" : "jpg";
  const base = file.name.replace(/\.[^.]+$/, "") || "piece";
  const compressed = new File([blob], `${base}.${ext}`, { type: mimeType, lastModified: Date.now() });
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read compressed image."));
    reader.readAsDataURL(blob);
  });

  return {
    file: compressed,
    dataUrl,
    originalSize,
    compressedSize: blob.size,
    width: canvas.width,
    height: canvas.height,
    quality,
    mimeType,
  };
}

function withQuery(url: string, params: Record<string, string>) {
  const joiner = url.includes("?") ? "&" : "?";
  const qs = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  return `${url}${joiner}${qs}`;
}

/**
 * Display URL: request a sharp render from the origin.
 * Stored files are already compressed; this asks the CDN to serve the right width
 * so the picture still looks like the original on a retina screen.
 */
export function displayImage(url: string, width: ImageWidth = 900, quality = 82): string {
  if (!url || url.startsWith("data:") || url.startsWith("blob:")) return url;

  if (url.includes("supabase.co/storage/v1/object/public/")) {
    const rendered = url.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/");
    return withQuery(rendered, {
      width: String(width),
      quality: String(quality),
      resize: "contain",
    });
  }

  if (url.includes("supabase.co/storage")) {
    return withQuery(url, { width: String(width), quality: String(quality) });
  }

  const r2Base = typeof window === "undefined" ? process.env.R2_PUBLIC_BASE : "";
  if (r2Base && url.startsWith(r2Base)) {
    return withQuery(url, { w: String(width), q: String(quality) });
  }

  return url;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
