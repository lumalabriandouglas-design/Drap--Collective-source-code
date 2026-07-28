/**
 * applyWatermark — Applies a premium, non-intrusive canvas watermark to an image.
 *
 * Styling (per spec):
 *  - Position: bottom-right corner, inset 24px from both edges
 *  - Font: dynamically scaled (base 14px) — tiny but legible relative to image size
 *  - Color: crisp white at 45% opacity (rgba(255,255,255,0.45))
 *  - Drop shadow: rgba(0,0,0,0.35), blur 4px — ensures legibility on light/white backgrounds
 *  - Text: "[Designer Name] | Drapé Collective" — single clean line
 *
 * @param imageBlob   - The source image as a Blob (e.g. from a File or canvas)
 * @param designerName - The designer's display name (brand_name or username)
 * @returns A Blob of the watermarked image (JPEG, quality 0.92)
 */

export async function applyWatermark(
  imageBlob: Blob,
  designerName: string,
): Promise<Blob> {
  // 1. Decode the original image
  const img = await blobToImage(imageBlob);

  // 2. Determine canvas dimensions (cap at 4096 to avoid OOM)
  const MAX_DIM = 4096;
  let width = img.naturalWidth;
  let height = img.naturalHeight;
  if (width > MAX_DIM || height > MAX_DIM) {
    const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  // 3. Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // 4. Draw the original image
  ctx.drawImage(img, 0, 0, width, height);

  // 5. Apply watermark
  const inset = 24; // px from bottom & right
  const text = `${designerName} | Drapé Collective`;

  // Dynamically scale font size: 14px base at 1200px width, scale linearly
  const fontSize = Math.max(11, Math.round(14 * (width / 1200)));
  ctx.font = `${fontSize}px Inter, "Helvetica Neue", Helvetica, Arial, sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';

  // Drop shadow (ensures legibility on light/white backgrounds)
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 4;

  // Fill colour — crisp white at low opacity so fabric texture peeks through
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';

  // Position: inset from bottom-right
  const x = width - inset;
  const y = height - inset;
  ctx.fillText(text, x, y);

  // 6. Export as JPEG (smaller footprint than PNG for photos)
  const blob = await canvasToBlob(canvas, 'image/jpeg', 0.92);
  return blob;
}

/* ─── Helpers ─── */

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
      reject(new Error('Failed to decode image'));
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
        else reject(new Error('Canvas toBlob returned null'));
      },
      type,
      quality,
    );
  });
}
