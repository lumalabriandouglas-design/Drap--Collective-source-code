import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

/**
 * useLikes — Provides per-product like state, toggle, and live like count.
 * Enforces one-like-per-user-per-product at both the app and DB level
 * (unique constraint on likes.user_id + likes.product_id).
 */
export function useLikes(productId: string | undefined) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // ── Fetch current like state + count ──
  const refresh = useCallback(async () => {
    if (!productId) return;

    // Total count
    const { count } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', productId);

    setLikeCount(count ?? 0);

    // User's like state
    if (user) {
      const { data } = await supabase
        .from('likes')
        .select('id')
        .eq('product_id', productId)
        .eq('user_id', user.id)
        .maybeSingle();
      setLiked(!!data);
    } else {
      setLiked(false);
    }

    setLoading(false);
  }, [productId, user]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  // ── Toggle like ──
  const toggleLike = useCallback(async () => {
    if (!user || !productId) return;

    if (liked) {
      // Unlike
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('product_id', productId)
        .eq('user_id', user.id);

      if (!error) {
        setLiked(false);
        setLikeCount((c) => Math.max(0, c - 1));
      }
    } else {
      // Like — DB unique constraint prevents duplicate likes
      const { error } = await supabase
        .from('likes')
        .insert({ product_id: productId, user_id: user.id });

      // 23505 = unique violation (already liked — safe to ignore)
      if (!error || error.code === '23505') {
        if (!liked) {
          setLiked(true);
          setLikeCount((c) => c + 1);
        }
        // Trigger confetti on first like
        try {
          const confetti = (await import('canvas-confetti')).default;
          confetti({
            particleCount: 40,
            spread: 60,
            origin: { y: 0.6 },
            colors: ['#C9A84C', '#E8D5A3', '#F5EFE0'],
          });
        } catch {
          /* confetti is optional */
        }
      }
    }
  }, [user, productId, liked]);

  return { liked, likeCount, toggleLike, loading, refresh };
}
