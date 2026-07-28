import { useLikes } from '../../hooks/useLikes';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';

interface LikeButtonProps {
  productId: string;
  /** Optional size variant */
  size?: 'sm' | 'md' | 'lg';
  /** When true, shows a compact row layout */
  compact?: boolean;
}

export default function LikeButton({ productId, size = 'md', compact = false }: LikeButtonProps) {
  const { user } = useAuth();
  const { liked, likeCount, toggleLike } = useLikes(productId);
  const navigate = useNavigate();

  const handleClick = () => {
    if (!user) {
      navigate(`/login?redirect=/products/${productId}`);
      return;
    }
    toggleLike();
  };

  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizeMap = {
    sm: 14,
    md: 16,
    lg: 20,
  };

  const textSize = size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-sm' : 'text-xs';

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`
        group inline-flex items-center gap-1.5
        rounded-full transition-all duration-300
        ${compact ? 'px-2.5 py-1.5' : sizeMap[size] + ' justify-center'}
        ${
          liked
            ? 'text-coral-500 bg-coral-50/50 hover:bg-coral-100/80'
            : 'text-charcoal-300 hover:text-coral-400 bg-surface/0 hover:bg-coral-50/30'
        }
        cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-300
      `}
      aria-label={liked ? 'Unlike this piece' : 'Like this piece'}
    >
      <Heart
        size={iconSizeMap[size]}
        className={`
          transition-all duration-[350ms] ease-out
          ${
            liked
              ? 'fill-coral-500 scale-110 drop-shadow-sm'
              : 'fill-transparent group-hover:scale-105'
          }
        `}
        strokeWidth={liked ? 2.2 : 1.5}
      />
      {likeCount > 0 && (
        <span
          className={`font-medium tracking-tight tabular-nums ${textSize} ${
            liked ? 'text-coral-600' : 'text-charcoal-400'
          }`}
        >
          {likeCount}
        </span>
      )}
    </button>
  );
}