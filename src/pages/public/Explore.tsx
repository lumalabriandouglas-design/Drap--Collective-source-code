import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useCurrency } from '../../contexts/CurrencyContext';
import type { Product, Profile } from '../../types/supabase';
import { Heart, Grid, List, SlidersHorizontal } from 'lucide-react';
import SEOHead from '../../components/ui/SEOHead';

const categories = ['All', 'Reels', 'Lookbooks', 'Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Accessories', 'Footwear', 'Streetwear', 'Sustainable'] as const;
const comingSoonCategories = new Set(['Reels', 'Lookbooks']);

export default function Explore() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<(Product & { designer?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeCategory, setActiveCategory] = useState('All');
  const { formatPrice } = useCurrency();
  const query = searchParams.get('q') || '';
  const isComingSoonCategory = comingSoonCategories.has(activeCategory);
  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, query]);

  async function loadProducts() {
    setLoading(true);
    let q = supabase
      .from('products')
      .select('*, designer:user_id!inner(username, brand_name, profile_photo_url)')
      .eq('status', 'published')
      .eq('is_hidden', false)
      .eq('is_deleted', false)
      .eq('designer.is_suspended', false)
      .order('created_at', { ascending: false });

    if (activeCategory !== 'All' && !isComingSoonCategory) {
      q = q.eq('category', activeCategory.toLowerCase());
    }
    if (query) {
      q = q.or(`name.ilike.%${query}%,description.ilike.%${query}%,tags.cs.{${query}}`);
    }

    const { data, error } = await q;
    if (error) {
      console.error('Explore query failed:', error.message);
    }
    setProducts(data || []);
    setLoading(false);
  }

  const canonicalUrl = `${window.location.origin}/explore`;
  const pageTitle = activeCategory === 'All' ? 'Explore' : `${activeCategory} — Explore`;

  return (
    <>
      <SEOHead
        title={pageTitle}
        description="Discover exceptional fashion, consciously curated. Browse independent designers' collections across ready-to-wear, streetwear, accessories, and sustainable fashion on Drapé Collective."
        canonicalUrl={canonicalUrl}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-heading text-3xl font-bold text-charcoal-700">Explore</h1>
            <p className="text-charcoal-300 text-sm mt-1 tracking-wide">Discover exceptional fashion, consciously curated</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all duration-300 cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-charcoal-700/10 text-charcoal-700'
                  : 'text-charcoal-300 hover:text-charcoal-500 hover:bg-charcoal-50'
              }`}
              aria-label="Grid view"
            >
              <Grid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all duration-300 cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-charcoal-700/10 text-charcoal-700'
                  : 'text-charcoal-300 hover:text-charcoal-500 hover:bg-charcoal-50'
              }`}
              aria-label="List view"
            >
              <List size={18} />
            </button>
          </div>
        </div>

        {/* Category filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none" role="tablist" aria-label="Filter by category">
          {categories.map(cat => (
            <button
              key={cat}
              role="tab"
              aria-selected={activeCategory === cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all duration-300 cursor-pointer ${
                activeCategory === cat
                  ? 'bg-charcoal-700 text-white shadow-elevation-1'
                  : 'bg-ivory-100 text-charcoal-400 hover:bg-charcoal-100 hover:text-charcoal-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products */}
        {loading ? (
          <div className="masonry-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-ivory-100 animate-pulse" />
            ))}
          </div>
        ) : isComingSoonCategory ? (
          <div className="flex flex-col items-center justify-center py-24 animate-empty-in">
            <div className="w-16 h-16 rounded-full bg-ivory-100 flex items-center justify-center mb-5">
              <SlidersHorizontal size={22} className="text-charcoal-300" />
            </div>
            <p className="font-heading text-xl text-charcoal-500 mb-2">Coming Soon</p>
            <p className="text-sm text-charcoal-300 mb-6">
              This feature isn't available yet — check back soon.
            </p>
            <button
              onClick={() => setActiveCategory('All')}
              className="px-6 py-2.5 bg-charcoal-700 text-white text-sm font-medium rounded-full hover:bg-charcoal-800 transition-all duration-300 cursor-pointer"
            >
              Browse All Products
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 animate-empty-in">
            <div className="w-16 h-16 rounded-full bg-ivory-100 flex items-center justify-center mb-5">
              <SlidersHorizontal size={22} className="text-charcoal-300" />
            </div>
            <p className="font-heading text-xl text-charcoal-500 mb-2">No pieces available under this collection drop yet.</p>
            <p className="text-sm text-charcoal-300">
              {query ? 'Try adjusting your search terms.' : 'Check back soon for new arrivals.'}
            </p>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'masonry-grid' : 'space-y-4'}>
            {products.map((product, index) => (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                className={`group block ${
                  viewMode === 'list'
                    ? 'flex gap-5 p-4 rounded-2xl hover:bg-ivory-50 transition-all duration-300'
                    : 'card-luxury'
                }`}
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div className={viewMode === 'list'
                  ? 'w-32 h-32 flex-shrink-0 rounded-xl overflow-hidden'
                  : 'relative aspect-[3/4] overflow-hidden bg-ivory-100'
                }>
                  <img
                    src={product.image_urls?.[0] || 'https://placehold.co/400x600/e2e8f0/94a3b8?text=No+Image'}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    loading="lazy"
                  />
                  <button
                    className="absolute top-3 right-3 p-2 rounded-full bg-white/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer hover:bg-white"
                    onClick={(e) => { e.preventDefault(); }}
                    aria-label="Like this piece"
                  >
                    <Heart size={16} className="text-charcoal-400 hover:text-coral-400 transition-colors duration-300" />
                  </button>
                </div>
                <div className={viewMode === 'list' ? 'flex-1 flex flex-col justify-center px-2' : 'p-4'}>
                  <h3 className="font-serif text-sm font-medium text-charcoal-700 truncate line-clamp-2">{product.name}</h3>
                  <p className="text-xs text-charcoal-300 mt-1 tracking-wide">
                    {product.designer && 'brand_name' in product.designer
                      ? (product.designer as unknown as Profile).brand_name || 'Independent Designer'
                      : 'Independent Designer'}
                  </p>
                  <div className="gold-divider my-2" />
                  <p className="text-sm font-medium text-charcoal-700">
                    {product.price ? formatPrice(product.price) : 'Price on request'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}