import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useRefresh } from '../contexts/RefreshContext';
import type { HeroSlide } from '../components/ui/HeroSlider';
import { optimizeImageUrl, optimizeImageUrlMobile } from '../lib/imageUrl';

export interface UseHeroSlidesReturn {
  slides: HeroSlide[];
  loading: boolean;
  error: string | null;
}

/**
 * Fetches the latest approved designs (products) from the database
 * with their associated designer profiles, mapping them into hero
 * slider slide data.
 */
export function useHeroSlides(limit = 20): UseHeroSlidesReturn {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { tick: refreshSignal } = useRefresh();

  const fetchSlides = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'published')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (productsError) throw productsError;

      if (!products || products.length === 0) {
        setSlides([]);
        setLoading(false);
        return;
      }

      /* Fetch designer profiles for all products using profiles.id */
      const designerIds = [...new Set(products.map((p) => p.user_id))];
      const { data: designers } = await supabase
        .from('profiles')
        .select('*')
        .in('id', designerIds);

      const designerMap = new Map(
        (designers ?? []).map((d) => [d.id, d]),
      );

      /* Map products → HeroSlide[] */
      const mapped: HeroSlide[] = products.map((product) => {
        const designer = product.user_id
          ? designerMap.get(product.user_id)
          : undefined;
        const imageUrl = product.image_urls?.[0] || '';

        /* Cache-bust with updated_at so the browser re-fetches images
           when a product is soft-deleted or re-edited */
        const cacheOpt = { cacheKey: product.updated_at || undefined };

        return {
          id: product.id,
          src: optimizeImageUrl(imageUrl, cacheOpt),
          srcMobile: optimizeImageUrlMobile(imageUrl, { cacheKey: product.updated_at || undefined }),
          alt: product.name,
          productName: product.name,
          designerName:
            designer?.brand_name || designer?.username || 'Independent Designer',
          productLink: `/product/${product.id}`,
          designerId: designer?.user_id || product.user_id,
        };
      });

      setSlides(mapped);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to load hero slides';
      console.error('useHeroSlides — error:', err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchSlides();
  }, [fetchSlides, refreshSignal]);

  return { slides, loading, error };
}