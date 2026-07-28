import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: string;
  noIndex?: boolean;
}

const SITE_NAME = 'Drapé Collective';
const DEFAULT_DESCRIPTION =
  'A curated marketplace connecting independent fashion designers with discerning customers. Discover unique, handcrafted fashion from emerging talents.';
const DEFAULT_OG_IMAGE = '/og-image.png';
const SITE_URL = 'https://drape-collective.com';

/* ─── Brand PWA theme values ─── */
const THEME_COLOR = '#1A1410';
const BG_COLOR = '#FCF7F1';

/* ─── Inline SVG Data URIs — no physical files needed ─── */

/**
 * Favicon — transparent background, bold black serif "Dé"
 * Used in the browser tab, bookmarks, and search results.
 */
const FAVICON_SVG = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <text
      y=".9em"
      font-family="'Playfair Display','Times New Roman',serif"
      font-size="80"
      font-weight="bold"
      fill="#1A1A1A"
    >Dé</text>
  </svg>`
)}`;

/**
 * Apple Touch Icon / PWA icon — dark roundrect with gold serif "Dé"
 * Used on iOS home screen, Android splash, and PWA manifest.
 */
function pwaIconSvg(size: number): string {
  const radius = Math.round(size * 0.18);
  const fontSize = Math.round(size * 0.65);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
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
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const ICON_192 = pwaIconSvg(192);

export default function SEOHead({
  title,
  description = DEFAULT_DESCRIPTION,
  canonicalUrl,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website',
  noIndex = false,
}: SEOHeadProps) {
  const fullTitle = title
    ? `${title} | ${SITE_NAME}`
    : `${SITE_NAME} | Where fashion finds its future`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="author" content={SITE_NAME} />

      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      {!noIndex && <meta name="robots" content="index, follow" />}

      {/* ─── PWA / Apple Home Screen ─── */}
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="application-name" content={SITE_NAME} />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-title" content="Drapé" />
      <meta name="theme-color" content={THEME_COLOR} />
      <meta name="msapplication-TileColor" content={THEME_COLOR} />
      <meta name="msapplication-TileImage" content={ICON_192} />
      <meta name="msapplication-navbutton-color" content={THEME_COLOR} />

      {/* ─── PWA Icons — inline SVG data URIs ─── */}
      <link rel="apple-touch-icon" href={ICON_192} />
      <link rel="apple-touch-icon" sizes="192x192" href={ICON_192} />
      <link rel="icon" type="image/svg+xml" href={FAVICON_SVG} />

      {/* ─── Open Graph ─── */}
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}

      {/* ─── Twitter ─── */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}