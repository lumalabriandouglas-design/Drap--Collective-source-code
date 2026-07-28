import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRefresh } from '../contexts/RefreshContext';
import { useMessaging } from './useMessaging';
import { useWishlist } from './useWishlist';
import type { Tables } from '../types/supabase';
import type { ConversationWithProfiles } from './useMessaging';

type Product = Tables<'products'>;
type Profile = Tables<'profiles'>;

interface ViewEntry {
  id: string;
  product_id: string;
  viewed_at: string;
  product: Product | null;
}

interface SuggestedDesigner extends Profile {
  match_tags: string[];
  product_count: number;
}

export interface BuyerDashboardData {
  conversations: ConversationWithProfiles[];
  loadingConversations: boolean;
  savedItems: ReturnType<typeof useWishlist>['items'];
  savedLoading: boolean;
  recentViews: ViewEntry[];
  viewsLoading: boolean;
  suggestedDesigners: SuggestedDesigner[];
  designersLoading: boolean;
  trendingProducts: Product[];
  trendingLoading: boolean;
  startConversation: (designerId: string) => Promise<string | null>;
  refresh: () => void;
}

export function useBuyerDashboard(): BuyerDashboardData {
  const { user } = useAuth();
  const { tick: refreshSignal } = useRefresh();

  // ─── Messages ───
  const {
    conversations: allConversations,
    loadingConversations,
    startConversation,
  } = useMessaging();

  const conversations = useMemo(
    () => allConversations.slice(0, 3),
    [allConversations],
  );

  // ─── Saved Items (Wishlist) ───
  const { items: savedItems, loading: savedLoading, refresh: refreshWishlist } = useWishlist();

  // ─── Recently Viewed ───
  const [recentViews, setRecentViews] = useState<ViewEntry[]>([]);
  const [viewsLoading, setViewsLoading] = useState(true);

  const fetchRecentViews = useCallback(async () => {
    if (!user) {
      setRecentViews([]);
      setViewsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('product_views')
      .select('*, product:products(*)')
      .eq('user_id', user.id)
      .order('viewed_at', { ascending: false })
      .limit(12);

    if (!error) {
      setRecentViews((data ?? []) as unknown as ViewEntry[]);
    } else {
      console.error('fetchRecentViews error:', error);
      setRecentViews([]);
    }
    setViewsLoading(false);
  }, [user]);

  // ─── Suggested Designers ───
  const [suggestedDesigners, setSuggestedDesigners] = useState<SuggestedDesigner[]>([]);
  const [designersLoading, setDesignersLoading] = useState(true);
  const fetchSuggestedDesigners = useCallback(async () => {
    if (!user) {
      setSuggestedDesigners([]);
      setDesignersLoading(false);
      return;
    }

    try {
      const result = await loadSuggestedDesigners(user.id, savedItems, recentViews);
      setSuggestedDesigners(result);
    } catch (err) {
      console.error('fetchSuggestedDesigners error:', err);
      setSuggestedDesigners([]);
    }
    setDesignersLoading(false);
  }, [user, savedItems, recentViews]);

  async function loadSuggestedDesigners(
    userId: string,
    items: ReturnType<typeof useWishlist>['items'],
    views: ViewEntry[],
  ): Promise<SuggestedDesigner[]> {
    // 1. Collect unique tags from saved items and recently viewed products
    const tagSet = new Set<string>();

    // From saved items
    const savedProductIds = items.map((si) => si.product_id);
    if (savedProductIds.length > 0) {
      const { data: savedProducts } = await supabase
        .from('products')
        .select('tags, user_id')
        .in('id', savedProductIds);
      savedProducts?.forEach((p) => {
        p.tags?.forEach((t: string) => tagSet.add(t));
      });
    }

    // From recently viewed products
    const viewedProductIds = views.map((rv) => rv.product_id);
    const allViewIds = [
      ...new Set(viewedProductIds.filter((id) => !savedProductIds.includes(id))),
    ];
    if (allViewIds.length > 0) {
      const { data: viewedProducts } = await supabase
        .from('products')
        .select('tags, user_id')
        .in('id', allViewIds);
      viewedProducts?.forEach((p) => {
        p.tags?.forEach((t: string) => tagSet.add(t));
      });
    }

    // 2. Also fetch quiz style tags
    const { data: quizResult } = await supabase
      .from('quiz_results')
      .select('style_tags')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    if (quizResult?.style_tags) {
      quizResult.style_tags.forEach((t: string) => tagSet.add(t));
    }

    const tags = [...tagSet];

    if (tags.length === 0) {
      // Fallback: get any approved designers with products
      const { data: fallbackDesigners } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'designer')
        .eq('status', 'approved')
        .limit(10);
      if (fallbackDesigners && fallbackDesigners.length > 0) {
        // Use profiles.id to match products.user_id
        const profileIds = fallbackDesigners.map((d) => d.id);
        const { data: productCounts } = await supabase
          .from('products')
          .select('user_id')
          .in('user_id', profileIds);

        const countMap = new Map<string, number>();
        if (productCounts) {
          for (const p of productCounts) {
            countMap.set(p.user_id, (countMap.get(p.user_id) || 0) + 1);
          }
        }

        // Re-map to add match_tags
        const mapped = fallbackDesigners.map((d) => ({
          ...d,
          match_tags: [] as string[],
          product_count: countMap.get(d.id) ?? 0,
        })) as unknown as SuggestedDesigner[];
        return mapped;
      }
      return [];
    }

    // 3. Find designers whose products have matching tags
    const { data: matchingProducts } = await supabase
      .from('products')
      .select('user_id, tags')
      .eq('status', 'published')
      .overlaps('tags', tags);

    if (!matchingProducts || matchingProducts.length === 0) {
      return [];
    }

    // Aggregate products per designer and collect matching tags
    const designerMap = new Map<string, { matchTags: Set<string>; productCount: number }>();
    for (const p of matchingProducts) {
      if (!designerMap.has(p.user_id)) {
        designerMap.set(p.user_id, { matchTags: new Set(), productCount: 0 });
      }
      const entry = designerMap.get(p.user_id)!;
      entry.productCount++;
      p.tags?.forEach((t: string) => {
        if (tags.includes(t)) entry.matchTags.add(t);
      });
    }
    const profileIds = [...designerMap.keys()];

    // 4. Fetch designer profiles
    const { data: designers } = await supabase
      .from('profiles')
      .select('*')
      .in('id', profileIds)
      .eq('role', 'designer')
      .eq('status', 'approved');

    if (designers) {
      const sorted = designers
        .map((d) => ({
          ...d,
          match_tags: [...(designerMap.get(d.id)?.matchTags ?? [])],
          product_count: designerMap.get(d.id)?.productCount ?? 0,
        }))
        .sort((a, b) => b.product_count - a.product_count)
        .slice(0, 10) as unknown as SuggestedDesigner[];
      return sorted;
    }

    return [];
  }
  // ─── Trending Products (fallback for empty state) ───
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const fetchTrending = useCallback(async () => {
    setTrendingLoading(true);
    try {
      // Get most saved products
      const { data: savedAgg } = await supabase
        .from('saved_items')
        .select('product_id')
        .limit(30);

      if (savedAgg && savedAgg.length > 0) {
        // Count occurrences
        const countMap = new Map<string, number>();
        for (const item of savedAgg) {
          countMap.set(item.product_id, (countMap.get(item.product_id) || 0) + 1);
        }
        const sortedIds = [...countMap.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 12)
          .map(([id]) => id);

        if (sortedIds.length > 0) {
          const { data: products } = await supabase
            .from('products')
            .select('*')
            .in('id', sortedIds);
          if (products) {
            // Maintain sorted order
            const ordered = sortedIds
              .map((id) => products.find((p) => p.id === id)!)
              .filter(Boolean);
            setTrendingProducts(ordered);
            setTrendingLoading(false);
            return;
          }
        }
      }

      // Fallback: Get featured or newest products
      const { data: fallback } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'published')
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(12);
      setTrendingProducts((fallback ?? []) as Product[]);
    } catch (err) {
      console.error('fetchTrending error:', err);
      setTrendingProducts([]);
    }
    setTrendingLoading(false);
  }, []);

  // ─── Initial fetch — re-runs on user change or auto-refresh ───
  const refresh = useCallback(() => {
    fetchRecentViews();
    refreshWishlist();
    fetchTrending();
  }, [fetchRecentViews, refreshWishlist, fetchTrending]);

  useEffect(() => {
    fetchRecentViews();
  }, [fetchRecentViews, refreshSignal]);

  useEffect(() => {
    if (!viewsLoading && !savedLoading) {
      fetchSuggestedDesigners();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewsLoading, savedLoading, refreshSignal]);

  useEffect(() => {
    fetchTrending();
  }, [fetchTrending, refreshSignal]);

  const hasActivity =
    savedItems.length > 0 || recentViews.length > 0 || suggestedDesigners.length > 0;

  // If no activity, don't load designers view
  const effectiveDesignersLoading = hasActivity ? designersLoading : false;

  return {
    conversations,
    loadingConversations,
    savedItems,
    savedLoading,
    recentViews,
    viewsLoading,
    suggestedDesigners,
    designersLoading: effectiveDesignersLoading,
    trendingProducts,
    trendingLoading,
    startConversation,
    refresh,
  };
}