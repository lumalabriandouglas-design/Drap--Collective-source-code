import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useUnreadCount } from '../../hooks/useUnreadCount';
import { useRefresh } from '../../contexts/RefreshContext';
import type { Product, ReelsVideo } from '../../types/supabase';
import { Package, Video, BookOpen, Plus, Eye, Share2, Heart, Store, MessageCircle } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import Toast from '../../components/ui/Toast';
import PremiumProfileEditor from '../../components/ui/PremiumProfileEditor';

export default function DesignerDashboard() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const unreadCount = useUnreadCount();
  const { tick: refreshSignal } = useRefresh();
  const [products, setProducts] = useState<Product[]>([]);
  const [reels, setReels] = useState<ReelsVideo[]>([]);
  const [stats, setStats] = useState({ totalViews: 0, totalLikes: 0, productCount: 0 });
  const [loading, setLoading] = useState(true);
  const [toastVisible, setToastVisible] = useState(false);
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [navigating, setNavigating] = useState(false);

  // Safe showroom ID (works whether the column is id or user_id)
  const showroomId = profile?.id || profile?.user_id || user?.id;

  useEffect(() => {
    if (profile) loadDashboard();
  }, [profile, refreshSignal]);

  async function loadDashboard() {
    setLoading(true);
    const { data: productData } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', user!.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    const { data: reelsData } = await supabase
      .from('reels_videos')
      .select('*')
      .eq('user_id', profile!.user_id)
      .order('created_at', { ascending: false });

    setProducts(productData || []);
    setReels(reelsData || []);

    if (productData && productData.length > 0) {
      const productIds = productData.map((p) => p.id);
      const { data: views } = await supabase
        .from('product_views')
        .select('product_id')
        .in('product_id', productIds);
      const { data: likes } = await supabase
        .from('likes')
        .select('product_id')
        .in('product_id', productIds);

      setStats({
        totalViews: views?.length || 0,
        totalLikes: likes?.length || 0,
        productCount: productData.length,
      });
    }
    setLoading(false);
  }

  const handleShareProfile = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!showroomId) return;

    const shareUrl = `${window.location.origin}/showroom/${showroomId}`;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }

    setToastVisible(true);
  };

  const handleNewCollectionPiece = (e: React.MouseEvent) => {
    e.preventDefault();
    if (navigating) return;
    setNavigating(true);
    navigate('/designer/add-product');
  };

  return (
    <>
      <Helmet>
        <title>Designer Studio — Drapé Collective</title>
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-5">
            <div className="shrink-0">
              {profile?.profile_photo_url ? (
                <img
                  src={profile.profile_photo_url}
                  alt={profile.brand_name || profile.username || 'Designer'}
                  className="w-16 h-16 rounded-full object-cover border border-neutral-200 shadow-sm"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-muted border border-neutral-200 shadow-sm flex items-center justify-center">
                  <span className="font-serif text-2xl tracking-tight text-foreground/60">
                    {(profile?.brand_name || profile?.username || 'D').charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <div>
              <h1 className="font-heading text-3xl font-bold text-foreground">Designer Studio</h1>
              <p className="text-foreground/60 mt-1">
                Welcome back, {profile?.brand_name || profile?.username || 'Designer'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleShareProfile}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-foreground/70 font-medium text-sm hover:bg-charcoal-700 hover:text-white hover:border-charcoal-700 transition-all duration-300"
          >
            <Share2 size={18} /> Share Studio Profile
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          <button
            type="button"
            onClick={handleNewCollectionPiece}
            disabled={navigating}
            className="flex items-center gap-2 px-5 py-3 bg-primary text-on-primary font-heading font-bold text-sm rounded-xl hover:opacity-90 transition-all disabled:opacity-50 shadow-sm"
          >
            {navigating ? (
              <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Plus size={18} strokeWidth={2.5} />
            )}
            + New Collection Piece
          </button>

          <button
            type="button"
            onClick={() => setProfileEditorOpen(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl border border-border text-foreground/70 font-medium text-sm hover:bg-muted hover:text-foreground transition-all duration-300"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit Studio Profile
          </button>

          <button
            type="button"
            onClick={() => navigate('/messages')}
            className="flex items-center gap-2 px-5 py-3 rounded-xl border border-border text-foreground/70 font-medium text-sm hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all duration-300 relative"
          >
            <MessageCircle size={18} />
            Open Messages Channel
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gold-500 text-white text-[10px] font-semibold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* FIXED showroom button */}
          <button
            type="button"
            onClick={() => {
              if (showroomId) navigate(`/showroom/${showroomId}`);
            }}
            className="flex items-center gap-2 px-5 py-3 rounded-xl border border-border text-foreground/70 font-medium text-sm hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all duration-300"
          >
            <Store size={18} />
            View My Showroom
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="p-6 rounded-2xl bg-muted">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Package size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.productCount}</p>
                    <p className="text-xs text-foreground/50">Products</p>
                  </div>
                </div>
              </div>
              <div className="p-6 rounded-2xl bg-muted">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                    <Eye size={20} className="text-secondary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.totalViews}</p>
                    <p className="text-xs text-foreground/50">Total Views</p>
                  </div>
                </div>
              </div>
              <div className="p-6 rounded-2xl bg-muted">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Heart size={20} className="text-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.totalLikes}</p>
                    <p className="text-xs text-foreground/50">Total Likes</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
              <Link
                to="/designer/products"
                className="p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all flex items-center gap-3"
              >
                <Package size={20} className="text-primary" />
                <div>
                  <p className="font-medium text-foreground text-sm">Manage Products</p>
                  <p className="text-xs text-foreground/40">{products.length} products</p>
                </div>
              </Link>
              <Link
                to="/designer/lookbooks"
                className="p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all flex items-center gap-3"
              >
                <BookOpen size={20} className="text-secondary" />
                <div>
                  <p className="font-medium text-foreground text-sm">Lookbooks</p>
                  <p className="text-xs text-foreground/40">Curate collections</p>
                </div>
              </Link>
              <Link
                to="/designer/reels"
                className="p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all flex items-center gap-3"
              >
                <Video size={20} className="text-accent" />
                <div>
                  <p className="font-medium text-foreground text-sm">Reels</p>
                  <p className="text-xs text-foreground/40">{reels.length} videos</p>
                </div>
              </Link>
            </div>

            {/* Recent products — now clickable */}
            <div>
              <h2 className="font-heading text-xl font-semibold text-foreground mb-4">Recent Products</h2>
              {products.length === 0 ? (
                <div className="text-center py-12 bg-muted rounded-2xl">
                  <Package size={36} className="mx-auto text-foreground/20 mb-3" />
                  <p className="text-foreground/40">No products yet</p>
                  <Link to="/designer/add-product" className="text-primary text-sm mt-2 inline-block hover:underline">
                    Add your first product
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {products.slice(0, 5).map((product) => (
                    <Link
                      key={product.id}
                      to={`/product/${product.id}`}
                      className="flex items-center gap-4 p-4 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
                    >
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted-foreground/10 flex-shrink-0">
                        <img
                          src={product.image_urls?.[0] || ''}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{product.name}</p>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            product.status === 'published'
                              ? 'bg-green-500/10 text-green-600'
                              : product.status === 'pending'
                              ? 'bg-accent/10 text-accent'
                              : 'bg-destructive/10 text-destructive'
                          }`}
                        >
                          {product.status}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-foreground">
                        {product.price ? formatPrice(product.price) : '—'}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <PremiumProfileEditor open={profileEditorOpen} onClose={() => setProfileEditorOpen(false)} />

        <Toast
          message="Showroom link copied!"
          visible={toastVisible}
          type="success"
          onClose={() => setToastVisible(false)}
        />
      </div>
    </>
  );
}