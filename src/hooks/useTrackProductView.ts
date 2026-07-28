import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Tracks when a buyer views a product detail page.
 * Upserts into product_views so the same user viewing the same product
 * just updates the timestamp — no duplicate rows.
 */
const viewTimestamps = new Map<string, number>();
const MIN_INTERVAL_MS = 5000; // 5 seconds between same product

export function useTrackProductView(productId: string | undefined) {
  const { user, profile } = useAuth();

  useEffect(() => {
    // Only track for signed-in buyers (customers)
    if (!user || !productId || profile?.role !== 'customer') return;

    const now = Date.now();
    const lastViewed = viewTimestamps.get(productId);
    if (lastViewed && now - lastViewed < MIN_INTERVAL_MS) return;

    viewTimestamps.set(productId, now);

    // Upsert on (user_id, product_id) unique constraint — each user gets
    // exactly one row per product, keeping view counts honest
    supabase
      .from('product_views')
      .upsert(
        {
          user_id: user.id,
          product_id: productId,
          viewed_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,product_id' },
      )
      .then(({ error }) => {
        if (error && error.code !== '23505') {
          console.warn('useTrackProductView error:', error.message);
        }
      });
  }, [user, productId, profile?.role]);
}