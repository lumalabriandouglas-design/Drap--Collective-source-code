import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useCurrency } from '../../contexts/CurrencyContext';
import type { Product, Profile, Lookbook } from '../../types/supabase';
import { Sparkles, Heart, TrendingUp } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

export default function Feed() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [latestProducts, setLatestProducts] = useState<Product[]>([]);
  const [featuredLookbooks, setFeaturedLookbooks] = useState<Lookbook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeed();
  }, []);

  async function loadFeed() {
    setLoading(true);
    const [featuredRes, latestRes, lookbookRes] = await Promise.all([
      supabase.from('products').select('*, designer:user_id!inner(is_suspended)').eq('status', 'published').eq('is_featured', true).eq('is_hidden', false).eq('is_deleted', false).eq('designer.is_suspended', false).order('created_at', { ascending: false }).limit(6),
      supabase.from('products').select('*, designer:user_id!inner(is_suspended)').eq('status', 'published').eq('is_hidden', false).eq('is_deleted', false).eq('designer.is_suspended', false).order('created_at', { ascending: false }).limit(12),
      supabase.from('lookbooks').select('*').eq('status', 'published').eq('is_featured', true).order('created_at', { ascending: false }).limit(4),
    ]);
    setFeaturedProducts(featuredRes.data || []);
    setLatestProducts(latestRes.data || []);
    setFeaturedLookbooks(lookbookRes.data || []);
    setLoading(false);
  }

  return (
    <>
      <Helmet>
        <title>Feed — Drapé Collective</title>
      </Helmet>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome */}
        <div className="mb-10">
          <h1 className="font-heading text-3xl font-bold text-foreground">Your Feed</h1>
          <p className="text-foreground/60 mt-1">Discover what's new and trending</p>
        </div>

        {loading ? (
          <div className="space-y-16">
            <div>
              <div className="h-6 w-48 bg-muted rounded animate-pulse mb-4" />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="aspect-[3/4] rounded-2xl bg-muted animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Featured */}
            {featuredProducts.length > 0 && (
              <section className="mb-16">
                <div className="flex items-center gap-2 mb-6">
                  <Sparkles size={18} className="text-accent" />
                  <h2 className="font-heading text-xl font-semibold text-foreground">Featured Pieces</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {featuredProducts.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </section>
            )}

            {/* Latest */}
            <section className="mb-16">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp size={18} className="text-primary" />
                <h2 className="font-heading text-xl font-semibold text-foreground">Latest Arrivals</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {latestProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </section>

            {/* Lookbooks */}
            {featuredLookbooks.length > 0 && (
              <section className="mb-16">
                <div className="flex items-center gap-2 mb-6">
                  <Sparkles size={18} className="text-secondary" />
                  <h2 className="font-heading text-xl font-semibold text-foreground">Curated Lookbooks</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {featuredLookbooks.map(lookbook => (
                    <Link
                      key={lookbook.id}
                      to="#"
                      className="relative group rounded-2xl overflow-hidden bg-muted aspect-[16/9]"
                    >
                      <img
                        src={lookbook.cover_image_url || 'https://placehold.co/800x450/e2e8f0/94a3b8?text=Lookbook'}
                        alt={lookbook.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-6">
                        <h3 className="font-heading text-xl font-bold text-white">{lookbook.title}</h3>
                        {lookbook.subtitle && <p className="text-white/70 text-sm mt-1">{lookbook.subtitle}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </>
  );
}

function ProductCard({ product }: { product: Product }) {
  const { formatPrice } = useCurrency();
  return (
    <Link to={`/product/${product.id}`} className="group block">
      <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-muted">
        <img
          src={product.image_urls?.[0] || 'https://placehold.co/400x600/e2e8f0/94a3b8?text=No+Image'}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <button className="absolute top-3 right-3 p-2 rounded-full bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
          <Heart size={16} className="text-foreground/70" />
        </button>
      </div>
      <div className="mt-3">
        <h3 className="font-medium text-sm text-foreground truncate">{product.name}</h3>
        <p className="text-sm font-semibold text-foreground mt-0.5">
          {product.price ? formatPrice(product.price) : 'Price on request'}
        </p>
      </div>
    </Link>
  );
}
