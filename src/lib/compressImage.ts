/**
 * Client-side image compressor for the product upload pipeline.
 *
 * Strategy:
 *  1. Decode the image in an off-screen <canvas>.
 *  2. Downscale the largest edge to 1440 px (maintaining aspect ratio).
 *  3. Encode as WebP (fallback to JPEG) at quality 0.85.
 *  4. If the result still exceeds the 800 KB budget, iteratively
 *     reduce quality in steps until it fits.
 *  5. Return the optimised binary as a File (same name, new body).
 *
 * All work happens in the browser — zero server round-trips.
 */

/* ─── Constants ─────────────────────────────────────────── */

/** Longest edge will be capped at this value (luxury fashion resolution). */
const MAX_DIMENSION = 1440;

/** Starting encode quality (0 – 1). */
const INITIAL_QUALITY = 0.85;

/** Hard target — we try to get under this. */
const TARGET_MAX_SIZE = 800 * 1024; // 800 KB

/** Lower bound: never encode below this quality (avoids visibly degraded images). */
const MIN_QUALITY = 0.4;

/* ─── Public types ──────────────────────────────────────── */

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  originalWidth: number;
  originalHeight: number;
  outputWidth: number;
  outputHeight: number;
  qualityUsed: number;
  mimeType: string;
}

/* ─── Helpers ───────────────────────────────────────────── */

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
      reject(new Error('Failed to decode image for compression.'));
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob returned null.'));
      },
      type,
      quality,
    );
  });
}

/**
 * Negotiate the best output MIME type.
 * WebP yields significantly smaller files than JPEG at equivalent quality.
 * Falls back to JPEG when WebP is unavailable.
 */
function negotiateOutputMime(): string {
  const canvas = document.createElement('canvas');
  const webpSupported = canvas.toDataURL('image/webp').startsWith('data:image/webp');
  return webpSupported ? 'image/webp' : 'image/jpeg';
}

/* ─── Core compressor ───────────────────────────────────── */

/**
 * Compress (downscale + re-encode) a single image File.
 *
 * @param file  - The raw file from the user's file picker.
 * @returns     - A CompressionResult containing the optimised File + metadata.
 */
export async function compressImage(file: File): Promise<CompressionResult> {
  const originalSize = file.size;
  const mimeType = negotiateOutputMime();

  // 1. Decode
  const img = await blobToImage(file);
  const originalWidth = img.naturalWidth;
  const originalHeight = img.naturalHeight;

  // 2. Compute output dimensions (cap longest edge at MAX_DIMENSION)
  let outputWidth: number;
  let outputHeight: number;

  if (originalWidth > originalHeight) {
    // Landscape
    outputWidth = Math.min(originalWidth, MAX_DIMENSION);
    outputHeight = Math.round(outputWidth * (originalHeight / originalWidth));
  } else {
    // Portrait or square
    outputHeight = Math.min(originalHeight, MAX_DIMENSION);
    outputWidth = Math.round(outputHeight * (originalWidth / originalHeight));
  }

  // Enforce even dimensions (required by many encoders)
  if (outputWidth % 2 !== 0) outputWidth--;
  if (outputHeight % 2 !== 0) outputHeight--;

  // 3. Draw onto a canvas at the target size
  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, outputWidth, outputHeight);

  // 4. Encode — start at INITIAL_QUALITY, step down until ≤ TARGET_MAX_SIZE
  let quality = INITIAL_QUALITY;
  let blob = await canvasToBlob(canvas, mimeType, quality);

  // Iterative quality reduction (only if the initial encode is too large)
  while (blob.size > TARGET_MAX_SIZE && quality > MIN_QUALITY) {
    quality = Math.max(MIN_QUALITY, Math.round((quality - 0.1) * 100) / 100);
    blob = await canvasToBlob(canvas, mimeType, quality);
  }

  // 5. Wrap the compressed blob back into a File (preserves filename + modified date)
  const compressedFile = new File([blob], file.name, {
    type: mimeType,
    lastModified: file.lastModified,
  });

  return {
    file: compressedFile,
    originalSize,
    compressedSize: blob.size,
    originalWidth,
    originalHeight,
    outputWidth,
    outputHeight,
    qualityUsed: quality,
    mimeType,
  };
}