import { useState, useCallback } from 'react';

/* ─── Luxury Placeholder SVG (woven texture) ─── */

function Placeholder({ className }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center bg-ivory-100 overflow-hidden ${className ?? ''}`}
      aria-hidden
    >
      <svg
        viewBox="0 0 200 280"
        className="w-full h-full"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern id="weave" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
            <rect width="12" height="12" fill="oklch(94% 0.01 52)" />
            <rect x="0" y="0" width="1" height="12" fill="oklch(91% 0.012 50)" opacity="0.4" />
            <rect x="0" y="0" width="12" height="1" fill="oklch(91% 0.012 50)" opacity="0.3" />
          </pattern>
          <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(85% 0.02 48)" stopOpacity="0.15" />
            <stop offset="50%" stopColor="oklch(85% 0.02 48)" stopOpacity="0" />
            <stop offset="100%" stopColor="oklch(85% 0.02 48)" stopOpacity="0.08" />
          </linearGradient>
        </defs>
        <rect width="200" height="280" fill="url(#weave)" />
        <rect width="200" height="280" fill="url(#fade)" />
        {/* Minimalist hanger icon */}
        <g transform="translate(100 110)" opacity="0.15" fill="none" stroke="oklch(40% 0.018 22)" strokeWidth="1">
          <path d="M0 55V35" />
          <path d="M-25 15a25 25 0 0150 0" strokeWidth="1.2" />
          <path d="M-15 30h30" />
        </g>
        {/* Subtle gold thread */}
        <line x1="40" y1="200" x2="160" y2="200" stroke="oklch(72% 0.16 74)" strokeWidth="0.5" opacity="0.1" />
        <line x1="60" y1="210" x2="140" y2="210" stroke="oklch(72% 0.16 74)" strokeWidth="0.3" opacity="0.06" />
      </svg>
    </div>
  );
}

/* ─── Loading Skeleton ─── */

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`bg-ivory-100 overflow-hidden relative ${className ?? ''}`}>
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, oklch(92% 0.008 50 / 0.5) 50%, transparent 100%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.8s ease-in-out infinite',
        }}
      />
    </div>
  );
}

/* ─── LazyImage Props ─── */

export interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  imgClassName?: string;
  skeletonClassName?: string;
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
}

/* ─── LazyImage Component ─── */

export default function LazyImage({
  src,
  alt,
  className = '',
  containerClassName = '',
  imgClassName = '',
  skeletonClassName = '',
  loading = 'lazy',
  onLoad,
}: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleLoad = useCallback(() => {
    setLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setFailed(true);
    setLoaded(true);
  }, []);

  const showPlaceholder = failed || !src;

  return (
    <div className={`relative overflow-hidden ${className} ${containerClassName}`}>
      {/* Skeleton while loading */}
      {!loaded && !showPlaceholder && (
        <Skeleton className={`absolute inset-0 ${skeletonClassName}`} />
      )}

      {/* Placeholder on error / empty src */}
      {showPlaceholder && (
        <Placeholder className={`absolute inset-0`} />
      )}

      {/* The actual image */}
      {!showPlaceholder && (
        <img
          src={src}
          alt={alt}
          loading={loading}
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full h-full object-cover transition-all duration-500 ease-in-out ${imgClassName}`}
          style={{
            opacity: loaded ? 1 : 0,
            transform: loaded ? 'scale(1)' : 'scale(1.03)',
          }}
        />
      )}
    </div>
  );
}
