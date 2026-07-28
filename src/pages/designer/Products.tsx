import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useRefresh } from '../../contexts/RefreshContext';
import type { Product } from '../../types/supabase';
import { Plus, Edit, Eye, Trash2, EyeOff, RotateCcw } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

export default function DesignerProducts() {
  const { profile, user } = useAuth();
  const { formatPrice } = useCurrency();
  const { triggerRefresh } = useRefresh();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (profile) loadProducts();
  }, [profile]);

  async function loadProducts() {
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', user!.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });
    setProducts(data || []);
    setLoading(false);
  }

  async function toggleHidden(product: Product) {
    await supabase.from('products').update({ is_hidden: !product.is_hidden }).eq('id', product.id);
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_hidden: !p.is_hidden } : p));
  }

  /* ───── Soft-delete with confirmation ───── */

  function requestDelete(productId: string) {
    setConfirmDelete(productId);
  }

  function cancelDelete() {
    setConfirmDelete(null);
  }

  async function executeDelete() {
    if (!confirmDelete) return;
    setDeleting(confirmDelete);
    setConfirmDelete(null);

    // Soft-delete: update is_deleted flag instead of hard DELETE
    const { error } = await supabase
      .from('products')
      .update({ is_deleted: true })
      .eq('id', confirmDelete)
      .eq('user_id', user!.id);

    setDeleting(null);

    if (error) {
      console.error('[Delete Product] Failed:', error.message);
      alert('Something went wrong. Please try again.');
      return;
    }

    // Optimistically remove from local state — instant UI update without refetch
    setProducts(prev => prev.filter(p => p.id !== confirmDelete));

    // Signal Dashboard stats & HeroSlider to refetch globally
    triggerRefresh();
  }

  return (
    <>
      <Helmet><title>My Products — Drapé Collective</title></Helmet>

      {/* ─── Confirmation Modal ─── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-xl max-w-sm w-full mx-4 p-6">
            <h2 className="font-heading text-lg font-bold text-foreground">Delete this piece?</h2>
            <p className="text-foreground/60 text-sm mt-2 leading-relaxed">
              Are you sure you want to permanently delete this piece? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 text-sm font-medium text-foreground/70 hover:text-foreground rounded-lg hover:bg-muted transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                className="px-4 py-2 text-sm font-semibold text-white bg-destructive rounded-lg hover:opacity-90 transition-all cursor-pointer"
              >
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-heading text-3xl font-bold text-foreground">My Products</h1>
          <Link to="/designer/add-product" className="flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-xl font-medium text-sm hover:opacity-90 transition-all">
            <Plus size={18} /> Add Product
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 bg-muted rounded-2xl">
            <p className="text-foreground/40 text-lg">No products yet</p>
            <p className="text-foreground/30 text-sm mt-1">Add your first design to showcase your work</p>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map(product => (
              <div key={product.id} className="flex items-center gap-4 p-4 rounded-xl bg-muted hover:bg-muted/80 transition-all">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted-foreground/10 flex-shrink-0">
                  <img src={product.image_urls?.[0] || ''} alt={product.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{product.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      product.status === 'published' ? 'bg-green-500/10 text-green-600' :
                      product.status === 'pending' ? 'bg-accent/10 text-accent' :
                      'bg-destructive/10 text-destructive'
                    }`}>
                      {product.status}
                    </span>
                    <span className="text-xs text-foreground/40">{product.category || 'Uncategorized'}</span>
                  </div>
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {product.price ? formatPrice(product.price) : '—'}
                </span>
                <div className="flex items-center gap-1">
                  <Link to={`/product/${product.id}`} className="p-2 rounded-lg hover:bg-background transition-colors" title="View">
                    <Eye size={16} className="text-foreground/50" />
                  </Link>
                  <Link to={`/designer/add-product?id=${product.id}`} className="p-2 rounded-lg hover:bg-background transition-colors" title="Edit">
                    <Edit size={16} className="text-foreground/50" />
                  </Link>
                  <button
                    onClick={() => toggleHidden(product)}
                    className="p-2 rounded-lg hover:bg-background transition-colors cursor-pointer"
                    title={product.is_hidden ? 'Make visible' : 'Hide from public'}
                  >
                    {product.is_hidden ? (
                      <RotateCcw size={16} className="text-accent" />
                    ) : (
                      <EyeOff size={16} className="text-foreground/50" />
                    )}
                  </button>
                  <button
                    onClick={() => requestDelete(product.id)}
                    disabled={deleting === product.id}
                    className="p-2 rounded-lg hover:bg-background transition-colors cursor-pointer disabled:opacity-30"
                    title="Delete"
                  >
                    {deleting === product.id ? (
                      <span className="block w-4 h-4 rounded-full border-2 border-destructive border-t-transparent animate-spin" />
                    ) : (
                      <Trash2 size={16} className="text-destructive/70" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}