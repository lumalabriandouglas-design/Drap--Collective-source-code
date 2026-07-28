import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Pause, Play } from 'lucide-react';

/* ── Smart aspect-ratio classification ── */
type AspectClass = 'portrait' | 'landscape' | 'square';
interface SlideDim {
  aspectClass: AspectClass;
  ratio: number;
}

export interface HeroSlide {
  id: string | number;
  src: string;
  srcMobile: string;
  alt: string;
  productName: string;
  designerName: string;
  productLink: string;
  designerId: string;
}

export interface HeroCTA {
  label: string;
  href: string;
  variant: 'primary' | 'outline' | 'gold';
}

export interface HeroContent {
  badge?: string;
  heading: string;
  headingAccent?: string;
  subtext?: string;
  cta?: HeroCTA[];
}

export interface HeroSliderProps {
  slides?: HeroSlide[];
  minHeight?: string;
  maxHeight?: string;
  content?: HeroContent;
  loading?: boolean;
}

const editorialContent: HeroContent = {
  badge: 'Curated Fashion Collective',
  heading: 'Discover Timeless',
  headingAccent: 'Craftsmanship',
  subtext: 'Showcase your work \u2022 Connect with admirers \u2022 Sell with pride',
  cta: [
    { label: 'Browse Collections', href: '/browse', variant: 'primary' },
    { label: 'Join as Designer', href: '/signup', variant: 'outline' },
  ],
};

const AUTOPLAY_MS = 5000;
const SLIDE_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';
const SLIDE_DURATION = 800; // ms — must match CSS transition

