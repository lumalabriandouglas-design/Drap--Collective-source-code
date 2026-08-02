import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { gsap } from 'gsap';
import { supabase } from '../../lib/supabase';
import { useCurrency } from '../../contexts/CurrencyContext';
import { MapPin, Package, ExternalLink, Globe, Share2 } from 'lucide-react';
import { SiInstagram } from 'react-icons/si';
import type { Profile, Product } from '../../types/supabase';
import ProductCard from '../../components/ui/ProductCard';

interface ShowroomState {
  designer: Profile | null;
  products: Product[];
  loading: boolean;
  error: string | null;
}

export default function PublicShowroom() {
  const { designerId } = useParams<{ designerId: string }>();
  const { formatPrice } = useCurrency();

  const [data, setData] = useState<ShowroomState>({
    designer: null,
    products: [],
    loading: true,
    error: null,
  });
  const [curtainOpen, setCurtainOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const leftCurtainRef = useRef<HTMLDivElement>(null);
  const rightCurtainRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const fetchShowroom = useCallback(async (id: string) => {
    setData((prev) => ({ ...prev, loading: true, error: null }));
    try {
      // Look up by profiles.id OR profiles.user_id so both share URL formats work
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

      // Products.user_id references profiles.id (see FK). Also try auth user_id
      // in case older rows were written with the auth UUID.
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
        // Still show the designer profile even if products fail to load
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

  // Curtain opening animation
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
    }).to(
      rightCurtainRef.current,
      {
        xPercent: 100,
        duration: 1.6,
        ease: 'power3.inOut',
      },
      0
    ).fromTo(
      contentRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.8, ease: 'power2.out' },
      0.9
    );
  }, [data.loading, data.error, curtainOpen]);

  const brandName = data.designer?.brand_name || data.designer?.username || 'Designer';
  const pageTitle = `${brandName} — Drapé Collective`;
  const featured = useMemo(() => data.products.slice(0, 1), [data.products]);
  const collection = useMemo(() => data.products, [data.products]);

  // Unique shareable link — always use profile.id (stable & matches products)
  const shareId = data.designer?.id || data.designer?.user_id || designerId;
  const shareUrl = `${window.location.origin}/showroom/${shareId}`;

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${brandName} on Drapé`,
          text: `Discover ${brandName}'s collection`,
          url: shareUrl,
        });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      }
    } catch {
      // user cancelled share
    }
  };

  // Loading
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

  // Error
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

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta
          name="description"
          content={data.designer?.bio || `Explore ${brandName}'s exclusive collection on Drapé Collective`}
        />
        <link rel="canonical" href={shareUrl} />
      </Helmet>

      {/* ═══════════════ CURTAINS ═══════════════ */}
      {!curtainOpen && (
        <>
          <div
            ref={leftCurtainRef}
            className="fixed inset-y-0 left-0 w-1/2 z-[100] bg-[#0a0908]"
            style={{
              backgroundImage:
                'linear-gradient(90deg, #0a0908 0%, #12100e 85%, #1a1612 100%)',
            }}
          >
            <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-[#C9A96E]/20 to-transparent" />
          </div>
          <div
            ref={rightCurtainRef}
            className="fixed inset-y-0 right-0 w-1/2 z-[100] bg-[#0a0908]"
            style={{
              backgroundImage:
                'linear-gradient(270deg, #0a0908 0%, #12100e 85%, #1a1612 100%)',
            }}
          >
            <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-[#C9A96E]/20 to-transparent" />
          </div>

          {/* Center monogram during curtain */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center pointer-events-none">
            <span className="font-serif text-4xl sm:text-5xl text-[#C9A96E]/30 tracking-[0.2em]">
              Dé
            </span>
          </div>
        </>
      )}

      {/* ═══════════════ SHOWROOM CONTENT ═══════════════ */}
      <div
        ref={contentRef}
        className="min-h-screen bg-[#0a0908] text-white"
        style={{ marginTop: '-5rem', opacity: curtainOpen ? 1 : 0 }}
      >
        {/* ── Hero / Designer identity ── */}
        <section className="relative pt-28 sm:pt-32 pb-16 sm:pb-24 px-4">
          <div className="max-w-4xl mx-auto text-center">
            {/* Avatar */}
            <div className="mb-8 flex justify-center">
              {data.designer?.profile_photo_url ? (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border border-[#C9A96E]/25 shadow-[0_0_40px_rgba(201,169,110,0.08)]">
                  <img
                    src={data.designer.profile_photo_url}
                    alt={brandName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#1a1612] border border-[#C9A96E]/20 flex items-center justify-center">
                  <span className="font-serif text-4xl text-[#C9A96E]/50">
                    {(brandName.charAt(0) || 'D').toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Brand name */}
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#C9A96E]/60 mb-3">
              Designer Showroom
            </p>
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight text-white leading-none">
              {brandName}
            </h1>

            {data.designer?.location && (
              <p className="flex items-center justify-center gap-1.5 text-white/40 text-sm mt-4">
                <MapPin size={13} className="text-[#C9A96E]/50" />
                {data.designer.location}
              </p>
            )}

            {data.designer?.bio && (
              <p className="mt-6 text-white/45 text-sm sm:text-base max-w-lg mx-auto leading-relaxed font-light">
                {data.designer.bio}
              </p>
            )}

            {/* Actions */}
            <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
              {data.designer?.instagram && (
                <a
                  href={`https://instagram.com/${data.designer.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-[#C9A96E] hover:border-[#C9A96E]/30 transition-all"
                  aria-label="Instagram"
                >
                  <SiInstagram size={16} />
                </a>
              )}
              {data.designer?.website && (
                <a
                  href={data.designer.website}
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
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/10 text-white/50 text-xs tracking-[0.12em] uppercase hover:text-[#C9A96E] hover:border-[#C9A96E]/30 transition-all"
              >
                <Share2 size={13} />
                {shareCopied ? 'Link copied' : 'Share showroom'}
              </button>
            </div>
          </div>

          {/* Gold line */}
          <div className="max-w-xs mx-auto mt-14 h-px bg-gradient-to-r from-transparent via-[#C9A96E]/35 to-transparent" />
        </section>

        {/* ── Design philosophy ── */}
        {data.designer?.design_philosophy && (
          <section className="px-4 pb-16">
            <div className="max-w-2xl mx-auto text-center">
              <p className="text-[10px] tracking-[0.3em] uppercase text-[#C9A96E]/50 mb-4">
                Philosophy
              </p>
              <p className="font-serif text-xl sm:text-2xl text-white/80 italic leading-relaxed">
                “{data.designer.design_philosophy}”
              </p>
            </div>
          </section>
        )}

        {/* ── Featured piece (first product, large) ── */}
        {featured.length > 0 && (
          <section className="px-4 pb-20">
            <div className="max-w-5xl mx-auto">
              <p className="text-[10px] tracking-[0.3em] uppercase text-[#C9A96E]/50 text-center mb-8">
                Featured
              </p>
              <Link
                to={`/product/${featured[0].id}`}
                className="group grid md:grid-cols-2 gap-8 md:gap-12 items-center"
              >
                <div className="relative aspect-[3/4] rounded-sm overflow-hidden bg-[#141210]">
                  {featured[0].image_urls?.[0] ? (
                    <img
                      src={featured[0].image_urls[0]}
                      alt={featured[0].name}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-1000 ease-out"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="font-serif text-6xl text-[#C9A96E]/15">
                        {(featured[0].name?.charAt(0) || 'D').toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-center md:text-left">
                  <h2 className="font-serif text-3xl sm:text-4xl text-white leading-tight">
                    {featured[0].name}
                  </h2>
                  {featured[0].price != null && (
                    <p className="mt-3 text-[#C9A96E] text-lg font-medium tracking-wide">
                      {formatPrice(featured[0].price)}
                    </p>
                  )}
                  {featured[0].description && (
                    <p className="mt-4 text-white/40 text-sm leading-relaxed line-clamp-4 max-w-md mx-auto md:mx-0">
                      {featured[0].description}
                    </p>
                  )}
                  <span className="inline-flex items-center gap-2 mt-8 text-[11px] tracking-[0.2em] uppercase text-white/50 group-hover:text-[#C9A96E] transition-colors">
                    View piece
                    <ExternalLink size={12} />
                  </span>
                </div>
              </Link>
            </div>
          </section>
        )}

        {/* ── Full collection ── */}
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
                  <div className="max-w-[80px] mx-auto mt-5 h-px bg-gradient-to-r from-transparent via-[#C9A96E]/40 to-transparent" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 sm:gap-x-6 sm:gap-y-12">
                  {collection.map((product, idx) => (
                    <div key={product.id} className="[&_h3]:text-white [&_p]:text-white/50 [&_.text-charcoal-800]:text-white [&_.text-charcoal-700]:text-white/90 [&_.text-charcoal-400]:text-white/40">
                      <ProductCard
                        product={{ ...product, designer: data.designer }}
                        index={idx}
                        showDesigner={false}
                      />
                    </div>
                  ))}
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

        {/* ── Footer of showroom ── */}
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