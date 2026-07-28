import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useRefresh } from '../contexts/RefreshContext';

interface DesignerOfMonth {
  designer_id: string;
  brand_name: string;
  username: string;
  profile_photo_url: string;
  total_likes: number;
  products_count: number;
}

interface OutfitOfMonth {
  product_id: string;
  product_name: string;
  product_image_url: string;
  designer_id: string;
  brand_name: string;
  username: string;
  score: number;
  likes_count: number;
  views_count: number;
}

interface CommunityPulse {
  designerOfMonth: DesignerOfMonth | null;
  outfitOfMonth: OutfitOfMonth | null;
  loading: boolean;
}

/**
 * useCommunityPulse — Fetches "Designer of the Month" and "Outfit of the Month"
 * from the database functions.
 */
export function useCommunityPulse(): CommunityPulse {
  const [designerOfMonth, setDesignerOfMonth] = useState<DesignerOfMonth | null>(null);
  const [outfitOfMonth, setOutfitOfMonth] = useState<OutfitOfMonth | null>(null);
  const [loading, setLoading] = useState(true);

  const { tick: refreshSignal } = useRefresh();

  const fetchPulse = useCallback(async () => {
    setLoading(true);
    Promise.allSettled([
      supabase.rpc('get_designer_of_the_month'),
      supabase.rpc('get_outfit_of_the_month'),
    ]).then(([designerRes, outfitRes]) => {
      if (designerRes.status === 'fulfilled' && designerRes.value.data?.length) {
        setDesignerOfMonth(designerRes.value.data[0]);
      }
      if (outfitRes.status === 'fulfilled' && outfitRes.value.data?.length) {
        setOutfitOfMonth(outfitRes.value.data[0]);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    fetchPulse();
  }, [fetchPulse, refreshSignal]);

  return { designerOfMonth, outfitOfMonth, loading };
}
