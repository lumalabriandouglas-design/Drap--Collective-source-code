import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface RealtimeQueryOptions<T> {
  query: () => ReturnType<typeof supabase.from>['select'];
  table: string;
  filter?: string;
  onInsert?: (newRow: T) => void;
  onUpdate?: (updatedRow: T) => void;
  onDelete?: (oldRow: Pick<T, 'id'>) => void;
  skipInitialFetch?: boolean;
}

export interface UseRealtimeQueryReturn<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useRealtimeQuery<T extends { id: string | number }>(
  options: RealtimeQueryOptions<T>,
): UseRealtimeQueryReturn<T> {
  const {
    query: buildQuery,
    table,
    filter,
    onInsert,
    onUpdate,
    onDelete,
    skipInitialFetch = false,
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(!skipInitialFetch);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const mountedRef = useRef(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const query = buildQuery();
      const { data: result, error: fetchError } = await query;

      if (fetchError) {
        console.error(`useRealtimeQuery(${table}) — fetch error:`, fetchError);
        setError(fetchError.message);
      } else if (mountedRef.current) {
        setData((result ?? []) as unknown as T[]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error(`useRealtimeQuery(${table}) — unexpected error:`, err);
      setError(msg);
    }

    if (mountedRef.current) setLoading(false);
  }, [buildQuery, table]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const channelName = `realtime:${table}:${filter ?? '*'}:${Math.random().toString(36).slice(2, 8)}`;

    const channel = supabase
      .channel(channelName)
      .on<RealtimePostgresChangesPayload<T>>(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter },
        (payload) => {
          const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';

          if ((eventType === 'INSERT' || eventType === 'UPDATE') && payload.new) {
            const newRow = payload.new as T;

            if (eventType === 'INSERT') {
              if (onInsert) {
                onInsert(newRow);
              } else {
                setData((prev) => {
                  if (prev.some((d) => d.id === newRow.id)) return prev;
                  return [newRow, ...prev];
                });
              }
            }

            if (eventType === 'UPDATE') {
              if (onUpdate) {
                onUpdate(newRow);
              } else {
                setData((prev) =>
                  prev.map((d) => (d.id === newRow.id ? newRow : d)),
                );
              }
            }
          }

          if (eventType === 'DELETE' && payload.old) {
            const oldRow = payload.old as Pick<T, 'id'>;
            if (onDelete) {
              onDelete(oldRow);
            } else {
              setData((prev) => prev.filter((d) => d.id !== oldRow.id));
            }
          }
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn(`useRealtimeQuery(${table}) — channel error`);
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, filter]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refetch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refetch]);

  useEffect(() => {
    if (!skipInitialFetch) {
      refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useMemo(
    () => ({ data, loading, error, refetch }),
    [data, loading, error, refetch],
  );
}

/* ─── Live Feed ─── */

export interface FeedItem {
  id: string;
  type: 'product' | 'lookbook' | 'designer_spotlight';
  product?: Record<string, unknown>;
  designer?: Record<string, unknown>;
  title: string;
  subtitle: string;
  imageUrl?: string;
  link: string;
  tags: string[];
  createdAt: string;
  isFeatured: boolean;
}

interface LiveFeedOptions {
  limit?: number;
}

export function useLiveFeed(opts: LiveFeedOptions = {}) {
  const { limit = 20 } = opts;
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true);
      }
      setError(null);

      try {
        const { data: products } = await supabase
          .from('products')
          .select('*')
          .eq('status', 'approved')
          .order('is_featured', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(limit);
        const designerIds = [...new Set((products ?? []).map((p) => p.user_id))];
        const { data: designers } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', designerIds);

        const designerMap = new Map((designers ?? []).map((d) => [d.user_id, d]));

        const { data: lookbooks } = await supabase
          .from('lookbooks')
          .select('*')
          .eq('status', 'published')
          .order('is_featured', { ascending: false })
          .order('published_at', { ascending: false })
          .limit(8);
        const items: FeedItem[] = [];

        for (const product of products ?? []) {
          items.push({
            id: `product-${product.id}`,
            type: 'product',
            product: { ...product, designer: designerMap.get(product.user_id) },
            title: product.name,
            subtitle: product.description?.slice(0, 120) || 'New arrival',
            imageUrl: product.image_urls?.[0],
            link: `/products/${product.id}`,
            tags: [product.category || 'fashion', ...(product.materials || [])].filter(Boolean),
            createdAt: product.created_at,
            isFeatured: product.is_featured ?? false,
          });
        }

        for (const lb of lookbooks ?? []) {
          items.push({
            id: `lookbook-${lb.id}`,
            type: 'lookbook',
            title: lb.title,
            subtitle: lb.subtitle || 'Editorial Collection',
            imageUrl: lb.cover_image_url || undefined,
            link: `/lookbooks/${lb.id}`,
            tags: lb.tags || ['editorial'],
            createdAt: lb.published_at || lb.created_at,
            isFeatured: lb.is_featured ?? false,
          });
        }

        // Sort: featured items first, then by creation date
        items.sort((a, b) => {
          if (a.isFeatured !== b.isFeatured) {
            return a.isFeatured ? -1 : 1;
          }
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        // Deduplicate by id to prevent card flicker/duplication from rapid realtime events
        setFeed(items);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error('useLiveFeed — fetch error:', err);
        setError(msg);
      }

      if (!silent) {
        setLoading(false);
      }
    },
    [limit],
  );

  const refetch = useCallback(() => fetchData(false), [fetchData]);
  const refresh = useCallback(() => fetchData(true), [fetchData]);

  // Realtime: background refresh only (no loading flicker)
  useEffect(() => {
    const channel = supabase
      .channel('livefeed:all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () =>
        refresh(),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lookbooks' }, () =>
        refresh(),
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [refresh]);

  // Visibility change: background refresh
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);

  // Initial fetch
  useEffect(() => {
    refetch();
  }, [refetch]);

  return { feed, loading, error, refetch };
}
