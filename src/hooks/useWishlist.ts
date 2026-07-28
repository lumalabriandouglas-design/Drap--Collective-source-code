import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Tables } from '../types/supabase';

type SavedItem = Tables<'saved_items'>;
type Product = Tables<'products'>;

interface SavedProduct extends SavedItem {
  product: Product | null;
}

export function useWishlist() {
  const { user } = useAuth();
  const [items, setItems] = useState<SavedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('saved_items')
      .select('*, product:products(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('fetchWishlist error:', error);
      setItems([]);
    } else {
      setItems((data ?? []) as unknown as SavedProduct[]);
    }
    setLoading(false);
  }, [user]);

  const toggleSave = useCallback(
    async (productId: string): Promise<boolean> => {
      if (!user) return false;

      const existing = items.find((item) => item.product_id === productId);
      if (existing) {
        const { error } = await supabase
          .from('saved_items')
          .delete()
          .eq('id', existing.id);
        if (!error) {
          setItems((prev) => prev.filter((i) => i.id !== existing.id));
        }
        return false;
      } else {
        const { error } = await supabase.from('saved_items').insert({
          user_id: user.id,
          product_id: productId,
        });
        if (!error) {
          // Re-fetch to get full product data
          fetchWishlist();
        }
        return true;
      }
    },
    [user, items, fetchWishlist]
  );

  const isSaved = useCallback(
    (productId: string) => items.some((item) => item.product_id === productId),
    [items]
  );

  const removeItem = useCallback(async (itemId: string) => {
    const { error } = await supabase.from('saved_items').delete().eq('id', itemId);
    if (!error) {
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    }
  }, []);

  const totalCount = items.length;

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  return { items, loading, toggleSave, isSaved, removeItem, totalCount, refresh: fetchWishlist };
}