/**
 * Client-side video file validation utilities.
 * Checks resolution, file size, and format before upload.
 */
import { MAX_RAW_FILE_SIZE } from './compressVideo';

const MAX_RESOLUTION = 1080; // 1080p max height
const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

export interface VideoValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
  resolution?: { width: number; height: number };
  fileSize?: number;
}

/**
 * Quick file-type and size check before loading metadata.
 * Allows large raw files since they will be compressed client-side.
 */
export function validateVideoBasics(file: File): VideoValidationResult {
  // Check MIME type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Unsupported format. Please use MP4, MOV, or WebM.',
    };
  }

  // Check raw file size (500 MB max — we compress client-side)
  if (file.size > MAX_RAW_FILE_SIZE) {
    return {
      valid: false,
      error: `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum is 500 MB.`,
      fileSize: file.size,
    };
  }

  return { valid: true, fileSize: file.size };
}

/**
 * Load video metadata to check resolution.
 * This reads just the file header (not the whole file) via a <video> element.
 */
export function checkVideoResolution(
  file: File,
): Promise<VideoValidationResult> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';

    // Set a timeout in case metadata can't be read
    const timeout = setTimeout(() => {
      URL.revokeObjectURL(url);
      resolve({
        valid: true, // Proceed even if we can't read metadata
        warning: 'Could not verify video resolution — proceeding with upload.',
      });
    }, 5000);

    video.onloadedmetadata = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);

      const width = video.videoWidth;
      const height = video.videoHeight;

      if (height > MAX_RESOLUTION || width > MAX_RESOLUTION * (16 / 9)) {
        resolve({
          valid: true,
          warning: `Video resolution (${width}×${height}) exceeds 1080p. It will be downscaled automatically during compression.`,
          resolution: { width, height },
        });
        return;
      }

      resolve({
        valid: true,
        resolution: { width, height },
      });
    };

    video.onerror = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      resolve({
        valid: true, // Proceed even on error
        warning: 'Could not read video metadata — proceeding with upload.',
      });
    };

    video.src = url;
  });
}
