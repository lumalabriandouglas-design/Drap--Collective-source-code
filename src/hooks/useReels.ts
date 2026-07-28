import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useRefresh } from '../contexts/RefreshContext';

/**
 * A single reel item — fetched strictly and exclusively from the
 * reels_videos table. No joins to profiles, products, or any
 * marketplace asset table. If the array is empty the feed shows a
 * static black luxury empty state with zero media rendering.
 *
 * ── Strict Column Binding ──
 *   video_url  →  <video src={...}>
 *   caption    →  caption text element (mapped from description column)
 */
export interface ReelItem {
  id: string;
  videoUrl: string;
  caption: string | null;
  designerId: string;
}

export function useReels(limit = 50) {
  const [reels, setReels] = useState<ReelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { tick: refreshSignal } = useRefresh();

  const fetchReels = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // ── PURE TABLE ISOLATION: select from reels_videos ONLY ──
      //    No .select('..., profiles(...)') — no joins whatsoever.
      //    No fallback query if the result is empty.
      const { data: reelRows, error: reelError } = await supabase
        .from('reels_videos')
        .select(`
          id,
          video_url,
          description,
          user_id
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (reelError) throw reelError;

      // ── ZERO-LENGTH GUARD: return empty array immediately ──
      //    The page will see reels.length === 0 and render the
      //    static black luxury empty state instead of any media.
      if (!reelRows || reelRows.length === 0) {
        setReels([]);
        setLoading(false);
        return;
      }

      // ── Map raw rows to ReelItem — two columns only ──
      const mapped: ReelItem[] = reelRows.map((r) => ({
        id: r.id,
        videoUrl: r.video_url,
        caption: r.description,
        designerId: r.user_id,
      }));

      setReels(mapped);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to load reels';
      console.error('useReels — error:', err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchReels();
  }, [fetchReels, refreshSignal]);

  return { reels, loading, error, refetch: fetchReels };
}