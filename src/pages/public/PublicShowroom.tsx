import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { gsap } from 'gsap';
import { supabase } from '../../lib/supabase';
import { useCurrency } from '../../contexts/CurrencyContext';
import {
  MapPin,
  Package,
  ExternalLink,
  Globe,
  Share2,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
} from 'lucide-react';
import { SiInstagram } from 'react-icons/si';
import type { Profile, Product } from '../../types/supabase';
import { optimizeImageUrl } from '../../lib/imageUrl';

interface ShowroomState {
  designer: Profile | null;
  products: Product[];
  loading: boolean;
  error: string | null;
}

export default function PublicShowroom() {
  const { designerId } = useParams<{ designerId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { formatPrice } = useCurrency();

  const [data, setData] = useState<ShowroomState>({
    designer: null,
    products: [],
    loading: true,
    error: null,
  });
  const [curtainOpen, setCurtainOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const leftCurtainRef = useRef<HTMLDivElement>(null);
  const rightCurtainRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const frontPageRef = useRef<HTMLDivElement>(null);
  const underPageRef = useRef<HTMLDivElement>(null);
  const isTurning = useRef(false);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);
  const activeImageIndexRef = useRef(0);

  const fetchShowroom = useCallback(async (id: string) => {
    setData((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { data: profiles, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .or(`id.eq.${id},user_id.eq.${id}`)
        .limit(2);

      if (profileErr) {
        console.error('[PublicShowroom] profile query error:', profileErr);
        setData({
          designer: null,
          products: [],
          loading: false,
          error: 'Unable to load designer. Please try again.',
        });
        return;
      }

      const profile = (profiles && profiles.length > 0 ? profiles[0] : null) as Profile | null;

      if (!profile) {
        setData({ designer: null, products: [], loading: false, error: 'Designer not found' });
        return;
      }

      if (profile.is_suspended) {
        setData({
          designer: null,
          products: [],
          loading: false,
          error: 'This designer is no longer available.',
        });
        return;
      }

      const ownerIds = Array.from(
        new Set([profile.id, profile.user_id].filter(Boolean)),
      );

      const { data: products, error: productsErr } = await supabase
        .from('products')
        .select('*')
        .in('user_id', ownerIds)
        .eq('status', 'published')
        .eq('is_hidden', false)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (productsErr) {
        console.error('[PublicShowroom] products query error:', productsErr);
        setData({
          designer: profile,
          products: [],
          loading: false,
          error: null,
        });
        return;
      }

      setData({
        designer: profile,
        products: (products ?? []) as Product[],
        loading: false,
        error: null,
      });
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to load showroom';
      console.error('[PublicShowroom] unexpected error:', err);
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

  useEffect(() => {
    if (data.loading || data.error || data.products.length === 0) return;

    const pieceParam = searchParams.get('piece');
    const fromParam = pieceParam
      ? data.products.find((p) => p.id === pieceParam)
      : null;
    const next = fromParam || data.products[0];

    setActiveProductId((prev) => (prev === next.id ? prev : next.id));
    setActiveImageIndex(0);
    activeImageIndexRef.current = 0;
  }, [data.loading, data.error, data.products, searchParams]);

  useEffect(() => {
    if (data.loading || data.error || curtainOpen) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setCurtainOpen(true);
      return;
    }

    const tl = gsap.timeline({
      delay: 0.4,
      onComplete: () => setCurtainOpen(true),
    });

    tl.to(leftCurtainRef.current, {
      xPercent: -100,
      duration: 1.6,
      ease: 'power3.inOut',
    })
      .to(
        rightCurtainRef.current,
        {
          xPercent: 100,
          duration: 1.6,
          ease: 'power3.inOut',
        },
        0,
      )
      .fromTo(
        contentRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.8, ease: 'power2.out' },
        0.9,
      );
  }, [data.loading, data.error, curtainOpen]);

  const brandName = data.designer?.brand_name || data.designer?.username || 'Designer';
  const pageTitle = `${brandName} — Drapé Collective`;
  const collection = useMemo(() => data.products, [data.products]);

  const activeProduct = useMemo(() => {
    if (!activeProductId) return collection[0] || null;
    return collection.find((p) => p.id === activeProductId) || collection[0] || null;
  }, [collection, activeProductId]);

  const activeImages = useMemo(() => {
    return (activeProduct?.image_urls || []).filter(Boolean);
  }, [activeProduct]);

  useEffect(() => {
    setActiveImageIndex(0);
    activeImageIndexRef.current = 0;
    if (frontPageRef.current) {
      gsap.set(frontPageRef.current, { rotateY: 0, opacity: 1 });
    }
  }, [activeProduct?.id]);

  const shareId = data.designer?.id || data.designer?.user_id || designerId;
  const shareUrl = activeProduct
    ? `${window.location.origin}/showroom/${shareId}?piece=${activeProduct.id}`
    : `${window.location.origin}/showroom/${shareId}`;

  const selectPiece = useCallback(
    (productId: string) => {
      setActiveProductId(productId);
      setActiveImageIndex(0);
      activeImageIndexRef.current = 0;
      const next = new URLSearchParams(searchParams);
      next.set('piece', productId);
      setSearchParams(next, { replace: true });
      galleryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [searchParams, setSearchParams],
  );

  /** Book-page turn between photos of the active piece. */
  const goImage = useCallback(
    (dir: -1 | 1) => {
      if (activeImages.length <= 1 || isTurning.current) return;

      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const current = activeImageIndexRef.current;
      const nextIndex = (current + dir + activeImages.length) % activeImages.length;

      if (prefersReduced || !frontPageRef.current || !underPageRef.current) {
        activeImageIndexRef.current = nextIndex;
        setActiveImageIndex(nextIndex);
        return;
      }

      isTurning.current = true;

      const underImg = underPageRef.current.querySelector('img');
      if (underImg) {
        underImg.src = optimizeImageUrl(activeImages[nextIndex]);
      }

      const origin = dir > 0 ? 'left center' : 'right center';
      const endRotate = dir > 0 ? -105 : 105;

      gsap.set(frontPageRef.current, {
        transformOrigin: origin,
        rotateY: 0,
        zIndex: 2,
      });
      gsap.set(underPageRef.current, { zIndex: 1, opacity: 1 });

      gsap.to(frontPageRef.current, {
        rotateY: endRotate,
        duration: 0.65,
        ease: 'power2.inOut',
        onComplete: () => {
          activeImageIndexRef.current = nextIndex;
          setActiveImageIndex(nextIndex);
          gsap.set(frontPageRef.current, { rotateY: 0 });
          isTurning.current = false;
        },
      });
    },
    [activeImages],
  );

  const goToImage = useCallback(
    (index: number) => {
      if (index === activeImageIndexRef.current || isTurning.current) return;
      if (activeImages.length <= 1) return;

      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReduced || !frontPageRef.current) {
        activeImageIndexRef.current = index;
        setActiveImageIndex(index);
        return;
      }

      isTurning.current = true;
      const underImg = underPageRef.current?.querySelector('img');
      if (underImg) {
        underImg.src = optimizeImageUrl(activeImages[index]);
      }

      gsap.to(frontPageRef.current, {
        opacity: 0,
        duration: 0.25,
        ease: 'power1.in',
        onComplete: () => {
          activeImageIndexRef.current = index;
          setActiveImageIndex(index);
          gsap.set(frontPageRef.current, { opacity: 1, rotateY: 0 });
          isTurning.current = false;
        },
      });
    },
    [activeImages],
  );

  useEffect(() => {
    if (!curtainOpen || !activeProduct) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goImage(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goImage(1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [curtainOpen, activeProduct, goImage]);

  const onTouchStart = (e: React.TouchEvent) => {
    if (isTurning.current) return;
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  };
  const onTouchEnd = () => {
    if (touchStartX.current == null) return;
    const dx = touchDeltaX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 45) return;
    if (dx < 0) goImage(1);
    else goImage(-1);
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${brandName} on Drapé`,
          text: activeProduct
            ? `${activeProduct.name} by ${brandName}`
            : `Discover ${brandName}'s collection`,
          url: shareUrl,
        });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      }
    } catch {
      // cancelled
    }
  };

  if (data.loading) {
    return (
      <>
        <Helmet>
          <title>Showroom — Drapé Collective</title>
        </Helmet>
        <div className="fixed inset-0 bg-[#0a0908] flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-5">
            <div className="w-10 h-10 border border-[#C9A96E]/30 border-t-[#C9A96E] rounded-full animate-spin" />
            <p className="text-[10px] tracking-[0.35em] uppercase text-[#C9A96E]/50">
              Preparing the showroom
            </p>
          </div>
        </div>
      </>
    );
  }

  if (data.error) {
    return (
      <>
        <Helmet>
          <title>Showroom — Drapé Collective</title>
        </Helmet>
        <div className="fixed inset-0 bg-[#0a0908] flex flex-col items-center justify-center text-center px-4">
          <Package size={32} className="text-[#C9A96E]/25 mb-6" />
          <h1 className="font-serif text-2xl text-white mb-2">Showroom Not Found</h1>
          <p className="text-white/40 text-sm max-w-xs mb-8">{data.error}</p>
          <Link
            to="/explore"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-white/15 text-white/70 text-xs tracking-[0.15em] uppercase hover:bg-white/5 transition-all"
          >
            <ExternalLink size={12} /> Explore the Collective
          </Link>
        </div>
      </>
    );
  }

  const designer = data.designer!;
  const messageDesignerId = designer.user_id || designer.id;

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta
          name="description"
          content={
            designer.bio ||
            `Discover ${brandName}'s collection on Drapé Collective — emerging fashion designers.`
          }
        />
        <meta property="og:title" content={pageTitle} />
        <meta
          property="og:description"
          content={
            activeProduct
              ? `${activeProduct.name} by ${brandName}`
              : designer.bio || `Discover ${brandName} on Drapé Collective`
          }
        />
        {(activeImages[0] || designer.profile_photo_url) && (
          <meta
            property="og:image"
            content={activeImages[0] || designer.profile_photo_url || ''}
          />
        )}
      </Helmet>

      <div className="fixed inset-0 z-40 pointer-events-none overflow-hidden">
        <div ref={leftCurtainRef} className="absolute inset-y-0 left-0 w-1/2 bg-[#0a0908]" />
        <div ref={rightCurtainRef} className="absolute inset-y-0 right-0 w-1/2 bg-[#0a0908]" />
      </div>

      <div
        ref={contentRef}
        className="min-h-screen bg-[#0a0908] text-white"
        style={{ opacity: curtainOpen ? 1 : 0 }}
      >
        <section className="px-4 pt-16 sm:pt-24 pb-12">
          <div className="max-w-3xl mx-auto text-center">
            <div className="mx-auto mb-6">
              {designer.profile_photo_url ? (
                <img
                  src={designer.profile_photo_url}
                  alt={brandName}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover mx-auto border border-[#C9A96E]/25 shadow-[0_0_40px_rgba(201,169,110,0.08)]"
                />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
                  <span className="font-serif text-3xl text-white/40">
                    {(brandName.charAt(0) || 'D').toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            <p className="text-[10px] tracking-[0.35em] uppercase text-[#C9A96E]/60 mb-3">
              Designer Showroom
            </p>
            <h1 className="font-serif text-3xl sm:text-5xl text-white tracking-tight mb-4">
              {brandName}
            </h1>

            {designer.location && (
              <p className="inline-flex items-center gap-1.5 text-xs text-white/40 mb-4">
                <MapPin size={12} className="text-[#C9A96E]/50" />
                {designer.location}
              </p>
            )}

            {designer.bio && (
              <p className="text-sm sm:text-base text-white/55 leading-relaxed max-w-xl mx-auto">
                {designer.bio}
              </p>
            )}

            <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
              {designer.instagram && (
                <a
                  href={`https://instagram.com/${designer.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-[#C9A96E] hover:border-[#C9A96E]/30 transition-all"
                  aria-label="Instagram"
                >
                  <SiInstagram size={16} />
                </a>
              )}
              {designer.website && (
                <a
                  href={designer.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-[#C9A96E] hover:border-[#C9A96E]/30 transition-all"
                  aria-label="Website"
                >
                  <Globe size={16} />
                </a>
              )}
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/10 text-white/50 text-xs tracking-[0.12em] uppercase hover:text-[#C9A96E] hover:border-[#C9A96E]/30 transition-all cursor-pointer"
              >
                <Share2 size={13} />
                {shareCopied ? 'Link copied' : 'Share showroom'}
              </button>
              {messageDesignerId && (
                <Link
                  to={`/messages?designer=${messageDesignerId}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#C9A96E]/25 text-[#C9A96E]/80 text-xs tracking-[0.12em] uppercase hover:bg-[#C9A96E]/10 transition-all"
                >
                  <MessageCircle size={13} />
                  Message
                </Link>
              )}
            </div>
          </div>

          <div className="max-w-xs mx-auto mt-14 h-px bg-gradient-to-r from-transparent via-[#C9A96E]/35 to-transparent" />
        </section>

        {designer.design_philosophy && (
          <section className="px-4 pb-12">
            <div className="max-w-2xl mx-auto text-center">
              <p className="text-[10px] tracking-[0.3em] uppercase text-[#C9A96E]/50 mb-4">
                Philosophy
              </p>
              <p className="font-serif text-xl sm:text-2xl text-white/80 italic leading-relaxed">
                “{designer.design_philosophy}”
              </p>
            </div>
          </section>
        )}

        {activeProduct && activeImages.length > 0 && (
          <section ref={galleryRef} className="px-4 pb-16 scroll-mt-20">
            <div className="max-w-4xl mx-auto">
              <div
                className="relative aspect-[3/4] sm:aspect-[4/5] max-h-[78vh] mx-auto select-none"
                style={{ perspective: '1800px' }}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
              >
                <div
                  ref={underPageRef}
                  className="absolute inset-0 overflow-hidden rounded-sm bg-white/[0.03]"
                  style={{ zIndex: 1 }}
                >
                  <img
                    src={optimizeImageUrl(
                      activeImages[(activeImageIndex + 1) % activeImages.length] ||
                        activeImages[0],
                    )}
                    alt=""
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                </div>

                <div
                  ref={frontPageRef}
                  className="absolute inset-0 overflow-hidden rounded-sm bg-[#0a0908]"
                  style={{
                    zIndex: 2,
                    transformStyle: 'preserve-3d',
                    backfaceVisibility: 'hidden',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.45)',
                  }}
                >
                  <img
                    src={optimizeImageUrl(activeImages[activeImageIndex])}
                    alt={`${activeProduct.name} — photo ${activeImageIndex + 1}`}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                  <div
                    className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/25 to-transparent"
                    aria-hidden
                  />
                </div>

                {activeImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => goImage(-1)}
                      className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full border border-white/15 bg-black/40 backdrop-blur-sm items-center justify-center text-white/80 hover:text-white hover:border-[#C9A96E]/40 transition-all cursor-pointer"
                      aria-label="Previous photo"
                    >
                      <ChevronLeft size={22} />
                    </button>
                    <button
                      type="button"
                      onClick={() => goImage(1)}
                      className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full border border-white/15 bg-black/40 backdrop-blur-sm items-center justify-center text-white/80 hover:text-white hover:border-[#C9A96E]/40 transition-all cursor-pointer"
                      aria-label="Next photo"
                    >
                      <ChevronRight size={22} />
                    </button>
                  </>
                )}

                {activeImages.length > 1 && (
                  <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm text-[10px] tracking-wider text-white/80 tabular-nums">
                    {activeImageIndex + 1} / {activeImages.length}
                  </div>
                )}
              </div>

              {activeImages.length > 1 && (
                <div className="flex items-center justify-center gap-2 mt-5">
                  {activeImages.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => goToImage(i)}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        i === activeImageIndex
                          ? 'w-6 bg-[#C9A96E]'
                          : 'w-1.5 bg-white/25 hover:bg-white/40'
                      }`}
                      aria-label={`Photo ${i + 1}`}
                      aria-current={i === activeImageIndex}
                    />
                  ))}
                </div>
              )}

              <div className="text-center mt-8 max-w-lg mx-auto">
                <p className="text-[10px] tracking-[0.3em] uppercase text-[#C9A96E]/50 mb-2">
                  Now viewing
                </p>
                <h2 className="font-serif text-2xl sm:text-3xl text-white mb-2">
                  {activeProduct.name}
                </h2>
                {activeProduct.price != null && (
                  <p className="text-sm text-white/70 tracking-wide mb-4">
                    {formatPrice(activeProduct.price)}
                  </p>
                )}
                {activeProduct.description && (
                  <p className="text-sm text-white/45 leading-relaxed mb-6">
                    {activeProduct.description}
                  </p>
                )}
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <Link
                    to={`/product/${activeProduct.id}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/15 text-white/70 text-xs tracking-[0.12em] uppercase hover:bg-white/5 transition-all"
                  >
                    View details
                  </Link>
                  {messageDesignerId && (
                    <Link
                      to={`/messages?designer=${messageDesignerId}&product=${activeProduct.id}`}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#C9A96E]/30 text-[#C9A96E] text-xs tracking-[0.12em] uppercase hover:bg-[#C9A96E]/10 transition-all"
                    >
                      <MessageCircle size={13} />
                      Message about this
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="px-4 pb-24">
          <div className="max-w-6xl mx-auto">
            {collection.length > 0 ? (
              <>
                <div className="text-center mb-12">
                  <p className="text-[10px] tracking-[0.3em] uppercase text-[#C9A96E]/50 mb-2">
                    The Collection
                  </p>
                  <h2 className="font-serif text-2xl sm:text-3xl text-white">
                    {collection.length} {collection.length === 1 ? 'Piece' : 'Pieces'}
                  </h2>
                  <p className="text-white/35 text-sm mt-3 max-w-md mx-auto">
                    Tap a piece to open its photo set above — swipe like turning a page
                  </p>
                  <div className="max-w-[80px] mx-auto mt-5 h-px bg-gradient-to-r from-transparent via-[#C9A96E]/40 to-transparent" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 sm:gap-x-6 sm:gap-y-12">
                  {collection.map((product, idx) => {
                    const imgs = (product.image_urls || []).filter(Boolean);
                    const cover = imgs[0] || '';
                    const extra = Math.max(0, imgs.length - 1);
                    const isActive = product.id === activeProduct?.id;

                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => selectPiece(product.id)}
                        className={`group text-left cursor-pointer ${
                          isActive ? 'opacity-100' : 'opacity-90 hover:opacity-100'
                        }`}
                      >
                        <div
                          className={`relative aspect-[3/4] rounded-xl overflow-hidden bg-white/5 transition-all ${
                            isActive
                              ? 'ring-1 ring-[#C9A96E]/50 ring-offset-2 ring-offset-[#0a0908]'
                              : ''
                          }`}
                        >
                          {cover ? (
                            <img
                              src={optimizeImageUrl(cover)}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700 ease-out"
                              loading={idx < 6 ? 'eager' : 'lazy'}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/20 font-serif text-3xl">
                              {(product.name?.charAt(0) || 'D').toUpperCase()}
                            </div>
                          )}
                          {extra > 0 && (
                            <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/55 backdrop-blur-sm text-[10px] tracking-wide text-white/90">
                              +{extra}
                            </span>
                          )}
                          {isActive && (
                            <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-[#C9A96E]/90 text-[9px] tracking-wider uppercase text-black font-semibold">
                              Viewing
                            </span>
                          )}
                        </div>
                        <div className="mt-3.5 px-0.5">
                          <h3 className="font-serif text-[15px] font-medium text-white leading-snug line-clamp-2">
                            {product.name}
                          </h3>
                          <p className="text-sm font-medium text-white/70 mt-1.5 tracking-tight">
                            {product.price != null
                              ? formatPrice(product.price)
                              : 'Price on request'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-20">
                <Package size={28} className="mx-auto text-[#C9A96E]/25 mb-5" />
                <h2 className="font-serif text-2xl text-white mb-2">Premiering Soon</h2>
                <p className="text-white/40 text-sm max-w-sm mx-auto">
                  {brandName}’s first pieces are being prepared for the showroom.
                </p>
              </div>
            )}
          </div>
        </section>

        <footer className="border-t border-white/5 py-10 px-4 text-center">
          <p className="text-[10px] tracking-[0.25em] uppercase text-white/25">
            {brandName} · Drapé Collective
          </p>
          <Link
            to="/explore"
            className="inline-block mt-4 text-[11px] tracking-[0.15em] uppercase text-[#C9A96E]/50 hover:text-[#C9A96E] transition-colors"
          >
            Explore more designers
          </Link>
        </footer>
      </div>
    </>
  );
}