import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useBuyerDashboard } from '../../hooks/useBuyerDashboard';
import { useCurrency } from '../../contexts/CurrencyContext';
import { Heart, MessageCircle, Compass, Sparkles, Eye, Clock, Users, ArrowRight, RefreshCw } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import type { Tables } from '../../types/supabase';

type Product = Tables<'products'>;

/* ─── Mini skeleton loader ─── */
function CardSkeleton() {
  return (
    <div className="rounded-xl bg-muted animate-pulse h-40" />
  );
}

function LineSkeleton({ w = 'w-24' }: { w?: string }) {
  return (
    <div className={`h-3 rounded bg-muted animate-pulse ${w}`} />
  );
}

/* ─── Product card for trending / recent-views ─── */
function ProductMiniCard({ product }: { product: Product }) {
  const { formatPrice } = useCurrency();
  const image = product.image_urls?.[0];
  return (
    <Link
      to={`/product/${product.id}`}
      className="group flex-shrink-0 w-40 sm:w-44 rounded-xl overflow-hidden border border-border bg-surface hover:shadow-elevation-2 hover:border-gold-300/40 transition-all duration-300 cursor-pointer"
    >
      <div className="aspect-[3/4] bg-ivory-100 overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-charcoal-300">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-xs font-medium text-foreground truncate">{product.name}</p>
        {product.price != null && (
          <p className="text-[11px] text-gold-600 font-semibold mt-0.5">
            {formatPrice(product.price)}
          </p>
        )}
      </div>
    </Link>
  );
}

