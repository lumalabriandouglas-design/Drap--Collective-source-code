import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import type { Product, Profile } from '../../types/supabase';
import { useTrackProductView } from '../../hooks/useTrackProductView';
import { Heart, MessageCircle, ArrowLeft, Share2, Bookmark } from 'lucide-react';
import SEOHead from '../../components/ui/SEOHead';
import { SiInstagram } from 'react-icons/si';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatPrice } = useCurrency();

  const [product, setProduct] = useState<Product | null>(null);
  const [designer, setDesigner] = useState<Profile | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [shareCopied, setShareCopied] = useState(false);

  useTrackProductView(id);

  useEffect(() => {
    if (id) loadProduct();
  }, [id]);

  useEffect(() => {
    if (user && id) {
      checkLikeStatus();
      checkSavedStatus();
    }
  }, [user, id]);

  async function loadProduct() {
    setLoading(true);
    const { data: productData } = await supabase
      .from('products')
      .select('*')
      .eq('id', id!)
      .single();

    if (productData) {
      setProduct(productData);
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', productData.user_id)
        .single();

      if (profileData?.is_suspended) {
        setProduct(null);
        setDesigner(null);
        setLoading(false);
        return;
      }

      setDesigner(profileData);
    }
    setLoading(false);
  }

  async function checkLikeStatus() {
    const { data } = await supabase
      .from('likes')
      .select('*')
      .eq('user_id', user!.id)
      .eq('product_id', id!)
      .maybeSingle();
    setIsLiked(!!data);
  }

  async function checkSavedStatus() {
    const { data } = await supabase
      .from('saved_items')
      .select('*')
      .eq('user_id', user!.id)
      .eq('product_id', id!)
      .maybeSingle();
    setIsSaved(!!data);
  }

  async function toggleLike() {
    if (!user || !id) {
      navigate('/login');
      return;
    }
    if (isLiked) {
      await supabase.from('likes').delete().eq('user_id', user.id).eq('product_id', id);
      setIsLiked(false);
    } else {
      await supabase.from('likes').insert({ user_id: user.id, product_id: id });
      setIsLiked(true);
    }
  }

  async function toggleSave() {
    if (!user || !id) {
      navigate('/login');
      return;
    }
    if (isSaved) {
      await supabase.from('saved_items').delete().eq('user_id', user.id).eq('product_id', id);
      setIsSaved(false);
    } else {
      await supabase.from('saved_items').insert({ user_id: user.id, product_id: id });
      setIsSaved(true);
    }
  }

  async function handleShare() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: product?.name,
          text: `Discover ${product?.name} on Drapé`,
          url,
        });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      }
    } catch {
      // cancelled
    }
  }

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border border-charcoal-300 border-t-charcoal-700 rounded-full animate-spin" />
          <p className="text-[10px] tracking-[0.25em] uppercase text-charcoal-400">Loading piece</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <p className="font-serif text-2xl text-charcoal-700 mb-2">Piece not found</p>
        <p className="text-sm text-charcoal-400 mb-6">It may have been removed or is no longer available.</p>
        <Link
          to="/explore"
          className="inline-flex items-center gap-2 text-sm text-charcoal-600 hover:text-charcoal-900 transition-colors"
        >
          <ArrowLeft size={15} /> Back to explore
        </Link>
      </div>
    );
  }

  const brandName = designer?.brand_name || designer?.username || 'Independent Designer';
  const images = product.image_urls?.filter(Boolean) || [];
  const showroomId = designer?.id || product.user_id;
  const metaDescription = `${product.name} by ${brandName}${
    product.description ? ` — ${product.description.slice(0, 100)}` : ''
  }`;

  return (
    <>
      <SEOHead
        title={product.name}
        description={metaDescription}
        canonicalUrl={`${window.location.origin}/product/${id}`}
        ogImage={images[0]}
        ogType="product"
      />

      <div className="min-h-screen bg-bg">
        {/* Back */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs tracking-[0.12em] uppercase text-charcoal-400 hover:text-charcoal-700 transition-colors"
          >
            <ArrowLeft size={14} /> Back
          </button>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
            {/* ════════ IMAGES ════════ */}
            <div className="lg:col-span-7">
              {/* Main image */}
              <div className="relative aspect-[3/4] overflow-hidden bg-ivory-50 rounded-sm">
                {images[activeImage] ? (
                  <img
                    src={images[activeImage]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="font-serif text-6xl text-charcoal-200">
                      {(product.name?.charAt(0) || 'D').toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-2.5 mt-3 overflow-x-auto pb-1">
                  {images.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActiveImage(i)}
                      className={`relative w-16 h-20 sm:w-20 sm:h-24 flex-shrink-0 overflow-hidden rounded-sm transition-all ${
                        activeImage === i
                          ? 'ring-1 ring-charcoal-700 ring-offset-2'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ════════ DETAILS ════════ */}
            <div className="lg:col-span-5 flex flex-col">
              {/* Designer credit */}
              {designer && (
                <Link
                  to={`/showroom/${showroomId}`}
                  className="inline-flex items-center gap-2.5 mb-5 group"
                >
                  {designer.profile_photo_url ? (
                    <img
                      src={designer.profile_photo_url}
                      alt={brandName}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-charcoal-100 flex items-center justify-center">
                      <span className="font-serif text-sm text-charcoal-500">
                        {(brandName.charAt(0) || 'D').toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="text-[11px] tracking-[0.15em] uppercase text-charcoal-500 group-hover:text-charcoal-800 transition-colors">
                    {brandName}
                  </span>
                </Link>
              )}

              {/* Name */}
              <h1 className="font-serif text-3xl sm:text-4xl font-medium text-charcoal-800 leading-tight tracking-tight">
                {product.name}
              </h1>

              {/* Price */}
              <p className="mt-3 text-lg font-medium text-charcoal-700 tracking-tight">
                {product.price != null ? formatPrice(product.price) : 'Price on request'}
              </p>

              {/* Category */}
              {product.category && (
                <p className="mt-3 text-[11px] tracking-[0.15em] uppercase text-charcoal-400">
                  {product.category}
                </p>
              )}

              {/* Divider */}
              <div className="my-7 h-px bg-gradient-to-r from-charcoal-200 via-charcoal-100 to-transparent" />

              {/* Description */}
              <p className="text-sm text-charcoal-500 leading-relaxed font-light">
                {product.description ||
                  'A carefully crafted piece. Message the designer for sizing, customisation, and availability.'}
              </p>

              {/* Artistic statement */}
              {product.artistic_statement && (
                <blockquote className="mt-6 pl-4 border-l border-gold-400/40">
                  <p className="text-sm text-charcoal-500 italic leading-relaxed font-light">
                    {product.artistic_statement}
                  </p>
                </blockquote>
              )}

              {/* Materials & sizes */}
              <div className="mt-8 space-y-5">
                {product.materials && product.materials.length > 0 && (
                  <div>
                    <p className="text-[10px] tracking-[0.2em] uppercase text-charcoal-400 mb-2">
                      Materials
                    </p>
                    <p className="text-sm text-charcoal-600">
                      {product.materials.join(' · ')}
                    </p>
                  </div>
                )}
                {product.sizes && product.sizes.length > 0 && (
                  <div>
                    <p className="text-[10px] tracking-[0.2em] uppercase text-charcoal-400 mb-2">
                      Available sizes
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {product.sizes.map((s) => (
                        <span
                          key={s}
                          className="px-3 py-1.5 text-xs text-charcoal-600 border border-border rounded-sm"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {product.lead_time && (
                  <div>
                    <p className="text-[10px] tracking-[0.2em] uppercase text-charcoal-400 mb-1">
                      Lead time
                    </p>
                    <p className="text-sm text-charcoal-600">{product.lead_time}</p>
                  </div>
                )}
              </div>

              {/* Primary CTA */}
              <div className="mt-10 space-y-3">
                <Link
                  to={
                    user
                      ? `/messages?designer=${product.user_id}&product=${product.id}`
                      : '/login'
                  }
                  className="flex items-center justify-center gap-2.5 w-full py-4 bg-charcoal-800 text-white text-xs tracking-[0.15em] uppercase font-medium rounded-sm hover:bg-charcoal-900 transition-colors"
                >
                  <MessageCircle size={16} />
                  Enquire with designer
                </Link>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={toggleLike}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 border text-xs tracking-[0.1em] uppercase rounded-sm transition-all ${
                      isLiked
                        ? 'border-charcoal-700 text-charcoal-800 bg-charcoal-50'
                        : 'border-border text-charcoal-500 hover:border-charcoal-400'
                    }`}
                  >
                    <Heart size={15} fill={isLiked ? 'currentColor' : 'none'} />
                    {isLiked ? 'Liked' : 'Like'}
                  </button>

                  <button
                    type="button"
                    onClick={toggleSave}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 border text-xs tracking-[0.1em] uppercase rounded-sm transition-all ${
                      isSaved
                        ? 'border-charcoal-700 text-charcoal-800 bg-charcoal-50'
                        : 'border-border text-charcoal-500 hover:border-charcoal-400'
                    }`}
                  >
                    <Bookmark size={15} fill={isSaved ? 'currentColor' : 'none'} />
                    {isSaved ? 'Saved' : 'Save'}
                  </button>

                  <button
                    type="button"
                    onClick={handleShare}
                    className="flex items-center justify-center gap-2 px-4 py-3 border border-border text-charcoal-500 text-xs tracking-[0.1em] uppercase rounded-sm hover:border-charcoal-400 transition-all"
                  >
                    <Share2 size={15} />
                    {shareCopied ? 'Copied' : 'Share'}
                  </button>
                </div>
              </div>

              {/* Designer card */}
              {designer && (
                <div className="mt-12 pt-8 border-t border-border">
                  <p className="text-[10px] tracking-[0.2em] uppercase text-charcoal-400 mb-4">
                    About the designer
                  </p>
                  <div className="flex items-start gap-4">
                    {designer.profile_photo_url ? (
                      <img
                        src={designer.profile_photo_url}
                        alt={brandName}
                        className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-charcoal-100 flex items-center justify-center flex-shrink-0">
                        <span className="font-serif text-xl text-charcoal-400">
                          {(brandName.charAt(0) || 'D').toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-serif text-lg text-charcoal-800">{brandName}</p>
                      {designer.location && (
                        <p className="text-xs text-charcoal-400 mt-0.5">{designer.location}</p>
                      )}
                      {designer.bio && (
                        <p className="mt-2 text-sm text-charcoal-500 leading-relaxed line-clamp-3 font-light">
                          {designer.bio}
                        </p>
                      )}
                      <div className="mt-4 flex items-center gap-3">
                        <Link
                          to={`/showroom/${showroomId}`}
                          className="text-[11px] tracking-[0.12em] uppercase text-charcoal-700 hover:text-gold-600 transition-colors border-b border-charcoal-300 hover:border-gold-500 pb-0.5"
                        >
                          View showroom
                        </Link>
                        {designer.instagram && (
                          <a
                            href={`https://instagram.com/${designer.instagram.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-charcoal-400 hover:text-charcoal-700 transition-colors"
                          >
                            <SiInstagram size={14} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}