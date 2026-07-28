export function cn(...inputs: (string | boolean | undefined | null)[]): string {
  return inputs.filter(Boolean).join(' ');
}

export function formatPrice(price: number | null | undefined): string {
  if (price == null) return 'Price on request';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength).trimEnd() + '…';
}

export function generateSessionId(): string {
  return crypto.randomUUID();
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getImageUrl(url: string | null | undefined, fallback?: string): string {
  if (!url) return fallback || '/placeholder.svg';
  return url;
}

// ─── Image Optimisation ───────────────────────────────────────

export interface ImageOptions {
  /** Target width in px (default: 800 for desktop, 500 for mobile) */
  width?: number;
  /** Quality 1–100 (default: 75) */
  quality?: number;
  /** Output format (default: webp) */
  format?: 'webp' | 'jpeg' | 'png';
}

/** Detect if a URL is an Unsplash image */
function isUnsplash(url: string): boolean {
  return /images\.unsplash\.com/.test(url);
}

/**
 * Append or replace image optimisation parameters on a URL.
 * Returns the original URL unchanged for non-supported image hosts.
 */
export function optimizeImageUrl(
  url: string,
  options: ImageOptions = {},
): string {
  if (!url || !isUnsplash(url)) return url;

  const width = options.width ?? 800;
  const quality = options.quality ?? 75;
  const format = options.format ?? 'webp';

  // Strip any existing query string to rebuild cleanly
  const base = url.split('?')[0];

  const params = new URLSearchParams();
  params.set('w', String(width));
  params.set('q', String(quality));
  params.set('fm', format);
  params.set('auto', 'format');
  params.set('fit', 'crop');

  return `${base}?${params.toString()}`;
}

/**
 * Shortcut for mobile-optimised Unsplash URLs (smaller, lower quality).
 */
export function optimizeImageUrlMobile(
  url: string,
  options: ImageOptions = {},
): string {
  return optimizeImageUrl(url, {
    width: options.width ?? 500,
    quality: options.quality ?? 70,
    format: options.format ?? 'webp',
  });
}

// ─── Time Formatting ───────────────────────────────────────────

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
});

const weekdayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
});

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
});

const fullDateFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

/**
 * Format a date string into a human-readable relative timestamp.
 *
 * - Today: "2:30 PM"
 * - Yesterday: "Yesterday"
 * - This week: "Mon", "Tue", etc.
 * - Older: "Jan 5"
 */
export function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return timeFormatter.format(date);
  }
  if (days === 1) return 'Yesterday';
  if (days < 7) return weekdayFormatter.format(date);
  return dateFormatter.format(date);
}

/**
 * Format a date string into a full, human-readable date.
 * Example: "January 5, 2024"
 */
export function formatFullDate(dateStr: string): string {
  return fullDateFormatter.format(new Date(dateStr));
}