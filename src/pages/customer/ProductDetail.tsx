import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import type { Product, Profile, Like } from '../../types/supabase';
import { useTrackProductView } from '../../hooks/useTrackProductView';
import { Heart, MessageCircle, ArrowLeft, ShoppingBag, Share2, Shield } from 'lucide-react';
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

  // Track this product view for analytics
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

      // If the designer is suspended, hide the product
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
    if (!user || !id) return;
    if (isLiked) {
      await supabase.from('likes').delete().eq('user_id', user.id).eq('product_id', id);
      setIsLiked(false);
    } else {
      await supabase.from('likes').insert({ user_id: user.id, product_id: id });
      setIsLiked(true);
    }
  }

  async function toggleSave() {
    if (!user || !id) return;
    if (isSaved) {
      await supabase.from('saved_items').delete().eq('user_id', user.id).eq('product_id', id);
      setIsSaved(false);
    } else {
      await supabase.from('saved_items').insert({ user_id: user.id, product_id: id });
      setIsSaved(true);
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="aspect-[3/4] rounded-2xl bg-muted animate-pulse" />
          <div className="space-y-4">
            <div className="h-8 w-3/4 bg-muted rounded animate-pulse" />
            <div className="h-6 w-1/4 bg-muted rounded animate-pulse" />
            <div className="h-20 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <p className="text-foreground/40 text-lg">Product not found</p>
        <Link to="/explore" className="text-primary mt-4 inline-block">Back to explore</Link>
      </div>
    );
  }

  const brandName = designer?.brand_name || designer?.username || 'Independent Designer';
  const descriptionExcerpt = product.description
    ? (product.description.length > 120
        ? product.description.slice(0, 120) + '…'
        : product.description)
    : '';
  const priceStr = product.price ? formatPrice(product.price) : 'Price on request';
  const metaDescription = `${product.name} by ${brandName}${descriptionExcerpt ? ` — ${descriptionExcerpt}` : ''} — ${priceStr}`;
  const canonicalUrl = `${window.location.origin}/product/${id}`;
  const ogImage = product.image_urls?.[0];

  return (
    <>
      <SEOHead
        title={product.name}
        description={metaDescription}
        canonicalUrl={canonicalUrl}
        ogImage={ogImage}
        ogType="product"
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/explore" className="inline-flex items-center gap-1.5 text-sm text-foreground/50 hover:text-primary mb-6 transition-colors">
          <ArrowLeft size={16} /> Back to explore
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {/* Images */}
          <div>
            <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-muted">
              <img
                src={product.image_urls?.[activeImage] || 'https://placehold.co/600x800/e2e8f0/94a3b8?text=No+Image'}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            {product.image_urls && product.image_urls.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto">
                {product.image_urls.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`w-16 h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all cursor-pointer ${
                      activeImage === i ? 'border-primary' : 'border-transparent'
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="font-heading text-3xl font-bold text-foreground">{product.name}</h1>
                <p className="text-2xl font-semibold text-primary mt-2">
                  {product.price ? formatPrice(product.price) : 'Price on request'}
                </p>
              </div>
            </div>
            {product.category && (
              <span className="inline-block px-3 py-1 mt-4 text-xs font-medium bg-muted text-foreground/60 rounded-full">
                {product.category}
              </span>
            )}
            {product.tags && product.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {product.tags.map(tag => (
                  <span key={tag} className="px-2.5 py-0.5 text-xs bg-primary/5 text-primary/70 rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <p className="mt-6 text-foreground/70 leading-relaxed">
              {product.description || 'A custom-tailored masterpiece. Message the designer below for custom sizing, colors, and order inquiries.'}
            </p>

            {product.artistic_statement && (
              <div className="mt-6 p-4 rounded-xl bg-muted italic">
                <p className="text-sm text-foreground/60 leading-relaxed">"{product.artistic_statement}"</p>
              </div>
            )}

            {/* Materials & Sizes */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              {product.materials && product.materials.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-foreground/40 uppercase tracking-wider mb-1.5">Materials</p>
                  <div className="flex flex-wrap gap-1.5">
                    {product.materials.map(m => (
                      <span key={m} className="px-2.5 py-1 text-xs bg-muted text-foreground/60 rounded-lg">{m}</span>
                    ))}
                  </div>
                </div>
              )}
              {product.sizes && product.sizes.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-foreground/40 uppercase tracking-wider mb-1.5">Sizes</p>
                  <div className="flex flex-wrap gap-1.5">
                    {product.sizes.map(s => (
                      <span key={s} className="px-2.5 py-1 text-xs bg-muted text-foreground/60 rounded-lg">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {product.lead_time && (
              <p className="mt-4 text-xs text-foreground/50">
                Lead time: {product.lead_time}
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 mt-8">
              <button
                onClick={toggleLike}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all cursor-pointer ${
                  isLiked ? 'bg-destructive/10 text-destructive' : 'bg-muted text-foreground/70 hover:bg-primary/10 hover:text-primary'
                }`}
              >
                <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} />
                {isLiked ? 'Liked' : 'Like'}
              </button>
              {user && (
                <button
                  onClick={toggleSave}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all cursor-pointer ${
                    isSaved ? 'bg-accent/10 text-accent' : 'bg-muted text-foreground/70 hover:bg-accent/10 hover:text-accent'
                  }`}
                >
                  <ShoppingBag size={18} /> {isSaved ? 'Saved' : 'Save'}
                </button>
              )}
              <Link
                to={user ? `/messages?designer=${product.user_id}&product=${product.id}` : '/login'}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary font-medium text-sm hover:opacity-90 transition-all cursor-pointer"
              >
                <MessageCircle size={18} /> Message Designer
              </Link>
            </div>

            {/* Designer info */}
            {designer && (
              <div className="mt-10 p-6 rounded-2xl bg-muted">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    {designer.brand_name?.[0] || designer.username?.[0] || 'D'}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{designer.brand_name || designer.username || 'Independent Designer'}</p>
                    <p className="text-xs text-foreground/50">{designer.location || 'Location undisclosed'}</p>
                  </div>
                </div>
                {designer.bio && (
                  <p className="mt-3 text-sm text-foreground/60 leading-relaxed">{designer.bio}</p>
                )}
                {designer.instagram && (
                  <a href={`https://instagram.com/${designer.instagram}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-3 text-sm text-primary hover:underline">
                    <SiInstagram size={14} /> @{designer.instagram}
                  </a>
                )}
                {/* ── View Full Collection Button ── */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/showroom/${product.user_id}`);
                    window.scrollTo(0, 0);
                  }}
                  className="mt-5 w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl
                    border border-border text-foreground/80 font-medium text-sm
                    hover:border-primary/40 hover:text-primary hover:bg-primary/5
                    transition-all duration-300 ease-out cursor-pointer"
                >
                  <ShoppingBag size={16} />
                  View Full Collection
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
