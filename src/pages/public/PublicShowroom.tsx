import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { supabase } from '../../lib/supabase';
import { useCurrency } from '../../contexts/CurrencyContext';
import {
  MapPin, Package, ExternalLink, Globe, ChevronDown,
} from 'lucide-react';
import { SiInstagram } from 'react-icons/si';
import type { Profile, Product } from '../../types/supabase';

/* ── Register GSAP plugin ── */
gsap.registerPlugin(ScrollTrigger);

/* ─── Types ─── */
interface ShowroomState {
  designer: Profile | null;
  products: Product[];
  loading: boolean;
  error: string | null;
}

/* ─── Constants ─── */
const MAX_FEATURED = 6;
const EASE_CINEMATIC = 'power2.inOut';
const EASE_INFO = 'power2.out';

/* ═══════════════════════════════════════════════════════════
   COMPONENT — Designer Showroom Scrollytelling
   ═══════════════════════════════════════════════════════════
   STRICT LAYOUT RULES:
   • No white gap — main container has m-0 p-0, ScrollTrigger
     starts at 'top top' so the garment image is visible the
     absolute second the page loads.
   • True full-screen canvas: 100vw × 100vh.
   • Garment image uses object-fit: cover & object-position: center.
   • Frosted-glass card (name, price, button) floats at bottom-center.
   • Designer identity (name + logo) sits cleanly at the top.
   ═══════════════════════════════════════════════════════════ */

