import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface ReelBadge {
  id: string;
  productId: string;
  thumbnailUrl: string;
  designerName: string;
  designerId: string;
  designerPhoto: string | null;
}

export function useLatestReels(limit = 8) {
  const [badges, setBadges] = useState<ReelBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchReelBadges() {
      try {
        setLoading(true);

        /* Step 1: Fetch products that have video content */
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select('id, image_urls, user_id')
          .not('video_urls', 'is', null)
          .not('video_urls', 'eq', '{}')
          .eq('status', 'published')
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (cancelled) return;
        if (productsError) throw productsError;

        if (!products || products.length === 0) {
          setBadges([]);
          setLoading(false);
          return;
        }

        /* Step 2: Fetch designer profiles for all products */
        const designerIds = [...new Set(products.map((p) => p.user_id))];
        const { data: designers } = await supabase
          .from('profiles')
          .select('user_id, brand_name, username, profile_photo_url')
          .in('user_id', designerIds);

        if (cancelled) return;

        const designerMap = new Map(
          (designers ?? []).map((d) => [d.user_id, d]),
        );

        /* Step 3: Map results */
        const mapped: ReelBadge[] = products.map((product) => {
          const profile = product.user_id
            ? designerMap.get(product.user_id)
            : undefined;

          return {
            id: `reel-badge-${product.id}`,
            productId: product.id,
            thumbnailUrl: product.image_urls?.[0] ?? '',
            designerName:
              profile?.brand_name || profile?.username || 'Designer',
            designerId: product.user_id,
            designerPhoto: profile?.profile_photo_url ?? null,
          };
        });

        setBadges(mapped);
      } catch (err) {
        console.error('useLatestReels — fetch error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchReelBadges();

    return () => {
      cancelled = true;
    };
  }, [limit]);

  return { badges, loading };
}
