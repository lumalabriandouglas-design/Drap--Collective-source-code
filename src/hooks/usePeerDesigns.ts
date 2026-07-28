import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export interface PeerDesign {
  id: string;
  productId: string;
  imageUrl: string;
  productName: string;
  designerName: string;
  designerUsername: string;
  designerId: string;
  hasVideo: boolean;
}

const FETCH_TIMEOUT_MS = 10_000;
const RETRY_DELAY_MS = 1_500;

export function usePeerDesigns(currentUserId: string | undefined, limit = 9) {
  const [designs, setDesigns] = useState<PeerDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function attemptFetch(retries = 1): Promise<void> {
      for (let attempt = 0; attempt <= retries; attempt++) {
        if (cancelled) return;

        /* Create a fresh AbortController per attempt */
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

        try {
          setLoading(true);

          /* Fetch products from other designers */
          const { data: products, error: productsError } = await supabase
            .from('products')
            .select('id, name, image_urls, video_urls, user_id')
            .neq('user_id', currentUserId)
            .eq('status', 'published')
            .eq('is_deleted', false)
            .neq('image_urls', '{}')
            .neq('image_urls', null)
            .order('created_at', { ascending: false })
            .limit(limit)
            .abortSignal(controller.signal);

          clearTimeout(timeoutId);
          if (cancelled) return;
          if (productsError) throw productsError;

          if (!products || products.length === 0) {
            setDesigns([]);
            setLoading(false);
            return;
          }

          /* Fetch designer profiles */
          const designerIds = [...new Set(products.map((p) => p.user_id))];
          const { data: designers } = await supabase
            .from('profiles')
            .select('user_id, brand_name, username')
            .in('user_id', designerIds);

          if (cancelled) return;

          const designerMap = new Map(
            (designers ?? []).map((d) => [d.user_id, d]),
          );

          const mapped: PeerDesign[] = products.map((product) => {
            const profile = product.user_id
              ? designerMap.get(product.user_id)
              : undefined;

            const brandName = profile?.brand_name;
            const username = profile?.username;

            return {
              id: `peer-${product.id}`,
              productId: product.id,
              imageUrl: product.image_urls?.[0] ?? '',
              productName: product.name,
              designerName: brandName || username || 'Designer',
              designerUsername: username || '',
              designerId: product.user_id,
              hasVideo:
                Array.isArray(product.video_urls) &&
                product.video_urls.length > 0,
            };
          });

          setDesigns(mapped);
          setLoading(false);
          return; // success — exit retry loop
        } catch (err) {
          clearTimeout(timeoutId);
          if (cancelled) return;

          const isNetworkError =
            err instanceof TypeError ||
            (err && typeof err === 'object' && 'message' in err &&
              typeof (err as any).message === 'string' &&
              ((err as any).message.includes('Load failed') ||
               (err as any).message.includes('NetworkError') ||
               (err as any).message.includes('AbortError') ||
               (err as any).message.includes('Failed to fetch')));

          /* On the last attempt, log a concise warning */
          if (attempt >= retries) {
            if (isNetworkError) {
              console.warn('usePeerDesigns — network unavailable, showing empty state');
            } else {
              console.warn('usePeerDesigns — fetch error:', err);
            }
            setDesigns([]);
            setLoading(false);
            return;
          }

          /* Retry after a short delay */
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        }
      }
    }

    attemptFetch(1);

    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  }, [currentUserId, limit]);

  return { designs, loading };
}