export default function HeroSlider({
  slides: rawSlides,
  minHeight = 'min-h-[600px]',
  maxHeight = 'max-h-none',
  content = editorialContent,
  loading = false,
}: HeroSliderProps) {
  const slides = rawSlides || [];
  const total = slides.length;

  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [touchMoved, setTouchMoved] = useState(false);
  const [brokenImages, setBrokenImages] = useState<Set<string | number>>(new Set());
  const [slideDims, setSlideDims] = useState<Map<string | number, SlideDim>>(new Map());
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [progressKey, setProgressKey] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transitionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Detect reduced-motion preference ── */
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  /* ── Navigation ── */
  const goTo = useCallback(
    (index: number) => {
      if (isTransitioning || total === 0) return;
      setIsTransitioning(true);
      setCurrent((((index % total) + total) % total));
      if (transitionTimeout.current) clearTimeout(transitionTimeout.current);
      transitionTimeout.current = setTimeout(() => {
        setIsTransitioning(false);
      }, SLIDE_DURATION);
    },
    [isTransitioning, total],
  );

  const next = useCallback(() => {
    if (total === 0) return;
    goTo((current + 1) % total);
  }, [goTo, current, total]);

  const prev = useCallback(() => {
    if (total === 0) return;
    goTo((((current - 1) % total) + total) % total);
  }, [goTo, current, total]);

  /* ── Auto-advance ── */
  const startAutoplay = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (total > 0 && !prefersReducedMotion) {
      intervalRef.current = setInterval(next, AUTOPLAY_MS);
    }
  }, [next, total, prefersReducedMotion]);

  const pauseAutoplay = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /* Start / restart autoplay when dependencies change */
  useEffect(() => {
    if (loading || total === 0 || isPaused || prefersReducedMotion) {
      pauseAutoplay();
      return;
    }
    startAutoplay();
    return () => pauseAutoplay();
  }, [loading, total, isPaused, startAutoplay, pauseAutoplay, prefersReducedMotion, current]);

  /* ── Clamp current if slides shrink ── */
  useEffect(() => {
    if (current >= total && total > 0) setCurrent(0);
  }, [total, current]);

  /* ── Restart progress bar animation when slide changes ── */
  useEffect(() => {
    setProgressKey((k) => k + 1);
  }, [current]);

  /* ── Touch / swipe ── */
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
    setTouchMoved(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
    setTouchMoved(true);
  };

  const handleTouchEnd = () => {
    if (touchStart === null || touchEnd === null) return;
    const diff = touchStart - touchEnd;
    if (Math.abs(diff) > 50 && touchMoved) {
      if (diff > 0) next();
      else prev();
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  /* ── Tap to pause (mobile) ── */
  const handleSlideTap = useCallback(() => {
    if (!touchMoved) {
      setIsPaused((prev) => !prev);
    }
  }, [touchMoved]);

  /* ── Image error ── */
  const handleImageError = (slideId: string | number) => {
    setBrokenImages((prev) => new Set(prev).add(slideId));
  };

  /* ── Smart aspect-ratio detection ── */
  const handleSmartLoad = (id: string | number, img: HTMLImageElement) => {
    const { naturalWidth, naturalHeight } = img;
    const ratio = naturalWidth / naturalHeight;
    let aspectClass: AspectClass;
    if (ratio < 0.8) aspectClass = 'portrait';
    else if (ratio > 1.2) aspectClass = 'landscape';
    else aspectClass = 'square';
    setSlideDims((prev) => {
      const existing = prev.get(id);
      if (existing && existing.aspectClass === aspectClass && existing.ratio === ratio) return prev;
      const next = new Map(prev);
      next.set(id, { aspectClass, ratio });
      return next;
    });
  };

  /* ── Keyboard navigation ── */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { prev(); e.preventDefault(); }
      if (e.key === 'ArrowRight') { next(); e.preventDefault(); }
      if (e.key === ' ') { setIsPaused((p) => !p); e.preventDefault(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [prev, next]);

  /* ── Derived ── */
  const showNav = !loading && total > 0;

  /* ── Slide position helper ── */
  const getSlideTransform = (i: number): string => {
    if (prefersReducedMotion) return i === current ? 'translateX(0)' : 'translateX(100%)';
    const diff = i - current;
    // Wrap-around: if we're at the last slide, the first slide is "next" (+100%)
    if (diff === 0) return 'translateX(0)';
    if (diff === 1 || (current === total - 1 && i === 0)) return 'translateX(100%)';
    if (diff === -1 || (current === 0 && i === total - 1)) return 'translateX(-100%)';
    return diff > 0 ? 'translateX(100%)' : 'translateX(-100%)';
  };

  return (
    <section
      className={`relative w-full h-screen ${minHeight} ${maxHeight} lg:h-[88vh] lg:min-h-[780px] 2xl:h-[88vh] overflow-hidden bg-charcoal-900`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      role="region"
      aria-label="Featured collections hero slider"
      aria-roledescription="carousel"
      aria-live="polite"
    >
      {/* ════════════════════════════════════════
          LOADING STATE — premium skeleton
          ════════════════════════════════════════ */}
      {loading && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-charcoal-900">
          <div className="relative mb-10 animate-fade-in">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="opacity-40">
              <path d="M24 4C13.5 4 5 12.5 5 23s8.5 19 19 19 19-8.5 19-19S34.5 4 24 4z" stroke="#C9A96E" strokeWidth="0.8" fill="none" />
              <path d="M16 24c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8-8-3.6-8-8z" stroke="#C9A96E" strokeWidth="0.5" fill="none" opacity="0.6" />
              <path d="M24 12v24M12 24h24" stroke="#C9A96E" strokeWidth="0.3" opacity="0.3" />
            </svg>
            <div
              className="absolute inset-0 border border-gold-400/20 border-t-gold-400/60 rounded-full animate-spin"
              style={{ animationDuration: '3s' }}
            />
            <div
              className="absolute inset-1.5 border border-gold-300/10 border-b-gold-300/30 rounded-full animate-spin"
              style={{ animationDirection: 'reverse', animationDuration: '2s' }}
            />
          </div>
          <h2 className="font-serif text-xl tracking-[0.15em] text-white/20 mb-2">DRAPÉ</h2>
          <p className="text-[9px] tracking-[0.3em] uppercase text-gold-400/30">Curating the collection</p>
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-400/15 to-transparent" />

          <div className="absolute top-[30%] left-[5%] w-72 space-y-4 opacity-25">
            <div className="h-3 w-28 rounded-full bg-white/10 animate-pulse" />
            <div className="h-10 w-64 rounded-lg bg-white/10 animate-pulse" style={{ animationDelay: '200ms' }} />
            <div className="h-3 w-44 rounded-full bg-white/10 animate-pulse" style={{ animationDelay: '400ms' }} />
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          SLIDES — horizontal slide track
          ════════════════════════════════════════ */}
      {!loading && total > 0 && (
        <div className="absolute inset-0 overflow-hidden">
          {slides.map((slide, i) => {
            const isActive = i === current;
            const isBroken = brokenImages.has(slide.id);

            return (
              <div
                key={slide.id}
                className="absolute inset-0 w-full h-full"
                style={{
                  transform: getSlideTransform(i),
                  transition: prefersReducedMotion
                    ? 'none'
                    : `transform ${SLIDE_DURATION}ms ${SLIDE_EASING}`,
                  zIndex: isActive ? 2 : 1,
                  visibility:
                    Math.abs(i - current) <= 1 ||
                    (current === 0 && i === total - 1) ||
                    (current === total - 1 && i === 0)
                      ? 'visible'
                      : 'hidden',
                }}
                aria-hidden={!isActive}
                onClick={handleSlideTap}
              >
                {isBroken ? (
                  /* ── Luxury fallback backdrop ── */
                  <div className="w-full h-full bg-gradient-to-br from-charcoal-800 via-charcoal-900 to-charcoal-950 flex items-center justify-center">
                    <div className="text-center px-8">
                      <div className="w-16 h-16 mx-auto mb-6 rounded-full border border-gold-400/20 flex items-center justify-center">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C9A96E" strokeWidth="0.8" className="opacity-40">
                          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                        </svg>
                      </div>
                      <h3 className="font-serif text-3xl sm:text-4xl text-white/80 font-semibold tracking-tight leading-tight">
                        {slide.productName}
                      </h3>
                      <p className="text-xs tracking-[0.2em] uppercase text-gold-400/50 mt-3 font-medium">
                        {slide.designerName}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* ── Blurred backdrop for desktop contain mode ── */}
                    <div className="hidden lg:block absolute inset-0 pointer-events-none overflow-hidden">
                      <picture>
                        <source media="(max-width: 768px)" srcSet={slide.srcMobile} />
                        <img
                          src={slide.src}
                          alt=""
                          aria-hidden="true"
                          className="w-full h-full object-cover scale-125"
                          style={{ filter: 'blur(20px)', opacity: 0.3 }}
                          loading="lazy"
                        />
                      </picture>
                      <div className="absolute inset-0 bg-charcoal-900/30" />
                    </div>

                    {/* ══════════════════════════════════
                        SMART CONTENT-AWARE IMAGE FRAMING
                        ══════════════════════════════════ */}
                    {(() => {
                      const dim = slideDims.get(slide.id);
                      const isLandscape = dim?.aspectClass === 'landscape';
                      const isUltraTall = dim !== undefined && dim.ratio < 0.6;
                      const padVh = isUltraTall
                        ? Math.min(6, Math.round((0.6 - dim!.ratio) * 12))
                        : 0;

                      return (
                        <picture
                          className="block w-full h-full"
                          style={{
                            boxSizing: 'border-box',
                            ...(padVh > 0
                              ? { paddingTop: `${padVh}vh`, paddingBottom: `${padVh}vh` }
                              : {}),
                          }}
                        >
                          <source media="(max-width: 768px)" srcSet={slide.srcMobile} />
                          <img
                            src={slide.src}
                            alt={slide.alt}
                            className="w-full h-full object-cover"
                            style={{
                              objectPosition: isLandscape ? 'center center' : 'center 10%',
                              filter: 'brightness(1.05)',
                              imageRendering: 'auto',
                            }}
                            loading={i === 0 ? 'eager' : 'lazy'}
                            fetchpriority={i === 0 ? 'high' : 'auto'}
                            onError={() => handleImageError(slide.id)}
                            onLoad={(e) => handleSmartLoad(slide.id, e.currentTarget)}
                          />
                        </picture>
                      );
                    })()}
                  </>
                )}

                {/* Minimal vignette */}
                {!isBroken && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent pointer-events-none" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Persistent ambient layers ─── */}
      {!loading && (
        <>
          <div
            className="absolute top-0 left-0 right-0 z-10 pointer-events-none"
            style={{
              height: '10%',
              background:
                'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.03) 50%, transparent 100%)',
            }}
          />
          <div
            className="absolute inset-0 z-10 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)',
            }}
          />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-400/40 to-transparent z-20" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-400/30 to-transparent z-20" />
        </>
      )}

      {/* ════════════════════════════════════════
          TEXT OVERLAY
          ════════════════════════════════════════ */}
      {!loading && (
        <div className="absolute inset-0 z-20 flex items-center pointer-events-none">
          <div className="max-w-6xl mx-auto px-6 w-full">
            <div className="max-w-2xl">
              {(() => {
                const currentSlide = total > 0 ? slides[current] : null;
                if (currentSlide) {
                  return (
                    <>
                      {currentSlide.designerName && (
                        <div className="mb-4">
                          <span className="inline-flex items-center gap-2 text-[10px] sm:text-xs tracking-[0.2em] uppercase text-white/50 font-medium border border-white/10 rounded-full px-4 py-1.5 backdrop-blur-sm bg-white/5">
                            <span className="w-1 h-1 rounded-full bg-gold-400/60" />
                            {currentSlide.designerName}
                          </span>
                        </div>
                      )}
                      {currentSlide.productName && (
                        <h1
                          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-serif font-semibold tracking-tight text-white leading-[0.9]"
                          style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
                        >
                          {currentSlide.productName}
                        </h1>
                      )}
                      <div className="w-12 h-[1.5px] bg-gradient-to-r from-gold-300 via-gold-400 to-gold-300 mt-6 mb-5" />
                    </>
                  );
                }
                return (
                  <>
                    <h1
                      className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-serif font-semibold tracking-tight text-white leading-[0.9] block"
                      style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
                    >
                      {content.heading}
                      {content.headingAccent && (
                        <>
                          <br />
                          <span className="bg-gradient-to-r from-gold-200 via-gold-300 to-gold-400 bg-clip-text text-transparent italic">
                            {content.headingAccent}
                          </span>
                        </>
                      )}
                    </h1>
                    <div className="w-12 h-[1.5px] bg-gradient-to-r from-gold-300 via-gold-400 to-gold-300 my-6 sm:my-8" />
                    {content.subtext && (
                      <p className="text-sm sm:text-base md:text-lg text-white/60 max-w-2xl leading-relaxed font-light tracking-wide">
                        {content.subtext}
                      </p>
                    )}
                  </>
                );
              })()}

              {/* ─── CTA buttons ── */}
              <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 pointer-events-auto">
                {(() => {
                  const currentSlide = total > 0 ? slides[current] : null;
                  if (currentSlide?.productLink) {
                    return (
                      <Link
                        to={currentSlide.productLink}
                        className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 sm:px-8 sm:py-4 rounded-full text-[11px] sm:text-xs font-medium tracking-[0.12em] uppercase transition-all duration-500 bg-gradient-to-r from-gold-400 to-gold-500 text-white overflow-hidden hover:shadow-[0_8px_32px_rgba(201,169,110,0.35)] hover:translate-y-[-1px] active:translate-y-0 active:scale-[0.97] group cursor-pointer"
                      >
                        <span className="flex items-center gap-2.5">
                          View Details
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            className="group-hover:translate-x-0.5 transition-transform"
                          >
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </span>
                      </Link>
                    );
                  }
                  return content.cta?.map((cta) =>
                    cta.variant === 'outline' ? (
                      <Link
                        key={cta.label}
                        to={cta.href}
                        className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 sm:px-8 sm:py-4 rounded-full text-[11px] sm:text-xs font-medium tracking-[0.12em] uppercase transition-all duration-500 border border-white/20 text-white/70 hover:bg-white/10 hover:text-white hover:border-white/40 hover:translate-y-[-1px] active:translate-y-0 active:scale-[0.97] backdrop-blur-sm cursor-pointer"
                      >
                        <span className="flex items-center gap-2.5">{cta.label}</span>
                      </Link>
                    ) : null,
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          NAVIGATION — arrows
          ════════════════════════════════════════ */}
      {showNav && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white/40 hover:text-white/90 hover:bg-white/10 border border-white/10 hover:border-white/30 backdrop-blur-sm transition-all duration-300 group cursor-pointer"
            aria-label="Previous slide"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="group-hover:-translate-x-0.5 transition-transform"
              aria-hidden="true"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={next}
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white/40 hover:text-white/90 hover:bg-white/10 border border-white/10 hover:border-white/30 backdrop-blur-sm transition-all duration-300 group cursor-pointer"
            aria-label="Next slide"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="group-hover:translate-x-0.5 transition-transform"
              aria-hidden="true"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* ════════════════════════════════════════
          PROGRESS BAR INDICATORS
          ════════════════════════════════════════ */}
      {showNav && (
        <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2 rounded-full bg-black/20 backdrop-blur-sm">
          {slides.map((slide, i) => {
            const isActive = i === current;
            return (
              <button
                key={`${slide.id}-${i}`}
                onClick={() => goTo(i)}
                className="group relative flex items-center justify-center cursor-pointer"
                style={{ width: '28px', height: '4px' }}
                aria-label={`Go to slide ${i + 1}${isActive ? ' (current)' : ''}`}
              >
                {/* Track */}
                <span className="absolute inset-0 rounded-full bg-white/15" />
                {/* Progress fill — uses CSS animation, remounts via key when slide changes */}
                <span
                  key={isActive ? `progress-${progressKey}` : `track-${i}`}
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-gold-300 to-gold-400"
                  style={{
                    width: isActive ? '100%' : '0%',
                    animation: isActive
                      ? `hero-progress ${AUTOPLAY_MS}ms linear forwards`
                      : 'none',
                    animationPlayState:
                      isActive && isPaused ? 'paused' : isActive ? 'running' : undefined,
                  }}
                />
              </button>
            );
          })}
        </div>
      )}

      {/* ════════════════════════════════════════
          PAUSE / PLAY BUTTON
          ════════════════════════════════════════ */}
      {showNav && !prefersReducedMotion && (
        <button
          onClick={() => setIsPaused((p) => !p)}
          className="absolute bottom-6 sm:bottom-8 right-6 sm:right-8 z-30 w-9 h-9 rounded-full flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/10 border border-white/10 hover:border-white/25 backdrop-blur-sm transition-all duration-300 cursor-pointer"
          aria-label={isPaused ? 'Resume slideshow' : 'Pause slideshow'}
          aria-pressed={isPaused}
        >
          {isPaused ? (
            <Play size={13} aria-hidden="true" />
          ) : (
            <Pause size={13} aria-hidden="true" />
          )}
        </button>
      )}

      {/* ── Slide counter ── */}
      {showNav && prefersReducedMotion && (
        <div className="absolute bottom-6 sm:bottom-8 right-6 sm:right-8 z-30 text-white/20 text-[11px] font-mono tracking-[0.15em] select-none">
          <span className="text-white/60">{String(current + 1).padStart(2, '0')}</span>
          <span className="mx-1.5">/</span>
          {String(total).padStart(2, '0')}
        </div>
      )}
    </section>
  );
}