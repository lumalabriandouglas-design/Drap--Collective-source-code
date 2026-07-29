import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useCurrency } from '../../contexts/CurrencyContext';
import type { Product, Profile } from '../../types/supabase';
import { Grid, List, SlidersHorizontal } from 'lucide-react';
import SEOHead from '../../components/ui/SEOHead';
import ProductCard from '../../components/ui/ProductCard';

const CATEGORIES = [
  'All',
  'Ready-to-Wear',
  'Outerwear',
  'Accessories',
  'Knitwear',
  'Evening',
  'Avant-Garde',
  'Denim',
  'Other',
] as const;

export default function Explore() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<(Product & { designer?: Profile | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeCategory, setActiveCategory] = useState('All');
  const { formatPrice } = useCurrency();
  const query = searchParams.get('q') || '';

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, query]);

  async function loadProducts() {
    setLoading(true);
    try {
      // Simple, reliable query — no fragile !inner join
      let q = supabase
        .from('products')
        .select('*')
        .eq('status', 'published')
        .eq('is_hidden', false)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (activeCategory !== 'All') {
        q = q.eq('category', activeCategory);
      }

      if (query.trim()) {
        q = q.or(
          `name.ilike.%${query.trim()}%,description.ilike.%${query.trim()}%`
        );
      }

      const { data: productData, error } = await q;

      if (error) {
        console.error('Explore query failed:', error.message);
        setProducts([]);
        setLoading(false);
        return;
      }

      const list = productData || [];

      // Fetch designers in one go
      const designerIds = [...new Set(list.map((p) => p.user_id).filter(Boolean))];
      let designerMap = new Map<string, Profile>();

      if (designerIds.length > 0) {
        const { data: designers } = await supabase
          .from('profiles')
          .select('*')
          .in('id', designerIds)
          .eq('is_suspended', false);

        designerMap = new Map((designers || []).map((d) => [d.id, d as Profile]));
      }

      // Attach designer + filter out suspended
      const withDesigners = list
        .map((p) => ({
          ...p,
          designer: designerMap.get(p.user_id) || null,
        }))
        .filter((p) => {
          // Keep product if designer not found OR not suspended
          // (designerMap only has non-suspended)
          return !p.user_id || designerMap.has(p.user_id) || !designerIds.includes(p.user_id);
        });

      // Prefer products whose designer loaded successfully
      const filtered = withDesigners.filter((p) => {
        if (!p.user_id) return true;
        const d = designerMap.get(p.user_id);
        // If we fetched designers and this one is missing, they were suspended
        if (designerIds.includes(p.user_id) && !d) return false;
        return true;
      });

      setProducts(filtered);
    } catch (err) {
      console.error('Explore load error:', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <SEOHead
        title={activeCategory === 'All' ? 'Browse' : `${activeCategory} — Browse`}
        description="Discover exceptional fashion from emerging designers on Drapé Collective."
        canonicalUrl={`${window.location.origin}/browse`}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-[10px] tracking-[0.25em] uppercase text-gold-500 font-medium mb-1.5">
              The Collective
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl font-medium text-charcoal-800">
              Browse
            </h1>
            <p className="text-charcoal-400 text-sm mt-1.5 font-light">
              Exceptional pieces, consciously curated
            </p>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-2.5 rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-charcoal-800 text-white'
                  : 'text-charcoal-400 hover:text-charcoal-600 hover:bg-ivory-100'
              }`}
              aria-label="Grid view"
            >
              <Grid size={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-2.5 rounded-lg transition-all ${
                viewMode === 'list'
                  ? 'bg-charcoal-800 text-white'
                  : 'text-charcoal-400 hover:text-charcoal-600 hover:bg-ivory-100'
              }`}
              aria-label="List view"
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {/* Categories */}
        <div
          className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none -mx-4 px-4"
          role="tablist"
        >
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={activeCategory === cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 px-5 py-2 text-xs font-medium tracking-[0.06em] rounded-full transition-all ${
                activeCategory === cat
                  ? 'bg-charcoal-800 text-white'
                  : 'bg-ivory-100 text-charcoal-400 hover:bg-ivory-200 hover:text-charcoal-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-5 sm:gap-y-10">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-xl bg-ivory-100 animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && products.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-full bg-ivory-100 flex items-center justify-center mb-5">
              <SlidersHorizontal size={20} className="text-charcoal-300" />
            </div>
            <p className="font-serif text-xl text-charcoal-600 mb-2">No pieces yet</p>
            <p className="text-sm text-charcoal-400 max-w-xs">
              {query
                ? 'Try a different search.'
                : activeCategory !== 'All'
                  ? `Nothing in ${activeCategory} right now. Try another category.`
                  : 'New pieces will appear here as designers publish.'}
            </p>
            {activeCategory !== 'All' && (
              <button
                type="button"
                onClick={() => setActiveCategory('All')}
                className="mt-6 px-6 py-2.5 bg-charcoal-800 text-white text-xs tracking-[0.1em] uppercase rounded-full hover:bg-charcoal-900 transition-all"
              >
                View all
              </button>
            )}
          </div>
        )}

        {/* Grid */}
        {!loading && products.length > 0 && viewMode === 'grid' && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-5 sm:gap-y-10">
            {products.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>
        )}

        {/* List */}
        {!loading && products.length > 0 && viewMode === 'list' && (
          <div className="space-y-3">
            {products.map((product) => (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                className="flex gap-5 p-4 rounded-xl hover:bg-ivory-50 transition-all group"
              >
                <div className="w-24 h-32 sm:w-28 sm:h-36 flex-shrink-0 rounded-lg overflow-hidden bg-ivory-100">
                  <img
                    src={product.image_urls?.[0] || ''}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                </div>
                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <p className="text-[11px] tracking-[0.08em] uppercase text-charcoal-400 font-medium mb-1 truncate">
                    {product.designer?.brand_name ||
                      product.designer?.username ||
                      'Independent Designer'}
                  </p>
                  <h3 className="font-serif text-base font-medium text-charcoal-800 truncate">
                    {product.name}
                  </h3>
                  <p className="text-sm font-medium text-charcoal-700 mt-2">
                    {product.price != null ? formatPrice(product.price) : 'Price on request'}
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