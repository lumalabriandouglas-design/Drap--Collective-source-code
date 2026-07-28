import { useState, useEffect, useRef } from 'react';
import type { HeroSlide } from './HeroSlider';
import { optimizeImageUrl } from '../../lib/imageUrl';

/* ─── Props ─── */

interface MoodboardCollageProps {
  slides?: HeroSlide[];
  loading?: boolean;
}

/* ─── Fallback slides for when DB is empty ─── */

const fallbackSlides: HeroSlide[] = [
  {
    id: 'mb-fb-1',
    src: optimizeImageUrl('https://images.unsplash.com/photo-1469334031218-e382a71b716b', { width: 400, quality: 70 }),
    srcMobile: '',
    alt: 'Editorial fashion flow',
    productName: '',
    designerName: '',
    productLink: '',
    designerId: '',
  },
  {
    id: 'mb-fb-2',
    src: optimizeImageUrl('https://images.unsplash.com/photo-1556905055-8f358a7a47b2', { width: 400, quality: 70 }),
    srcMobile: '',
    alt: 'Luxurious fabric texture',
    productName: '',
    designerName: '',
    productLink: '',
    designerId: '',
  },
  {
    id: 'mb-fb-3',
    src: optimizeImageUrl('https://images.unsplash.com/photo-1490481651871-ab68de25d43d', { width: 400, quality: 70 }),
    srcMobile: '',
    alt: 'Designer garments on rack',
    productName: '',
    designerName: '',
    productLink: '',
    designerId: '',
  },
  {
    id: 'mb-fb-4',
    src: optimizeImageUrl('https://images.unsplash.com/photo-1539008835657-9e8e9680c956', { width: 400, quality: 70 }),
    srcMobile: '',
    alt: 'Avant-garde runway fashion',
    productName: '',
    designerName: '',
    productLink: '',
    designerId: '',
  },
  {
    id: 'mb-fb-5',
    src: optimizeImageUrl('https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f', { width: 400, quality: 70 }),
    srcMobile: '',
    alt: 'Tailored garments detail',
    productName: '',
    designerName: '',
    productLink: '',
    designerId: '',
  },
  {
    id: 'mb-fb-6',
    src: optimizeImageUrl('https://images.unsplash.com/photo-1581044777550-4c6a1b1f3d8c', { width: 400, quality: 70 }),
    srcMobile: '',
    alt: 'Minimalist fashion editorial',
    productName: '',
    designerName: '',
    productLink: '',
    designerId: '',
  },
];

/* ─── Slot definitions: position in CSS grid ───
   Each arrangement: { imageIndexes, anchorSlot }
   We define 3 arrangements that cycle every 7 seconds. */

type Arrangement = {
  imageIndexes: number[];     // indexes into the slides array for each of 5 visible slots
  anchorSlot?: number;        // which slot is the "hero" (gets the gold border treatment)
};

const arrangements: Arrangement[] = [
  { imageIndexes: [0, 1, 2, 3, 4], anchorSlot: 0 },
  { imageIndexes: [2, 3, 4, 0, 1], anchorSlot: 2 },
  { imageIndexes: [4, 0, 1, 2, 3], anchorSlot: 4 },
];

function getArrangement(arrIdx: number, total: number): Arrangement {
  const base = arrangements[arrIdx % arrangements.length];
  const safe = base.imageIndexes.map((i) => i % total);
  return { imageIndexes: safe, anchorSlot: base.anchorSlot };
}

/* ─── Component ─── */

