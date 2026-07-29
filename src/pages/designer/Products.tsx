import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useRefresh } from '../../contexts/RefreshContext';
import type { Product } from '../../types/supabase';
import { Plus, Pencil, Eye, Trash2, EyeOff, Eye as EyeIcon } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

export default function DesignerProducts() {
  const { profile, user } = useAuth();
  const { formatPrice } = useCurrency();
  const { triggerRefresh } = useRefresh();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // products.user_id references profiles.id
  const ownerId = profile?.id || user?.id;

  useEffect(() => {
    if (ownerId) loadProducts();
  }, [ownerId]);

  async function loadProducts() {
    if (!ownerId) return;
    setLoading(true);

    // Try profile.id first (correct FK), fallback to auth user id
    let { data } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', ownerId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if ((!data || data.length === 0) && user?.id && user.id !== ownerId) {
      const fallback = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });
      data = fallback.data;
    }

    setProducts(data || []);
    setLoading(false);
  }

  async function toggleHidden(product: Product) {
    const next = !product.is_hidden;
    await supabase.from('products').update({ is_hidden: next }).eq('id', product.id);
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, is_hidden: next } : p))
    );
    triggerRefresh();
  }

  function requestDelete(productId: string) {
    setConfirmDelete(productId);
  }

  function cancelDelete() {
    setConfirmDelete(null);
  }

  async function executeDelete() {
    if (!confirmDelete || !user?.id) return;
    setDeleting(confirmDelete);
    setConfirmDelete(null);

    const { error } = await supabase
      .from('products')
      .update({ is_deleted: true })
      .eq('id', confirmDelete);

    setDeleting(null);

    if (error) {
      console.error('[Delete Product]', error.message);
      return;
    }

    setProducts((prev) => prev.filter((p) => p.id !== confirmDelete));
    triggerRefresh();
  }

  const statusStyle = (status: string) => {
    if (status === 'published') return 'bg-emerald-50 text-emerald-700';
    if (status === 'pending') return 'bg-amber-50 text-amber-700';
    return 'bg-red-50 text-red-600';
  };

  return (
    <>
      <Helmet>
        <title>My Pieces — Drapé Collective</title>
      </Helmet>

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h2 className="font-serif text-xl text-charcoal-800">Remove this piece?</h2>
            <p className="text-charcoal-500 text-sm mt-2 leading-relaxed">
              It will be hidden from your showroom and the collective. You won’t be able to undo this easily.
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={cancelDelete}
                className="px-4 py-2 text-sm text-charcoal-500 hover:text-charcoal-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDelete}
                className="px-5 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-[10px] tracking-[0.25em] uppercase text-gold-500 font-medium mb-1.5">
              Studio
            </p>
            <h1 className="font-serif text-3xl font-medium text-charcoal-800">My Pieces</h1>
            <p className="text-sm text-charcoal-400 mt-1">
              {loading ? '…' : `${products.length} ${products.length === 1 ? 'piece' : 'pieces'}`}
            </p>
          </div>
          <Link
            to="/designer/add-product"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-charcoal-800 text-white text-xs tracking-[0.12em] uppercase font-medium rounded-full hover:bg-charcoal-900 transition-colors"
          >
            <Plus size={16} strokeWidth={2.5} />
            New piece
          </Link>
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-ivory-100 animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && products.length === 0 && (
          <div className="text-center py-20 rounded-2xl border border-dashed border-border">
            <div className="w-14 h-14 rounded-full bg-ivory-100 flex items-center justify-center mx-auto mb-4">
              <Plus size={22} className="text-charcoal-300" />
            </div>
            <p className="font-serif text-xl text-charcoal-700 mb-1">No pieces yet</p>
            <p className="text-sm text-charcoal-400 mb-6">
              Add your first design — it only takes a minute.
            </p>
            <Link
              to="/designer/add-product"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-charcoal-800 text-white text-xs tracking-[0.12em] uppercase rounded-full hover:bg-charcoal-900 transition-colors"
            >
              Add your first piece
            </Link>
          </div>
        )}

        {/* List */}
        {!loading && products.length > 0 && (
          <div className="space-y-2">
            {products.map((product) => (
              <div
                key={product.id}
                className={`flex items-center gap-4 p-3 sm:p-4 rounded-xl border border-border/60 bg-white hover:border-charcoal-200 transition-all ${
                  product.is_hidden ? 'opacity-60' : ''
                }`}
              >
                {/* Thumbnail */}
                <Link
                  to={`/product/${product.id}`}
                  className="w-16 h-20 sm:w-18 sm:h-22 rounded-lg overflow-hidden bg-ivory-100 flex-shrink-0"
                >
                  {product.image_urls?.[0] ? (
                    <img
                      src={product.image_urls[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="font-serif text-lg text-charcoal-300">
                        {(product.name?.charAt(0) || 'D').toUpperCase()}
                      </span>
                    </div>
                  )}
                </Link>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/product/${product.id}`}
                    className="font-medium text-sm sm:text-base text-charcoal-800 truncate block hover:text-charcoal-600"
                  >
                    {product.name}
                  </Link>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <span
                      className={`text-[10px] tracking-wide uppercase px-2 py-0.5 rounded-full font-medium ${statusStyle(
                        product.status
                      )}`}
                    >
                      {product.status}
                    </span>
                    {product.is_hidden && (
                      <span className="text-[10px] tracking-wide uppercase px-2 py-0.5 rounded-full bg-charcoal-100 text-charcoal-500 font-medium">
                        Hidden
                      </span>
                    )}
                    {product.category && (
                      <span className="text-xs text-charcoal-400">{product.category}</span>
                    )}
                  </div>
                </div>

                {/* Price */}
                <span className="hidden sm:block text-sm font-medium text-charcoal-700 tabular-nums">
                  {product.price != null ? formatPrice(product.price) : '—'}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-0.5">
                  <Link
                    to={`/product/${product.id}`}
                    className="p-2.5 rounded-lg text-charcoal-400 hover:text-charcoal-700 hover:bg-ivory-50 transition-colors"
                    title="View"
                  >
                    <Eye size={16} />
                  </Link>
                  <Link
                    to={`/designer/add-product?id=${product.id}`}
                    className="p-2.5 rounded-lg text-charcoal-400 hover:text-charcoal-700 hover:bg-ivory-50 transition-colors"
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </Link>
                  <button
                    type="button"
                    onClick={() => toggleHidden(product)}
                    className="p-2.5 rounded-lg text-charcoal-400 hover:text-charcoal-700 hover:bg-ivory-50 transition-colors"
                    title={product.is_hidden ? 'Show publicly' : 'Hide from public'}
                  >
                    {product.is_hidden ? <EyeIcon size={16} /> : <EyeOff size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => requestDelete(product.id)}
                    disabled={deleting === product.id}
                    className="p-2.5 rounded-lg text-charcoal-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                    title="Remove"
                  >
                    {deleting === product.id ? (
                      <span className="block w-4 h-4 rounded-full border-2 border-red-400 border-t-transparent animate-spin" />
                    ) : (
                      <Trash2 size={16} />
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