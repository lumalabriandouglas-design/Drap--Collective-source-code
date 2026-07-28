/**
 * Options for image URL optimization.
 */
export interface ImageOptions {
  width?: number;
  height?: number;
  quality?: number;
}

/**
 * Optimize an image URL for display.
 * Supports Unsplash and Supabase Storage URLs.
 * Pass `cacheKey` (e.g. the product's `updated_at` timestamp) to
 * append a `cb` param that forces the browser to re-fetch when the
 * underlying asset changes (e.g. after a soft-delete).
 */
export function optimizeImageUrl(url: string, options?: ImageOptions & { cacheKey?: string }): string {
  if (!url) return '';

  // Unsplash — use their dynamic resize API
  if (url.includes('unsplash.com')) {
    const separator = url.includes('?') ? '&' : '?';
    const w = options?.width ?? 800;
    const q = options?.quality ?? 80;
    const cb = options?.cacheKey ? `&cb=${encodeURIComponent(options.cacheKey)}` : '';
    return `${url}${separator}w=${w}&q=${q}&auto=format${cb}`;
  }

  // Supabase Storage — transform via ?width=&quality= params
  // (Supabase image transformation must be enabled on the project)
  if (url.includes('supabase.co/storage')) {
    const separator = url.includes('?') ? '&' : '?';
    const w = options?.width ?? 800;
    const q = options?.quality ?? 80;
    const cb = options?.cacheKey ? `&cb=${encodeURIComponent(options.cacheKey)}` : '';
    return `${url}${separator}width=${w}&quality=${q}${cb}`;
  }

  return url;
}

/**
 * Optimize an image URL for mobile display (narrower, lighter).
 */
export function optimizeImageUrlMobile(url: string, options?: { cacheKey?: string }): string {
  if (!url) return '';

  if (url.includes('unsplash.com')) {
    const separator = url.includes('?') ? '&' : '?';
    const cb = options?.cacheKey ? `&cb=${encodeURIComponent(options.cacheKey)}` : '';
    return `${url}${separator}w=480&q=75&auto=format${cb}`;
  }

  if (url.includes('supabase.co/storage')) {
    const separator = url.includes('?') ? '&' : '?';
    const cb = options?.cacheKey ? `&cb=${encodeURIComponent(options.cacheKey)}` : '';
    return `${url}${separator}width=480&quality=75${cb}`;
  }

  return url;
}

/**
 * Returns a tiny thumbnail URL for lazy-loading placeholders.
 * ~50px wide — fast to load, blurred in via CSS.
 */
export function optimizeImageThumb(url: string): string {
  if (!url) return '';

  if (url.includes('unsplash.com')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}w=50&q=30&auto=format`;
  }

  if (url.includes('supabase.co/storage')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}width=50&quality=20`;
  }

  return url;
}
