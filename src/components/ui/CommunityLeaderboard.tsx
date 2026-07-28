import { useCommunityPulse } from '../../hooks/useCommunityPulse';
import { Link } from 'react-router-dom';
import { Trophy, Sparkles, Heart } from 'lucide-react';

export default function CommunityLeaderboard() {
  const { designerOfMonth, outfitOfMonth, loading } = useCommunityPulse();

  if (loading) {
    return (
      <section className="py-24 md:py-32 px-4 bg-bg">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center gap-3">
            <div className="w-6 h-6 border border-gold-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs tracking-widest uppercase text-charcoal-300">Loading community pulse…</p>
          </div>
        </div>
      </section>
    );
  }

  /* ── Graceful hide when no data at all ── */
  const hasData = designerOfMonth || outfitOfMonth;
  if (!hasData) return null;

  return (
    <section className="py-24 md:py-32 px-4 bg-[#FAF8F5] relative overflow-hidden">
      {/* Decorative background circle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[radial-gradient(ellipse_at_center,var(--color-gold-100)_0%,transparent_60%)] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase text-gold-500 font-medium">
            <Trophy size={14} />
            Community Pulse
          </span>
          <h2 className="mt-3 text-3xl md:text-4xl font-serif text-charcoal-700">
            This Month's <span className="italic text-gold-500">Favorites</span>
          </h2>
          <p className="mt-2 text-sm text-charcoal-400 font-light max-w-lg mx-auto">
            Celebrating the designer and piece that captured the community's heart this month.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          {/* ─── Designer of the Month ─── */}
          {designerOfMonth && (
            <Link
              to={`/designers/${designerOfMonth.designer_id}`}
              className="group relative bg-surface border border-border-light rounded-3xl p-8 md:p-10 transition-all duration-500 hover:border-gold-300/60 hover:-translate-y-1 hover:shadow-[0_8px_30px_-4px_rgba(212,175,55,0.20)] cursor-pointer"
            >
              {/* Gold badge */}
              <div className="absolute -top-3 -right-3 w-14 h-14 bg-gradient-to-br from-gold-300 to-gold-500 rounded-full flex items-center justify-center shadow-lg shadow-gold-500/20 ring-4 ring-surface z-10 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                <Trophy size={22} className="text-white drop-shadow-sm" />
              </div>

              <div className="flex items-center gap-5">
                <div className="relative shrink-0">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden bg-ivory-100 ring-2 ring-gold-200/50 transition-all duration-500 group-hover:ring-4 group-hover:ring-gold-300/60">
                    {designerOfMonth.profile_photo_url ? (
                      <img
                        src={designerOfMonth.profile_photo_url}
                        alt={designerOfMonth.brand_name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-charcoal-200">
                        <Sparkles size={28} />
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-gold-400 rounded-full flex items-center justify-center ring-2 ring-surface transition-transform duration-300 group-hover:scale-110">
                    <span className="text-[10px] font-bold text-white">#1</span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] tracking-[0.15em] uppercase text-gold-500 font-medium">Designer of the Month</p>
                  <h3 className="mt-1 text-xl md:text-2xl font-serif text-charcoal-700 group-hover:text-gold-600 transition-colors">
                    {designerOfMonth.brand_name || designerOfMonth.username || 'Independent Designer'}
                  </h3>
                  <div className="mt-2 flex items-center gap-4 text-xs text-charcoal-400">
                    <span className="inline-flex items-center gap-1">
                      <Heart size={12} className="text-coral-400" />
                      {designerOfMonth.total_likes} <span className="text-charcoal-300">likes</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="M21 15l-5-5L5 21" />
                      </svg>
                      {designerOfMonth.products_count} pieces
                    </span>
                  </div>
                </div>
              </div>

              {/* Hover hint */}
              <div className="mt-5 pt-3 border-t border-border-light opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span className="text-[10px] tracking-[0.2em] uppercase text-gold-500 font-medium">
                  View Profile →
                </span>
              </div>
            </Link>
          )}

          {/* ─── Outfit of the Month ─── */}
          {outfitOfMonth && (
            <Link
              to={`/designers/${outfitOfMonth.designer_id}`}
              className="group relative bg-surface border border-border-light rounded-3xl p-8 md:p-10 transition-all duration-500 hover:border-gold-300/60 hover:-translate-y-1 hover:shadow-[0_8px_30px_-4px_rgba(212,175,55,0.20)] cursor-pointer"
            >
              {/* Gold badge */}
              <div className="absolute -top-3 -right-3 w-14 h-14 bg-gradient-to-br from-gold-300 to-gold-500 rounded-full flex items-center justify-center shadow-lg shadow-gold-500/20 ring-4 ring-surface z-10 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                <Sparkles size={22} className="text-white drop-shadow-sm" />
              </div>

              <div className="flex items-center gap-5">
                <div className="relative shrink-0">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden bg-ivory-100 ring-2 ring-gold-200/50 transition-all duration-500 group-hover:ring-4 group-hover:ring-gold-300/60">
                    {outfitOfMonth.product_image_url ? (
                      <img
                        src={outfitOfMonth.product_image_url}
                        alt={outfitOfMonth.product_name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-charcoal-200">
                        <Sparkles size={28} />
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-gold-400 rounded-full flex items-center justify-center ring-2 ring-surface transition-transform duration-300 group-hover:scale-110">
                    <span className="text-[10px] font-bold text-white">#1</span>
                  </div>
                </div>
                <div className="min-w-0 pr-10 md:pr-12">
                  <p className="text-[10px] tracking-[0.15em] uppercase text-gold-500 font-medium">Outfit of the Month</p>
                  <h3 className="mt-1 text-xl md:text-2xl font-serif text-charcoal-700 truncate group-hover:text-gold-600 transition-colors">
                    {outfitOfMonth.product_name}
                  </h3>
                  <p className="mt-0.5 text-xs text-charcoal-400">
                    by {outfitOfMonth.brand_name || outfitOfMonth.username || 'Independent Designer'}
                  </p>
                  <div className="mt-2 flex items-center gap-1 text-xs text-charcoal-400">
                    <span className="inline-flex items-center gap-1">
                      <Heart size={12} className="text-coral-400" />
                      {outfitOfMonth.likes_count} <span className="text-charcoal-300">likes</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Hover hint */}
              <div className="mt-5 pt-3 border-t border-border-light opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span className="text-[10px] tracking-[0.2em] uppercase text-gold-500 font-medium">
                  View Designer Profile →
                </span>
              </div>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}