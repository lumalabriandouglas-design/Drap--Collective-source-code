/**
 * PWA Manifest & Service Worker Registration
 *
 * Generates the Web App Manifest as an in-memory Blob and appends it to
 * <head> via a <link rel="manifest"> element.  This works around the
 * inability to write static files to public/ and is supported on iOS 16.4+
 * as well as all modern Android browsers.
 *
 * The manifest JSON is also exported for introspection.
 *
 * Service Worker is registered from the src/sw.js source file using
 * a Blob URL approach — the raw source is imported at build time and
 * registered via navigator.serviceWorker.register().  This keeps the
 * push-notification service worker logic in a single JavaScript file
 * without requiring a build-plugin configuration change.
 *
 * All icons are generated as inline SVG data URIs using the brand
 * "Dé" typography — no physical asset files are required.
 */

/* ─────── Inline SVG Icon Generator ───────
 *
 * Generates a dark roundrect badge with the brand's gold serif "Dé"
 * letterform.  Used for both the 192×192 and 512×512 PWA manifest icons
 * as well as the inline HTML fallback.
 */
function buildDrapeSvgIcon(size: number): string {
  const radius = Math.round(size * 0.18);
  const fontSize = Math.round(size * 0.65);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1A1410"/>
      <stop offset="100%" stop-color="#0D0A08"/>
    </linearGradient>
    <linearGradient id="g" x1="0.2" y1="0" x2="0.8" y2="1">
      <stop offset="0%" stop-color="#E8D49A"/>
      <stop offset="50%" stop-color="#C9A96E"/>
      <stop offset="100%" stop-color="#A67C3A"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${radius}" fill="url(#bg)"/>
  <rect x="${Math.round(size * 0.008)}" y="${Math.round(size * 0.008)}" width="${Math.round(size * 0.984)}" height="${Math.round(size * 0.984)}" rx="${radius - 2}" fill="none" stroke="url(#g)" stroke-width="1.5" opacity="0.3"/>
  <text
    x="50%" y="54%"
    dominant-baseline="central"
    text-anchor="middle"
    font-family="'Playfair Display','Times New Roman',serif"
    font-size="${fontSize}"
    font-weight="700"
    fill="url(#g)"
    letter-spacing="-2"
  >Dé</text>
</svg>`;
}

function svgDataUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/* ─────── Icon data URIs (no physical files) ─────── */
const ICON_192 = svgDataUri(buildDrapeSvgIcon(192));
const ICON_512 = svgDataUri(buildDrapeSvgIcon(512));

/* ─────── Inline fallback icon (used if the manifest Blob fails) ─────── */
const FALLBACK_ICON = buildDrapeSvgIcon(192);

export interface PwaManifest {
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  display: string;
  orientation: string;
  lang: string;
  dir: string;
  theme_color: string;
  background_color: string;
  categories: string[];
  prefer_related_applications: boolean;
  icons: Array<{
    src: string;
    sizes: string;
    type: string;
    purpose: string;
  }>;
}

export const MANIFEST: PwaManifest = {
  name: 'Drapé Collective',
  short_name: 'Drapé',
  description:
    'Luxury fashion marketplace connecting emerging designers with discerning customers.',
  start_url: '.',
  display: 'standalone',
  orientation: 'portrait-primary',
  lang: 'en',
  dir: 'ltr',
  theme_color: '#1A1410',
  background_color: '#FCF7F1',
  categories: ['fashion', 'shopping', 'lifestyle'],
  prefer_related_applications: false,
  icons: [
    {
      src: ICON_192,
      sizes: '192x192',
      type: 'image/svg+xml',
      purpose: 'any maskable',
    },
    {
      src: ICON_512,
      sizes: '512x512',
      type: 'image/svg+xml',
      purpose: 'any maskable',
    },
  ],
};

/**
 * registerManifest
 *
 * Creates a Blob URL from the manifest JSON and appends a
 * <link rel="manifest"> element to <head>.
 *
 * Returns the generated blob URL so callers can revoke it if needed
 * (though keeping it alive for the page lifetime is fine).
 */
export function registerManifest(
  manifest: PwaManifest = MANIFEST,
): string | null {
  // Guard: don't double-register
  if (document.querySelector('link[rel="manifest"]')) return null;

  try {
    const blob = new Blob([JSON.stringify(manifest)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = url;
    document.head.appendChild(link);

    if (import.meta.env.DEV) {
      console.log('[PWA] Manifest registered via Blob URL:', url);
    }

    return url;
  } catch (err) {
    console.warn('[PWA] Could not register manifest:', err);
    return null;
  }
}

/**
 * injectFallbackIcons
 *
 * If the icon SVGs are not reachable (via data URI they always are,
 * but this acts as a safety net), inject inline <svg> fallback
 * icons into the page so the manifest still has something to show.
 */
export function injectFallbackIcons(): void {
  // Only inject if the real icons aren't already loaded
  const existing = document.querySelector('link[rel="icon"][sizes]');
  if (!existing) {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.sizes = '192x192';
    link.type = 'image/svg+xml';
    link.href = `data:image/svg+xml,${encodeURIComponent(FALLBACK_ICON)}`;
    document.head.appendChild(link);
  }
}

/* ─────── Service Worker Registration ─────── */

/**
 * registerServiceWorker
 *
 * Loads the push-notification service worker (src/sw.js) as raw text,
 * creates a Blob URL, and registers it via navigator.serviceWorker.
 *
 * During development the SW is skipped to avoid Vite HMR conflicts.
 *
 * Options:
 * - onSuccess — callback fired when the SW is active and controlling
 * - onUpdate  — callback fired when a new SW is waiting (redundant with auto-update)
 */
export async function registerServiceWorker(options?: {
  onUpdate?: () => void;
  onSuccess?: () => void;
}): Promise<ServiceWorkerRegistration | null> {
  // Only register in production builds (or when explicitly forced)
  if (import.meta.env.DEV) {
    console.log('[PWA] Skipping SW registration in development mode');
    return null;
  }

  if (!('serviceWorker' in navigator)) {
    console.warn('[PWA] Service workers not supported');
    return null;
  }

  try {
    // Dynamically import the SW source as a raw string
    const swModule = await import('../sw.js?raw');
    const swCode: string = swModule.default;

    const blob = new Blob([swCode], { type: 'application/javascript' });
    const swUrl = URL.createObjectURL(blob);

    const registration = await navigator.serviceWorker.register(swUrl, {
      scope: '/',
    });

    // Release the Blob URL once the SW is registered
    URL.revokeObjectURL(swUrl);

    if (registration.active) {
      console.log('[PWA] Service worker active');
      options?.onSuccess?.();
    }

    registration.addEventListener('updatefound', () => {
      const installing = registration.installing;
      if (installing) {
        installing.addEventListener('statechange', () => {
          if (installing.state === 'activated') {
            console.log('[PWA] Service worker updated and activated');
            options?.onSuccess?.();
          }
        });
      }
    });

    return registration;
  } catch (err) {
    console.warn('[PWA] Service worker registration failed:', err);
    return null;
  }
}
