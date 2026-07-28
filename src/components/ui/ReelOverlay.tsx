import { Link, useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useLikes } from '../../hooks/useLikes';
import { useAuth } from '../../contexts/AuthContext';

interface ReelOverlayProps {
  reelId: string;
  caption: string | null;
  designerId: string;
}

/**
 * Strict video-feed overlay.
 *
 * Binds exclusively to reel-native columns:
 *   caption  →  the primary text element
 *   reelId   →  like target (reel identity, not a product)
 *
 * No marketplace cross-contamination — no price, no product link,
 * no "View Details" chip.
 */
export default function ReelOverlay({
  reelId,
  caption,
  designerId,
}: ReelOverlayProps) {
  const { user } = useAuth();
  const { liked, likeCount, toggleLike } = useLikes(reelId);
  const navigate = useNavigate();

  const handleLike = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (!user) {
      navigate('/login?redirect=/reels');
      return;
    }
    toggleLike();
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Dark gradient at bottom so text is readable */}
      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

      {/* ── Left side: Caption text ── */}
      <div className="absolute bottom-6 left-4 right-20 z-10 pointer-events-auto">
        {caption && (
          <p className="text-white/90 text-base font-serif font-medium leading-snug">
            {caption}
          </p>
        )}

        {/* Designer link — kept minimal, no photo to avoid profile-table fetch */}
        <Link
          to={`/designers/${designerId}`}
          className="inline-block mt-3 text-white/50 text-[11px] font-light tracking-wider uppercase hover:text-white/80 transition-colors"
        >
          @designer
        </Link>
      </div>

      {/* ── Right side: Like button ── */}
      <div className="absolute bottom-24 right-3 z-10 pointer-events-auto">
        <button
          onClick={handleLike}
          className="flex flex-col items-center gap-0.5"
          aria-label={liked ? 'Unlike this reel' : 'Like this reel'}
        >
          <div
            className={`w-11 h-11 flex items-center justify-center rounded-full backdrop-blur-sm transition-all duration-300 ${
              liked
                ? 'bg-coral-500/80 text-white scale-110'
                : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
            }`}
          >
            <Heart
              size={22}
              className={`transition-all duration-[350ms] ${
                liked ? 'fill-white scale-110' : 'fill-transparent'
              }`}
              strokeWidth={liked ? 2.2 : 1.5}
            />
          </div>
          {likeCount > 0 && (
            <span className="text-white/80 text-[10px] font-semibold tabular-nums">
              {likeCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