export default function MoodboardCollage({
  slides: propSlides,
  loading = false,
}: MoodboardCollageProps) {
  const slides = propSlides && propSlides.length >= 3 ? propSlides : fallbackSlides;

  const [arrangementIdx, setArrangementIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const [loadedImgs, setLoadedImgs] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  // Preload images on mount
  useEffect(() => {
    slides.forEach((s, i) => {
      if (!s.src) return;
      const img = new Image();
      img.src = s.src;
      img.onload = () => setLoadedImgs((prev) => new Set(prev).add(i));
      img.onerror = () => setLoadedImgs((prev) => new Set(prev).add(i));
    });
  }, [slides]);

  // Rotate arrangement every 7s
  useEffect(() => {
    if (loading || slides.length < 3) return;
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setArrangementIdx((prev) => (prev + 1) % 3);
        setVisible(true);
      }, 600);
    }, 7000);
    return () => clearInterval(interval);
  }, [loading, slides.length]);

  const arr = getArrangement(arrangementIdx, slides.length);

  const allLoaded =
    slides.length <= 3 || arr.imageIndexes.every((i) => loadedImgs.has(i));

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full rounded-2xl overflow-hidden shadow-elevation-3 bg-ivory-100"
    >
      {/* ── Loading shimmer ── */}
      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-ivory-100/80 backdrop-blur-sm">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 border-2 border-gold-300/30 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      )}

      {/* ── Collage grid ── */}
      <div
        className={`absolute inset-0 grid grid-cols-3 grid-rows-3 gap-1.5 p-1.5 transition-opacity duration-[600ms] ${
          visible && !loading ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Slot A — hero (top-left, spans 2 cols, 2 rows) */}
        <div
          className="relative col-span-2 row-span-2 rounded-lg overflow-hidden group"
          style={{ opacity: allLoaded ? 1 : 0.5, transition: 'opacity 0.5s' }}
        >
          <ImageWithPlaceholder
            src={slides[arr.imageIndexes[0] % slides.length]?.src || ''}
            alt={slides[arr.imageIndexes[0] % slides.length]?.alt || ''}
            isAnchor={arr.anchorSlot === 0}
          />
        </div>

        {/* Slot B — top-right (col 3, row 1) */}
        <div
          className="relative col-start-3 row-start-1 rounded-lg overflow-hidden group"
          style={{ opacity: allLoaded ? 1 : 0.5, transition: 'opacity 0.5s' }}
        >
          <ImageWithPlaceholder
            src={slides[arr.imageIndexes[1] % slides.length]?.src || ''}
            alt={slides[arr.imageIndexes[1] % slides.length]?.alt || ''}
            isAnchor={arr.anchorSlot === 1}
          />
        </div>

        {/* Slot C — mid-right (col 3, row 2) */}
        <div
          className="relative col-start-3 row-start-2 rounded-lg overflow-hidden group"
          style={{ opacity: allLoaded ? 1 : 0.5, transition: 'opacity 0.5s' }}
        >
          <ImageWithPlaceholder
            src={slides[arr.imageIndexes[2] % slides.length]?.src || ''}
            alt={slides[arr.imageIndexes[2] % slides.length]?.alt || ''}
            isAnchor={arr.anchorSlot === 2}
          />
        </div>

        {/* Slot D — bottom-left (col 1, row 3) */}
        <div
          className="relative col-start-1 row-start-3 rounded-lg overflow-hidden group"
          style={{ opacity: allLoaded ? 1 : 0.5, transition: 'opacity 0.5s' }}
        >
          <ImageWithPlaceholder
            src={slides[arr.imageIndexes[3] % slides.length]?.src || ''}
            alt={slides[arr.imageIndexes[3] % slides.length]?.alt || ''}
            isAnchor={arr.anchorSlot === 3}
          />
        </div>

        {/* Slot E — bottom-mid (col 2-3, row 3) */}
        <div
          className="relative col-span-2 col-start-2 row-start-3 rounded-lg overflow-hidden group"
          style={{ opacity: allLoaded ? 1 : 0.5, transition: 'opacity 0.5s' }}
        >
          <ImageWithPlaceholder
            src={slides[arr.imageIndexes[4] % slides.length]?.src || ''}
            alt={slides[arr.imageIndexes[4] % slides.length]?.alt || ''}
            isAnchor={arr.anchorSlot === 4}
          />
        </div>
      </div>

      {/* ── Overlay watermark ── */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {/* Gradient vignette edges */}
        <div className="absolute inset-0 bg-gradient-to-t from-ivory-100/20 via-transparent to-ivory-100/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-ivory-100/10 via-transparent to-ivory-100/5" />

        {/* Bottom-center watermark */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <span className="text-[9px] sm:text-[10px] tracking-[0.25em] uppercase text-gold-400/60 font-medium bg-white/40 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/30">
            Artisanal · Curated · Original
          </span>
        </div>
      </div>

      {/* ── Decorative gold corner accents ── */}
      <div className="absolute top-3 left-3 w-6 h-px bg-gradient-to-r from-gold-300/50 to-transparent z-10" />
      <div className="absolute top-3 left-3 w-px h-6 bg-gradient-to-b from-gold-300/50 to-transparent z-10" />
      <div className="absolute bottom-3 right-3 w-6 h-px bg-gradient-to-l from-gold-300/50 to-transparent z-10" />
      <div className="absolute bottom-3 right-3 w-px h-6 bg-gradient-to-t from-gold-300/50 to-transparent z-10" />
    </div>
  );
}

/* ─── Image with placeholder ─── */

function ImageWithPlaceholder({
  src,
  alt,
  isAnchor,
}: {
  src: string;
  alt: string;
  isAnchor: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className="relative w-full h-full bg-ivory-200 overflow-hidden">
      {/* Shimmer placeholder */}
      {!loaded && !error && (
        <div className="absolute inset-0 bg-gradient-to-br from-ivory-100 via-ivory-200 to-ivory-100">
          <div
            className="w-full h-full"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 2s ease-in-out infinite',
            }}
          />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-ivory-200">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-gold-200/50">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => { setLoaded(true); setError(true); }}
        className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-[1.05] ${
          loaded && !error ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Anchor gold border */}
      {isAnchor && (
        <div className="absolute inset-0 border border-gold-300/30 rounded-lg pointer-events-none" />
      )}
    </div>
  );
}