/* ─── Designer card ─── */
function DesignerCard({ designer }: { designer: Record<string, unknown> }) {
  const brandName = (designer.brand_name as string) || (designer.username as string) || 'Designer';
  const photo = designer.profile_photo_url as string | null;
  const tags = (designer.match_tags as string[]) || [];
  const productCount = (designer.product_count as number) || 0;
  const id = designer.id as string;

  return (
    <Link
      to={`/showroom/${id}`}
      className="group flex items-center gap-3 p-3 rounded-xl bg-surface border border-border hover:border-gold-300/40 hover:shadow-elevation-1 transition-all duration-300 cursor-pointer"
    >
      {photo ? (
        <img src={photo} alt={brandName} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-ivory-200 flex items-center justify-center flex-shrink-0">
          <Users size={16} className="text-charcoal-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{brandName}</p>
        <p className="text-[11px] text-charcoal-400">{productCount} piece{productCount !== 1 ? 's' : ''}</p>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-ivory-100 text-charcoal-500">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      <ArrowRight size={14} className="text-charcoal-300 group-hover:text-gold-500 transition-colors flex-shrink-0" />
    </Link>
  );
}

/* ─── Conversation snippet ─── */
function ConversationCard({ conversation }: { conversation: Record<string, unknown> }) {
  const otherProfile = (conversation.other_profile as Record<string, unknown>) || {};
  const name = (otherProfile.brand_name as string) || (otherProfile.username as string) || 'Designer';
  const photo = otherProfile.profile_photo_url as string | null;
  const lastMessage = (conversation.last_message as string) || 'No messages yet';

  return (
    <Link
      to="/messages"
      className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border hover:border-gold-300/40 transition-all duration-300 cursor-pointer"
    >
      {photo ? (
        <img src={photo} alt={name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
      ) : (
        <div className="w-9 h-9 rounded-full bg-ivory-200 flex items-center justify-center flex-shrink-0">
          <MessageCircle size={14} className="text-charcoal-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{name}</p>
        <p className="text-[11px] text-charcoal-400 truncate">{lastMessage}</p>
      </div>
    </Link>
  );
}

export default function BuyerDashboard() {
  const { profile } = useAuth();
  const {
    conversations,
    loadingConversations,
    savedItems,
    savedLoading,
    recentViews,
    viewsLoading,
    suggestedDesigners,
    designersLoading,
    trendingProducts,
    trendingLoading,
    refresh,
  } = useBuyerDashboard();

  const hasActivity = savedItems.length > 0 || recentViews.length > 0 || suggestedDesigners.length > 0;
  const isLoading = savedLoading || viewsLoading || trendingLoading;
  const firstName = profile?.username?.split(' ')[0] || 'there';

  return (
    <>
      <Helmet>
        <title>Collective — Drapé Collective</title>
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        {/* ─── Header ─── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground">
              Your Collective
            </h1>
            <p className="text-sm text-charcoal-400 mt-1">
              Welcome back, {firstName} ✦
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            className="p-2 rounded-xl text-charcoal-400 hover:text-gold-500 hover:bg-ivory-100 transition-all duration-300 cursor-pointer"
            aria-label="Refresh dashboard"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        {/* ─── Quick links row ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <Link
            to="/saved"
            className="flex items-center gap-2 p-3 rounded-xl bg-surface border border-border hover:border-gold-300/40 hover:shadow-elevation-1 transition-all duration-300 cursor-pointer"
          >
            <Heart size={16} className="text-coral-400" />
            <span className="text-xs font-medium text-foreground">Saved</span>
            {!savedLoading && (
              <span className="ml-auto text-[10px] text-charcoal-400">{savedItems.length}</span>
            )}
          </Link>
          <Link
            to="/messages"
            className="flex items-center gap-2 p-3 rounded-xl bg-surface border border-border hover:border-gold-300/40 hover:shadow-elevation-1 transition-all duration-300 cursor-pointer"
          >
            <MessageCircle size={16} className="text-charcoal-500" />
            <span className="text-xs font-medium text-foreground">Messages</span>
            {!loadingConversations && (
              <span className="ml-auto text-[10px] text-charcoal-400">{conversations.length}</span>
            )}
          </Link>
          <Link
            to="/quiz"
            className="flex items-center gap-2 p-3 rounded-xl bg-surface border border-border hover:border-gold-300/40 hover:shadow-elevation-1 transition-all duration-300 cursor-pointer"
          >
            <Sparkles size={16} className="text-gold-500" />
            <span className="text-xs font-medium text-foreground">Style Quiz</span>
          </Link>
          <Link
            to="/explore"
            className="flex items-center gap-2 p-3 rounded-xl bg-surface border border-border hover:border-gold-300/40 hover:shadow-elevation-1 transition-all duration-300 cursor-pointer"
          >
            <Compass size={16} className="text-charcoal-500" />
            <span className="text-xs font-medium text-foreground">Explore</span>
          </Link>
        </div>

        {isLoading && !hasActivity ? (
          /* ─── Loading state ─── */
          <div className="space-y-8">
            <div>
              <LineSkeleton w="w-32" />
              <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
                {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
              </div>
            </div>
            <div>
              <LineSkeleton w="w-28" />
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        ) : !hasActivity ? (
          /* ─── Onboarding empty state ─── */
          <div className="flex flex-col items-center justify-center py-16 md:py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-ivory-100 flex items-center justify-center mb-4">
              <Sparkles size={28} className="text-gold-400" />
            </div>
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">
              Welcome to the Collective
            </h2>
            <p className="text-sm text-charcoal-400 max-w-md mb-6">
              Start saving pieces you love, take the style quiz, and discover designers
              who match your aesthetic.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/explore"
                className="btn-luxury btn-luxury-primary text-xs !px-6 !py-3"
              >
                Browse Collections
              </Link>
              <Link
                to="/quiz"
                className="btn-luxury btn-luxury-outline text-xs !px-6 !py-3"
              >
                Take Style Quiz
              </Link>
            </div>
          </div>
        ) : (
          /* ─── Dashboard content ─── */
          <div className="space-y-8">
            {/* ─── Trending / Continue Browsing ─── */}
            {trendingProducts.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
                    <Eye size={16} className="text-gold-500" />
                    Continue Browsing
                  </h2>
                  <Link to="/explore" className="text-[11px] text-gold-600 hover:text-gold-700 transition-colors">
                    View all
                  </Link>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
                  {trendingProducts.slice(0, 8).map((product) => (
                    <ProductMiniCard key={product.id} product={product} />
                  ))}
                </div>
              </section>
            )}

            {/* ─── Recent Views ─── */}
            {recentViews.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
                    <Clock size={16} className="text-charcoal-500" />
                    Recently Viewed
                  </h2>
                  {recentViews.length > 5 && (
                    <Link to="/saved" className="text-[11px] text-gold-600 hover:text-gold-700 transition-colors">
                      View all
                    </Link>
                  )}
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
                  {recentViews.slice(0, 6).map((entry) =>
                    entry.product ? (
                      <ProductMiniCard key={entry.id} product={entry.product} />
                    ) : null,
                  )}
                </div>
              </section>
            )}

            {/* ─── Suggested Designers ─── */}
            {suggestedDesigners.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
                    <Users size={16} className="text-charcoal-500" />
                    Designers for You
                  </h2>
                  <Link to="/explore" className="text-[11px] text-gold-600 hover:text-gold-700 transition-colors">
                    Browse all
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {suggestedDesigners.slice(0, 6).map((designer) => (
                    <DesignerCard key={designer.id} designer={designer as unknown as Record<string, unknown>} />
                  ))}
                </div>
              </section>
            )}

            {/* ─── Recent Conversations ─── */}
            {conversations.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
                    <MessageCircle size={16} className="text-gold-500" />
                    Recent Messages
                  </h2>
                  <Link to="/messages" className="text-[11px] text-gold-600 hover:text-gold-700 transition-colors">
                    View all
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {conversations.map((conv) => (
                    <ConversationCard key={conv.id} conversation={conv as unknown as Record<string, unknown>} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </>
  );
}
