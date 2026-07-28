/**
 * Push Notification helpers for Drapé Collective.
 *
 * Manages Web Push subscription lifecycle: request permission,
 * subscribe/unsubscribe via the browser's Push API, persist subscription
 * to Supabase, and react to incoming subscription updates from other tabs.
 */

import { supabase } from './supabase';

/* ─── VAPID public key (obtained from Supabase dashboard) ─── */
const VAPID_PUBLIC_KEY =
  'BD16y3h9GOTuBtVqh4f8LL5ldZf-Z4Lz2Sc7SF-9fYhFw8zQ3Gl6mWwQZnYhi4w7xY9JTR6AklAeg0wrCvFWWjU';

/**
 * urlB64ToUint8Array
 *
 * Converts a base64-encoded VAPID key (URL-safe) to a Uint8Array
 * for use with PushSubscriptionOptions.
 */
function urlB64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

/**
 * requestPermission
 *
 * Requests the Notification permission from the user.
 * Returns 'granted', 'denied', or 'default'.
 */
export async function requestPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('[Push] Notifications not supported in this browser');
    return 'denied' as NotificationPermission;
  }

  const result = await Notification.requestPermission();
  return result;
}

/**
 * isPushSupported
 *
 * Check whether the browser supports the Push API and service workers.
 */
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * getSubscription
 *
 * Returns the current push subscription (or null if not subscribed).
 */
export async function getSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

/**
 * subscribeToPush
 *
 * Subscribes the current service worker to push notifications.
 * Returns the subscription object or null on failure.
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();

    if (existing) {
      // Already subscribed — reuse it
      return existing;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    return subscription;
  } catch (err) {
    console.error('[Push] Subscribe failed:', err);
    return null;
  }
}

/**
 * unsubscribeFromPush
 *
 * Unsubscribes from push notifications and removes the subscription
 * from the database.
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // Remove from database first
      const endpoint = subscription.endpoint;
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', endpoint);

      // Unsubscribe from the push service
      await subscription.unsubscribe();
    }

    return true;
  } catch (err) {
    console.error('[Push] Unsubscribe failed:', err);
    return false;
  }
}

/**
 * saveSubscription
 *
 * Persists a PushSubscription to Supabase, linked to the current user.
 */
export async function saveSubscription(
  subscription: PushSubscription,
): Promise<boolean> {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      console.error('[Push] No authenticated user to save subscription for');
      return false;
    }

    const subJson = subscription.toJSON();
    const endpoint = subJson.endpoint!;
    const p256dhKey = subJson.keys?.p256dh ?? '';
    const authKey = subJson.keys?.auth ?? '';

    // Upsert — user may have existing subscription with same endpoint
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userData.user.id,
        endpoint,
        p256dh_key: p256dhKey,
        auth_key: authKey,
        user_agent: navigator.userAgent,
      },
      { onConflict: 'user_id,endpoint' },
    );

    if (error) {
      console.error('[Push] Failed to save subscription:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Push] saveSubscription error:', err);
    return false;
  }
}

/**
 * removeSubscription
 *
 * Removes a push subscription from the database by its endpoint.
 */
export async function removeSubscription(
  endpoint: string,
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint);

    if (error) {
      console.error('[Push] Failed to remove subscription:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Push] removeSubscription error:', err);
    return false;
  }
}

/**
 * setupPush
 *
 * High-level helper for the Messages page.
 * 1. Check & request notification permission.
 * 2. Subscribe to push.
 * 3. Save the subscription.
 *
 * Returns true if fully set up, false otherwise.
 */
export async function setupPush(): Promise<boolean> {
  if (!isPushSupported()) {
    console.log('[Push] Not supported in this browser');
    return false;
  }

  const permission = await requestPermission();
  if (permission !== 'granted') {
    console.log('[Push] Notification permission not granted');
    return false;
  }

  const subscription = await subscribeToPush();
  if (!subscription) {
    console.warn('[Push] Could not subscribe');
    return false;
  }

  const saved = await saveSubscription(subscription);
  return saved;
}
