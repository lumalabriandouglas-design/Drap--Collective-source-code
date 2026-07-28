import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import type { Product } from '../../types/supabase';
import { Heart, Trash2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

export default function Saved() {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadSaved();
  }, [user]);
  async function loadSaved() {
    setLoading(true);
    const { data: savedItems } = await supabase
      .from('saved_items')
      .select('product_id')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });

    if (savedItems && savedItems.length > 0) {
      const ids = savedItems.map(s => s.product_id);
      const { data } = await supabase
        .from('products')
        .select('*')
        .in('id', ids)
        .eq('is_hidden', false);
      setProducts(data || []);
    }
    setLoading(false);
  }

  async function removeSaved(productId: string) {
    if (!user) return;
    await supabase.from('saved_items').delete().eq('user_id', user.id).eq('product_id', productId);
    setProducts(prev => prev.filter(p => p.id !== productId));
  }

  return (
    <>
      <Helmet>
        <title>Saved — Drapé Collective</title>
      </Helmet>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-2 mb-8">
          <Heart size={22} className="text-primary" />
          <h1 className="font-heading text-3xl font-bold text-foreground">Saved Items</h1>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <Heart size={48} className="mx-auto text-foreground/20 mb-4" />
            <p className="text-foreground/40 text-lg">No saved items yet</p>
            <Link to="/explore" className="text-primary mt-2 inline-block hover:underline">Discover pieces to save</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {products.map(product => (
              <div key={product.id} className="group relative">
                <Link to={`/product/${product.id}`} className="block">
                  <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-muted">
                    <img
                      src={product.image_urls?.[0] || 'https://placehold.co/400x600/e2e8f0/94a3b8?text=No+Image'}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>
                  <div className="mt-3">
                    <h3 className="font-medium text-sm text-foreground truncate">{product.name}</h3>
                    <p className="text-sm font-semibold text-foreground mt-0.5">
                      {product.price ? formatPrice(product.price) : 'Price on request'}
                    </p>
                  </div>
                </Link>
                <button
                  onClick={() => removeSaved(product.id)}
                  className="absolute top-3 right-3 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-destructive/10 transition-all cursor-pointer"
                >
                  <Trash2 size={14} className="text-destructive" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
