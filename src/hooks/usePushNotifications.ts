/**
 * usePushNotifications — React hook for PWA push notifications
 *
 * Handles the full lifecycle: permission request, subscription,
 * persistence to Supabase, and cleanup on logout.
 *
 * Wire this into the core layout so it activates gracefully
 * when a designer is logged in.
 */

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  isPushSupported,
  requestPermission,
  subscribeToPush,
  saveSubscription,
  unsubscribeFromPush,
} from '../lib/pushNotifications';

interface PushState {
  supported: boolean;
  permission: NotificationPermission | null;
  subscribed: boolean;
}

export function usePushNotifications() {
  const { user, profile } = useAuth();
  const [state, setState] = useState<PushState>({
    supported: isPushSupported(),
    permission: null,
    subscribed: false,
  });
  const doneRef = useRef(false);

  useEffect(() => {
    // Only run for authenticated designers
    if (!user || profile?.role !== 'designer') {
      doneRef.current = false;
      return;
    }

    // Only attempt once per session
    if (doneRef.current) return;
    doneRef.current = true;

    let cancelled = false;

    async function init() {
      if (!('Notification' in window)) {
        setState(s => ({ ...s, permission: 'denied' }));
        return;
      }

      setState(s => ({ ...s, permission: Notification.permission }));

      // If already denied, don't bother — only prompt if default/granted
      if (Notification.permission === 'denied') return;

      // For "default" (not yet asked), wait a few seconds so the page
      // has loaded and the user isn't bombarded on first paint
      if (Notification.permission === 'default') {
        await new Promise(resolve => setTimeout(resolve, 4000));
      }

      if (cancelled) return;

      const perm = await requestPermission();
      if (cancelled || perm !== 'granted') {
        setState(s => ({ ...s, permission: perm }));
        return;
      }

      const subscription = await subscribeToPush();
      if (cancelled || !subscription) {
        setState(s => ({ ...s, permission: 'granted', subscribed: false }));
        return;
      }

      const saved = await saveSubscription(subscription);
      setState(s => ({
        ...s,
        permission: 'granted',
        subscribed: saved,
      }));
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [user?.id, profile?.role]);

  /** Clean up — call on logout */
  async function disable() {
    doneRef.current = false;
    await unsubscribeFromPush();
    setState(s => ({ ...s, subscribed: false }));
  }

  return { ...state, disable };
}