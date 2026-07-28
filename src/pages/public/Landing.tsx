import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useCurrency } from '../../contexts/CurrencyContext';
import { ArrowRight, Palette, Heart, Shield } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../../lib/supabase';
import { useHeroSlides } from '../../hooks/useHeroSlides';
import HeroSlider from '../../components/ui/HeroSlider';
import LazyImage from '../../components/ui/LazyImage';
import { optimizeImageUrl } from '../../lib/imageUrl';
import type { Product } from '../../types/supabase';

/* ─── Landing categories (curated editorial subset) ─── */
const LANDING_CATEGORIES = [
  { label: 'All', value: null },
  { label: 'Ready-to-Wear', value: 'Ready-to-Wear' },
  { label: 'Outerwear', value: 'Outerwear' },
  { label: 'Accessories', value: 'Accessories' },
  { label: 'Knitwear', value: 'Knitwear' },
  { label: 'Evening', value: 'Evening' },
  { label: 'Avant-Garde', value: 'Avant-Garde' },
  { label: 'Denim', value: 'Denim' },
] as const;

export default function Landing() {
  /* ─── Hero Slider ─── */
  const { slides: heroSlides, loading: heroLoading } = useHeroSlides(20);
  const { formatPrice } = useCurrency();

  /* ─── Browse Products ─── */
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      let q = supabase
        .from('products')
        .select('*')
        .eq('status', 'published')
        .eq('is_hidden', false)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (activeCategory) {
        q = q.eq('category', activeCategory);
      }

      const { data, error } = await q;
      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Landing — failed to fetch products:', err);
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  }, [activeCategory]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleCategoryClick = useCallback((value: string | null) => {
    setActiveCategory(value);
  }, []);

  const activeLabel = useMemo(
    () => LANDING_CATEGORIES.find(c => c.value === activeCategory)?.label ?? 'All',
    [activeCategory],
  );

  return (
    <>
      <Helmet>
        <title>Drapé Collective — Discover Emerging Fashion Designers</title>
        <meta name="description" content="A private marketplace connecting emerging fashion designers with discerning customers. Discover unique, handcrafted fashion." />
      </Helmet>

      <div className="relative z-0">
        <HeroSlider slides={heroSlides} loading={heroLoading} />
      </div>

      {/* ═══════════════════════════════════════
         Browse Products — Dynamic Grid
         ════════════════════════════════════════ */}
      <section className="py-16 md:py-20 px-4 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <span className="text-[10px] tracking-[0.2em] uppercase text-gold-500 font-medium">
              The Collective
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-charcoal-800 mt-1.5 leading-tight">
              Browse Products
            </h2>
          </div>
          <Link
            to="/browse"
            className="inline-flex items-center gap-2 text-xs tracking-[0.12em] uppercase text-charcoal-400 hover:text-gold-500 font-medium transition-colors duration-300 group"
          >
            View All
            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* ── Gold divider ── */}
        <div className="gold-divider mb-8" />

        {/* ── Category Filters ── */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none -mx-4 px-4">
          {LANDING_CATEGORIES.map((cat) => (
            <button
              key={cat.label}
              onClick={() => handleCategoryClick(cat.value)}
              className={`flex-shrink-0 px-5 py-2.5 text-xs font-medium tracking-[0.06em] rounded-full transition-all duration-300 cursor-pointer ${
                cat.value === activeCategory || (!cat.value && !activeCategory)
                  ? 'bg-charcoal-700 text-white shadow-elevation-2'
                  : 'bg-ivory-100 text-charcoal-400 hover:bg-ivory-200 hover:text-charcoal-600'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* ── Loading skeleton ── */}
        {productsLoading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-xl bg-ivory-100 overflow-hidden">
                <div
                  className="w-full h-full"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, oklch(92% 0.008 50 / 0.5) 50%, transparent 100%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.8s ease-in-out infinite',
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* ── Empty state ── */}
        {!productsLoading && products.length === 0 && (
          <div className="text-center py-16 animate-empty-in">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-ivory-100 flex items-center justify-center">
              <Palette size={24} className="text-charcoal-300" />
            </div>
            <p className="text-charcoal-400 text-sm">Nothing in {activeLabel} yet</p>
            <p className="text-charcoal-300 text-xs mt-1">New pieces dropping soon</p>
          </div>
        )}

        {/* ── Product Grid ── */}
        {!productsLoading && products.length > 0 && (
          <>
            {/* Mobile label showing active category */}
            <div className="sm:hidden flex items-center gap-2 mb-4">
              <span className="text-[10px] tracking-[0.15em] uppercase text-charcoal-300 font-medium">
                {activeLabel}
              </span>
              <span className="text-[10px] text-charcoal-200">•</span>
              <span className="text-[10px] text-charcoal-300 font-mono">
                {products.length}
              </span>
            </div>

            <div
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5"
              style={{ animation: 'fade-in 0.6s ease-out' }}
            >
              {products.map((product, idx) => {
                const imageUrl = product.image_urls?.[0] || '';
                return (
                  <Link
                    key={product.id}
                    to={`/product/${product.id}`}
                    className="group block"
                    style={{ animationDelay: `${idx * 60}ms` }}
                  >
                    {/* Image container */}
                    <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-ivory-50 card-luxury">
                      <LazyImage
                        src={optimizeImageUrl(imageUrl)}
                        alt={product.name}
                        className="w-full h-full"
                        imgClassName="group-hover:scale-105 transition-transform duration-700 ease-out"
                        loading={idx < 4 ? 'eager' : 'lazy'}
                      />
                      {/* Hover overlay — designer credit */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none" />
                      <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-400 pointer-events-none">
                        <p className="text-[10px] tracking-[0.1em] uppercase text-white/60 font-medium">
                          {product.materials?.slice(0, 2).join(', ') || 'Fashion'}
                        </p>
                      </div>
                    </div>

                    {/* Product info */}
                    <div className="mt-3 px-0.5">
                      <h3 className="font-serif text-sm sm:text-base font-medium text-charcoal-800 truncate leading-snug">
                        {product.name}
                      </h3>
                      <p className="text-xs text-charcoal-400 mt-0.5 font-light truncate">
                        {product.description || product.category || 'Fashion'}
                      </p>
                      <p className="text-sm font-medium text-charcoal-700 mt-1.5 tracking-tight">
                        {product.price != null ? formatPrice(product.price) : 'Price on request'}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* ═══════════════════════════════════════
         Features Section
         ════════════════════════════════════════ */}
      <section className="py-16 md:py-20 px-4 max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <span className="text-[10px] tracking-[0.2em] uppercase text-gold-500 font-medium">
            Why Drapé
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-charcoal-800 mt-2 leading-tight">
            Curated for Discovery
          </h2>
          <p className="mt-2 text-charcoal-400 text-sm max-w-md mx-auto font-light">
            Every piece tells a story. Every designer has a vision.
          </p>
          <div className="gold-divider-center" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-7 rounded-2xl bg-ivory-50 hover:bg-gold-50/40 transition-all duration-500 group border border-transparent hover:border-gold-200/30">
            <div className="w-11 h-11 rounded-xl bg-charcoal-700/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-400">
              <Palette size={20} className="text-charcoal-600" />
            </div>
            <h3 className="font-serif text-lg font-medium text-charcoal-800 mb-2">Original Designs</h3>
            <p className="text-sm text-charcoal-400 leading-relaxed font-light">
              Each piece is created by independent designers with a unique artistic vision and commitment to craftsmanship.
            </p>
          </div>
          <div className="p-7 rounded-2xl bg-ivory-50 hover:bg-gold-50/40 transition-all duration-500 group border border-transparent hover:border-gold-200/30">
            <div className="w-11 h-11 rounded-xl bg-charcoal-700/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-400">
              <Shield size={20} className="text-charcoal-600" />
            </div>
            <h3 className="font-serif text-lg font-medium text-charcoal-800 mb-2">Private Marketplace</h3>
            <p className="text-sm text-charcoal-400 leading-relaxed font-light">
              An exclusive community where quality meets authenticity. Every designer is vetted before joining.
            </p>
          </div>
          <div className="p-7 rounded-2xl bg-ivory-50 hover:bg-gold-50/40 transition-all duration-500 group border border-transparent hover:border-gold-200/30">
            <div className="w-11 h-11 rounded-xl bg-charcoal-700/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-400">
              <Heart size={20} className="text-charcoal-600" />
            </div>
            <h3 className="font-serif text-lg font-medium text-charcoal-800 mb-2">Direct Connection</h3>
            <p className="text-sm text-charcoal-400 leading-relaxed font-light">
              Message designers directly, commission custom pieces, and be part of their creative journey.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
         CTA Section
         ════════════════════════════════════════ */}
      <section className="py-16 md:py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="p-10 sm:p-14 rounded-3xl bg-gradient-to-br from-ivory-50 via-ivory-100/50 to-ivory-50 border border-gold-200/20 shadow-elevation-2">
            <span className="text-[10px] tracking-[0.2em] uppercase text-gold-500 font-medium">
              Get Started
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-semibold text-charcoal-800 mt-3 leading-tight">
              Ready to Discover Your
              <br />
              Next Statement Piece?
            </h2>
            <p className="mt-3 text-charcoal-400 text-sm max-w-md mx-auto font-light">
              Join thousands of fashion-forward individuals supporting independent design.
            </p>
            <div className="gold-divider-center" />
            <Link
              to="/signup"
              className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full text-xs font-medium tracking-[0.1em] uppercase text-white bg-charcoal-700 hover:bg-charcoal-800 hover:shadow-elevation-3 transition-all duration-400 group"
            >
              Get Started
              <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}