export default function PublicShowroom() {
  const { designerId } = useParams<{ designerId: string }>();
  const { formatPrice } = useCurrency();

  /* ── State ── */
  const [data, setData] = useState<ShowroomState>({
    designer: null, products: [], loading: true, error: null,
  });
  const [reducedMotion, setReducedMotion] = useState(false);

  /* ── Refs ── */
  const bgRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const imageRefs = useRef<HTMLDivElement[]>([]);
  const infoRefs = useRef<HTMLDivElement[]>([]);
  const sectionRefs = useRef<HTMLDivElement[]>([]);
  const designerRef = useRef<HTMLDivElement>(null);
  const scrollHintRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  /* ── Detect reduced motion ── */
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  /* ── Data Fetching ── */
  const fetchShowroom = useCallback(async (id: string) => {
    setData((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .or(`id.eq.${id},user_id.eq.${id}`)
        .single();
      if (profileErr) throw profileErr;
      if (!profile) {
        setData({ designer: null, products: [], loading: false, error: 'Designer not found' });
        return;
      }
      if (profile.is_suspended) {
        setData({ designer: null, products: [], loading: false, error: 'This designer is no longer available.' });
        return;
      }
      const { data: products, error: productsErr } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', profile.id)
        .eq('status', 'published')
        .eq('is_hidden', false)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });
      if (productsErr) throw productsErr;
      setData({
        designer: profile as Profile,
        products: (products ?? []) as Product[],
        loading: false,
        error: null,
      });
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err
        ? String((err as { message: unknown }).message)
        : 'Failed to load showroom';
      console.error('PublicShowroom — fetch error:', err);
      setData({ designer: null, products: [], loading: false, error: message });
    }
  }, []);

  useEffect(() => {
    if (!designerId) {
      setData({ designer: null, products: [], loading: false, error: 'No designer specified' });
      return;
    }
    fetchShowroom(designerId);
  }, [designerId, fetchShowroom]);

  /* ── Derived data ── */
  const featured = useMemo(
    () => data.products.slice(0, MAX_FEATURED),
    [data.products],
  );
  const remaining = useMemo(
    () => data.products.slice(MAX_FEATURED),
    [data.products],
  );
  const brandName = data.designer?.brand_name || data.designer?.username || 'Designer Showroom';
  const pageTitle = `${brandName} — Drapé Collective`;
  const hasProducts = featured.length > 0;

  /* ═══════════════════════════════════════════════════════════
     GSAP — The Digital Catwalk
     ═══════════════════════════════════════════════════════════ */

  useEffect(() => {
    if (reducedMotion || featured.length < 2) return;

    const ctx = gsap.context(() => {
      /* ── Pin the full-screen canvas — start: 'top top' ensures
             the garment image is visible the instant the page loads
             with zero white gap ── */
      ScrollTrigger.create({
        trigger: scrollContainerRef.current,
        start: 'top top',
        end: () => `+=${scrollContainerRef.current?.offsetHeight ?? 0}`,
        pin: bgRef.current,
        pinSpacing: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      });

      /* ── Scroll-hint fade ── */
      if (scrollHintRef.current) {
        ScrollTrigger.create({
          trigger: scrollContainerRef.current,
          start: 'top 80%',
          end: 'top 20%',
          scrub: 1,
          onUpdate: (self) => {
            gsap.to(scrollHintRef.current, {
              opacity: 1 - self.progress,
              y: -(self.progress * 20),
              duration: 0,
            });
          },
        });
      }

      /* ── Image transitions — one timeline per section ── */
      featured.forEach((_product, i) => {
        if (i === 0) return;

        const section = sectionRefs.current[i - 1];
        const prevImg = imageRefs.current[i - 1];
        const currImg = imageRefs.current[i];
        const prevInfo = infoRefs.current[i - 1];
        const currInfo = infoRefs.current[i];

        if (!section || !prevImg || !currImg) return;

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: 'top bottom',
            end: 'top top',
            scrub: 1.2,
          },
        });

        /* ── Image crossfade + scale ── */
        tl.to(prevImg, {
          opacity: 0,
          scale: 1.08,
          duration: 1,
          ease: EASE_CINEMATIC,
        }, 0)
          .fromTo(currImg, {
            opacity: 0,
            scale: 0.92,
          }, {
            opacity: 1,
            scale: 1,
            duration: 1,
            ease: EASE_CINEMATIC,
          }, 0);

        /* ── Info overlay transition (staggered, faster exit) ── */
        if (prevInfo && currInfo) {
          tl.to(prevInfo, {
            opacity: 0,
            y: -20,
            duration: 0.6,
            ease: EASE_CINEMATIC,
          }, 0)
            .fromTo(currInfo, {
              opacity: 0,
              y: 24,
            }, {
              opacity: 1,
              y: 0,
              duration: 0.8,
              ease: EASE_INFO,
            }, 0.15);
        }
      });

      /* ── Counter updates via a hidden pinned trigger ── */
      if (counterRef.current) {
        ScrollTrigger.create({
          trigger: scrollContainerRef.current,
          start: 'top 42%',
          end: () => `+=${scrollContainerRef.current?.offsetHeight ?? 0}`,
          onUpdate: (self) => {
            const sectionCount = featured.length;
            const idx = Math.min(
              Math.floor(self.progress * sectionCount),
              sectionCount - 1,
            );
            const padded = String(idx + 1).padStart(2, '0');
            if (counterRef.current && counterRef.current.textContent !== padded) {
              counterRef.current.textContent = padded;
            }
          },
        });
      }

      /* ── Designer info entrance ── */
      if (designerRef.current) {
        gsap.fromTo(designerRef.current,
          { opacity: 0, y: -16, filter: 'blur(4px)' },
          { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.2, delay: 0.5, ease: EASE_INFO },
        );
      }

      ScrollTrigger.refresh();
    }, scrollContainerRef);

    return () => ctx.revert();
  }, [featured, reducedMotion]);

  /* ── Refresh on resize ── */
  useEffect(() => {
    const handler = () => ScrollTrigger.refresh();
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  /* ═══════════════════════════════════════════════════════════
     RENDER: Loading
     ═══════════════════════════════════════════════════════════ */

  if (data.loading) {
    return (
      <>
        <Helmet><title>{pageTitle}</title></Helmet>
        <div className="fixed inset-0 bg-charcoal-900 flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border border-gold-400/40 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs tracking-[0.15em] uppercase text-gold-300/40">Curating the catwalk</p>
          </div>
        </div>
      </>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     RENDER: Error
     ═══════════════════════════════════════════════════════════ */

  if (data.error) {
    return (
      <>
        <Helmet><title>Showroom — Drapé Collective</title></Helmet>
        <div className="fixed inset-0 bg-charcoal-900 flex flex-col items-center justify-center text-center px-4">
          <div className="w-16 h-16 rounded-full bg-charcoal-800 border border-gold-400/15 flex items-center justify-center mb-6">
            <Package size={28} className="text-gold-400/30" />
          </div>
          <h1 className="font-serif text-2xl md:text-3xl text-white mb-2">Showroom Not Found</h1>
          <p className="text-gold-100/50 text-sm max-w-xs mx-auto mb-8 leading-relaxed">{data.error}</p>
          <Link
            to="/explore"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white text-xs tracking-[0.12em] uppercase hover:bg-white/20 transition-all cursor-pointer"
          >
            <ExternalLink size={12} /> Browse the Collective
          </Link>
        </div>
      </>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     RENDER: Full-Screen Catwalk
     ═══════════════════════════════════════════════════════════
     STRICT LAYOUT:
     • Root wrapper: margin 0, padding 0, dark background to kill
       any white gap from the Layout wrapper (pt-20 / bg-bg).
     • Fixed canvas: 100vw × 100vh, object-fit: cover images.
     • Designer identity at top of screen.
     • Frosted-glass card floating at bottom-center.
     ═══════════════════════════════════════════════════════════ */

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <link rel="canonical" href={`${window.location.origin}/showroom/${designerId}`} />
        <meta
          name="description"
          content={data.designer?.bio || `Explore ${brandName}'s collection on Drapé Collective`}
        />
        <meta property="og:title" content={pageTitle} />
        <meta
          property="og:description"
          content={data.designer?.bio || `Browse the curated showroom of ${brandName}`}
        />
        {data.designer?.profile_photo_url && (
          <meta property="og:image" content={data.designer.profile_photo_url} />
        )}
      </Helmet>

      {/* ── Root wrapper: margin 0, padding 0, dark background
             cancels the Layout's pt-20 and bg-bg, eliminating the
             white gap ── */}
      <div
        ref={rootRef}
        className="bg-charcoal-900"
        style={{ margin: 0, padding: 0, marginTop: '-80px' }}
      >
        {/* ══════════════════════════════════════════════════════
            FIXED FULL-SCREEN CANVAS — 100vw × 100vh
            ══════════════════════════════════════════════════════ */}
        <div
          ref={bgRef}
          className="fixed inset-0 overflow-hidden bg-charcoal-900"
          style={{ width: '100vw', height: '100vh', willChange: 'transform' }}
        >
          {/* ── Stacked editorial images — object-fit: cover
                 ensures they beautifully fill the entire screen
                 top-to-bottom without collapsing ── */}
          {featured.map((product, i) => (
            <div
              key={product.id}
              ref={(el) => { if (el) imageRefs.current[i] = el; }}
              className="absolute inset-0"
              style={{
                opacity: i === 0 ? 1 : 0,
                zIndex: 0,
                willChange: 'transform, opacity',
              }}
            >
              {product.image_urls?.[0] ? (
                <img
                  src={product.image_urls[0]}
                  alt={product.name}
                  className="w-full h-full object-cover object-center"
                  loading={i === 0 ? 'eager' : 'lazy'}
                  draggable={false}
                />
              ) : (
                <div className="w-full h-full bg-charcoal-800 flex items-center justify-center">
                  <span className="font-serif text-8xl text-gold-400/15">
                    {(product.name?.charAt(0) || 'D').toUpperCase()}
                  </span>
                </div>
              )}

              {/* Subtle bottom shadow for text readability — image stays the hero */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.7) 100%)',
                }}
              />
            </div>
          ))}

          {/* ── Layer: subtle texture grain ── */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              backgroundSize: '256px 256px',
            }}
          />

          {/* ══════════════════════════════════════════════════════
              OVERLAY: Designer Identity (top-left)
              Cleanly placed at the top of the screen with the
              designer's name and profile logo.
              ══════════════════════════════════════════════════════ */}
          <div
            ref={designerRef}
            className="absolute top-6 sm:top-8 left-4 sm:left-8 z-40 max-w-xs opacity-0"
            style={{ willChange: 'transform, opacity, filter' }}
          >
            <div className="flex items-center gap-3">
              {data.designer?.profile_photo_url ? (
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-white/20 shadow-lg flex-shrink-0">
                  <img
                    src={data.designer.profile_photo_url}
                    alt={`${brandName} profile`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-charcoal-700 border-2 border-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="font-serif text-lg text-gold-300/60">
                    {(brandName.charAt(0) || 'D').toUpperCase()}
                  </span>
                </div>
              )}
              <div className="text-left">
                <h1 className="font-serif text-base sm:text-lg text-white leading-tight">
                  {brandName}
                </h1>
                {data.designer?.location && (
                  <p className="flex items-center gap-1 text-white/50 text-[11px] mt-0.5">
                    <MapPin size={10} className="shrink-0" />
                    <span>{data.designer.location}</span>
                  </p>
                )}
              </div>
            </div>

            {data.designer?.bio && (
              <p className="hidden sm:block mt-2.5 text-white/35 text-xs leading-relaxed line-clamp-2">
                {data.designer.bio}
              </p>
            )}
          </div>

          {/* ══════════════════════════════════════════════════════
              OVERLAY: Counter (top-right)
              ══════════════════════════════════════════════════════ */}
          <div className="absolute top-6 sm:top-8 right-4 sm:right-8 z-40">
            <div className="px-3.5 py-1.5 rounded-full bg-white/8 backdrop-blur-2xl border border-white/10 shadow-xl">
              <span className="text-white/60 text-xs font-mono tracking-wider">
                <span ref={counterRef} className="text-white">01</span>
                <span className="text-white/20">/{String(featured.length).padStart(2, '0')}</span>
              </span>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════
              OVERLAY: Social Links (top-right, below counter)
              ══════════════════════════════════════════════════════ */}
          {(data.designer?.website || data.designer?.instagram) && (
            <div className="absolute top-20 sm:top-24 right-4 sm:right-8 z-40 flex flex-col gap-2 items-end">
              {data.designer.website && (
                <a
                  href={data.designer.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-white/8 backdrop-blur-2xl border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/15 transition-all cursor-pointer"
                  aria-label="Website"
                >
                  <Globe size={14} />
                </a>
              )}
              {data.designer.instagram && (
                <a
                  href={`https://instagram.com/${data.designer.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-white/8 backdrop-blur-2xl border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/15 transition-all cursor-pointer"
                  aria-label="Instagram"
                >
                  <SiInstagram size={14} />
                </a>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              OVERLAY: Floating Product Details Card (bottom-center)
              Frosted-glass card with Garment Name, Price, and
              'View Item' button — floats elegantly over the
              full-screen image.
              ══════════════════════════════════════════════════════ */}
          <div className="absolute bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 z-40 w-full px-4 sm:px-0 text-center pointer-events-none">
            {featured.map((product, i) => (
              <div
                key={product.id}
                ref={(el) => { if (el) infoRefs.current[i] = el; }}
                className="pointer-events-auto"
                style={{
                  opacity: i === 0 ? 1 : 0,
                  willChange: 'transform, opacity',
                }}
              >
                {/* Glassmorphism card */}
                <div className="inline-block px-6 sm:px-10 py-5 sm:py-6 rounded-2xl bg-white/8 backdrop-blur-2xl border border-white/10 shadow-2xl">
                  <p className="text-[10px] text-gold-300/60 tracking-[0.2em] uppercase mb-2">
                    Featured Piece
                  </p>
                  <h2 className="font-serif text-xl sm:text-2xl md:text-3xl text-white leading-tight">
                    {product.name}
                  </h2>
                  {product.price != null && (
                    <p className="text-base sm:text-lg text-gold-300 mt-1.5 font-medium">
                      {formatPrice(product.price)}
                    </p>
                  )}
                  <Link
                    to={`/product/${product.id}`}
                    className="inline-flex items-center gap-2 mt-4 sm:mt-5 px-5 sm:px-6 py-2 sm:py-2.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white text-[11px] tracking-[0.12em] uppercase hover:bg-white/20 transition-all cursor-pointer"
                  >
                    <ExternalLink size={12} /> View Item
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* ══════════════════════════════════════════════════════
              OVERLAY: Scroll Hint
              ══════════════════════════════════════════════════════ */}
          {featured.length > 1 && (
            <div
              ref={scrollHintRef}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-1"
            >
              <span className="text-[10px] tracking-[0.2em] uppercase text-white/25">
                Scroll to explore
              </span>
              <ChevronDown size={14} className="text-white/20 animate-bounce" />
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════
            SCROLLABLE AREA (defines the scroll distance)
            ══════════════════════════════════════════════════════ */}
        <div
          ref={scrollContainerRef}
          className="relative"
          style={{ pointerEvents: 'none', zIndex: 10 }}
        >
          {/* One scroll section per transition (featured.length - 1) */}
          {featured.slice(1).map((remainingProduct, i) => (
            <div
              key={remainingProduct.id}
              ref={(el) => { if (el) sectionRefs.current[i] = el; }}
              className="h-screen"
            />
          ))}

          {/* Final section — reveals the collection below */}
          {featured.length > 0 && (
            <div className="min-h-screen" />
          )}
        </div>

        {/* ══════════════════════════════════════════════════════
            POST-CATWALK: Collection Details
            ══════════════════════════════════════════════════════ */}
        <div className="relative bg-bg pointer-events-auto" style={{ zIndex: 10 }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
            {/* Design Philosophy */}
            {data.designer?.design_philosophy && (
              <div className="text-center mb-14">
                <h2 className="font-serif text-2xl md:text-3xl text-text">Design Philosophy</h2>
                <div className="gold-divider-center" />
                <p className="mt-4 text-text-muted text-sm max-w-lg mx-auto italic leading-relaxed">
                  &ldquo;{data.designer.design_philosophy}&rdquo;
                </p>
              </div>
            )}

            {/* Remaining products grid */}
            {remaining.length > 0 && (
              <>
                <div className="text-center mb-10">
                  <h2 className="font-serif text-2xl md:text-3xl text-text">The Full Collection</h2>
                  <div className="gold-divider-center" />
                  <p className="text-text-muted text-xs mt-2">
                    {remaining.length} more {remaining.length === 1 ? 'piece' : 'pieces'} to explore
                  </p>
                </div>

                <div className="masonry-grid">
                  {remaining.map((product) => (
                    <Link
                      key={product.id}
                      to={`/product/${product.id}`}
                      className="card-luxury group cursor-pointer"
                    >
                      <div className="aspect-[3/4] overflow-hidden bg-bg-alt relative">
                        {product.image_urls?.[0] ? (
                          <img
                            src={product.image_urls[0]}
                            alt={product.name}
                            loading="lazy"
                            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                          />
                        ) : (
                          <div className="w-full h-full bg-charcoal-800/10 flex items-center justify-center">
                            <div className="w-14 h-14 rounded-full border border-gold-400/15 flex items-center justify-center">
                              <span className="font-serif text-2xl tracking-tight text-gold-400/25">
                                {(product.name?.charAt(0) || 'D').toUpperCase()}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="p-4 md:p-5">
                        <h3 className="font-serif text-base md:text-lg text-text truncate">{product.name}</h3>
                        {product.price != null && (
                          <p className="mt-1.5 text-sm font-medium text-text">{formatPrice(product.price)}</p>
                        )}
                        {product.category && (
                          <span className="inline-block mt-2.5 text-[10px] tracking-[0.15em] uppercase text-text-muted/60 border border-border-light px-2.5 py-0.5 rounded-full">
                            {product.category}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}

            {/* Empty state when no products */}
            {!hasProducts && remaining.length === 0 && (
              <div className="text-center py-20">
                <div className="relative w-20 h-20 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full border border-gold-300/20" />
                  <div className="absolute inset-2 rounded-full bg-bg-alt flex items-center justify-center">
                    <Package size={28} className="text-text-muted/25" />
                  </div>
                </div>
                <h2 className="font-serif text-2xl md:text-3xl text-text mb-3">Premiering Soon</h2>
                <div className="gold-divider-center" />
                <p className="text-text-muted text-sm max-w-md mx-auto leading-relaxed">
                  {brandName}&rsquo;s collection is loading or premiering soon. Follow their journey as they unveil their first pieces.
                </p>
                <Link
                  to="/explore"
                  className="btn-luxury btn-luxury-outline mt-10"
                >
                  <ExternalLink size={14} /> Explore the Collective
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}