import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// Lightweight hook for the navbar badge.
// Uses polling instead of a separate Realtime subscription to avoid
// competing channels — useMessaging.ts already handles realtime message updates.
const POLL_INTERVAL = 15000; // 15 seconds

export function useUnreadCount() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUnread = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const { data: convs } = await supabase
      .from('conversations')
      .select('id')
      .contains('participant_ids', [user.id]);

    if (!convs || convs.length === 0) {
      setUnreadCount(0);
      return;
    }

    const convIds = convs.map((c) => c.id);
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', convIds)
      .neq('sender_id', user.id)
      .is('read_at', null);

    setUnreadCount(count ?? 0);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    // Initial fetch
    fetchUnread();

    // Poll periodically instead of maintaining a separate Realtime channel
    intervalRef.current = setInterval(fetchUnread, POLL_INTERVAL);

    // Also refetch on visibility change (tab becomes active)
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchUnread();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user, fetchUnread]);

  return unreadCount;
}
