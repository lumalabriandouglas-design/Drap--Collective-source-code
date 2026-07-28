/**
 * Client-side video compressor using Canvas + MediaRecorder API.
 *
 * Strategy:
 *  1. Load the video into a hidden <video> element (muted autoplay).
 *  2. Draw each frame onto a Canvas resized to max 720p vertical.
 *  3. Capture the Canvas stream via MediaRecorder at a forced 2000 kbps.
 *  4. Collect the output chunks into a compressed Blob (WebM/MP4).
 *
 * This avoids any WASM/download overhead while reliably keeping
 * files under ~12–15 MB for typical 30–60s fashion reels.
 */

export interface CompressionResult {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  sourceWidth: number;
  sourceHeight: number;
  outputWidth: number;
  outputHeight: number;
  durationSec: number;
  mimeType: string;
}

export type ProgressCallback = (percent: number) => void;

/* ─── Tuning constants ─────────────────────────────────── */
/** Maximum output height — 720p vertical. */
const TARGET_HEIGHT = 720;

/** Forced max bitrate: 2000 kbps. */
const TARGET_BITRATE = 2_000_000; // 2 Mbps

/** Capture / record framerate. 30 fps is plenty for fashion close-ups. */
const TARGET_FPS = 30;

/** Raw files up to 500 MB will be accepted for compression. */
export const MAX_RAW_FILE_SIZE = 500 * 1024 * 1024; // 500 MB

/* ─── MIME-type negotiation ────────────────────────────── */

function getPreferredMimeType(): string {
  const candidates = [
    'video/mp4;codecs=h264,aac',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
  ];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return 'video/webm'; // last-resort fallback
}

/* ─── Core compressor ──────────────────────────────────── */

/**
 * Compress a video File in the browser.
 *
 * @param file      - The raw file selected by the user.
 * @param onProgress - Optional callback receiving 0–100 percent.
 * @returns          - A CompressionResult with the compressed blob + metadata.
 */
export function compressVideo(
  file: File,
  onProgress?: ProgressCallback,
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    const sourceUrl = URL.createObjectURL(file);

    // 1. Load video metadata
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = sourceUrl;

    let started = false;

    const cleanup = () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(sourceUrl);
    };

    video.onloadedmetadata = () => {
      if (started) return;
      started = true;

      const { videoWidth, videoHeight, duration } = video;
      if (!duration || !isFinite(duration) || duration <= 0) {
        cleanup();
        reject(new Error('Could not read video duration — file may be corrupt.'));
        return;
      }

      // 2. Compute output dimensions (max 720p, maintain aspect ratio)
      const isVertical = videoHeight >= videoWidth;
      let outputWidth: number;
      let outputHeight: number;

      if (isVertical) {
        outputHeight = Math.min(videoHeight, TARGET_HEIGHT);
        outputWidth = Math.round(outputHeight * (videoWidth / videoHeight));
      } else {
        // Landscape / square — still cap the larger dimension at 720
        const scale = Math.min(TARGET_HEIGHT / videoHeight, TARGET_HEIGHT / videoWidth);
        outputHeight = Math.round(videoHeight * scale);
        outputWidth = Math.round(videoWidth * scale);
      }

      // Enforce even dimensions (required by many encoders)
      if (outputWidth % 2 !== 0) outputWidth--;
      if (outputHeight % 2 !== 0) outputHeight--;

      // 3. Set up Canvas + stream
      const canvas = document.createElement('canvas');
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const ctx = canvas.getContext('2d')!;

      const mimeType = getPreferredMimeType();
      const stream = canvas.captureStream(TARGET_FPS);
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: TARGET_BITRATE,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      // 4. Play video & paint frames to canvas
      const playStart = performance.now();
      let lastPaintTime = 0;
      const frameInterval = 1000 / TARGET_FPS;

      // Help MediaRecorder collect its periodic samples
      recorder.start(1000);

      const paintLoop = (timestamp: number) => {
        const elapsed = timestamp - playStart;

        // Are we past the end?
        if (video.ended || elapsed >= duration * 1000 + 200) {
          recorder.stop();
          video.pause();
          // Final progress
          onProgress?.(100);
          return;
        }

        // Throttle canvas paints to TARGET_FPS
        if (elapsed - lastPaintTime >= frameInterval) {
          lastPaintTime = elapsed;
          ctx.drawImage(video, 0, 0, outputWidth, outputHeight);

          const pct = Math.min(Math.round((elapsed / (duration * 1000)) * 100), 99);
          onProgress?.(pct);
        }

        requestAnimationFrame(paintLoop);
      };

      recorder.onstop = () => {
        cleanup();
        const blob = new Blob(chunks, { type: mimeType });
        resolve({
          blob,
          originalSize: file.size,
          compressedSize: blob.size,
          sourceWidth: videoWidth,
          sourceHeight: videoHeight,
          outputWidth,
          outputHeight,
          durationSec: duration,
          mimeType,
        });
      };

      recorder.onerror = () => {
        cleanup();
        reject(new Error('MediaRecorder encountered an error during compression.'));
      };

      // 5. Kick off playback + painting
      video.play().catch((err) => {
        cleanup();
        reject(new Error(`Could not play video for compression: ${err.message}`));
      });

      requestAnimationFrame(paintLoop);
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('Failed to load video metadata — the file may be corrupt.'));
    };
  });
}

/**
 * Rough estimate of whether a compressed video will fit under a target size.
 * Useful for giving users a heads-up before starting compression.
 */
export function estimateCompressedSize(durationSec: number): number {
  // (bitrate in bits/sec) * duration / 8 = bytes
  return Math.round((TARGET_BITRATE * durationSec) / 8);
}
