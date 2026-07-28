import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants/config';
import type { Database } from '../types/supabase';

// Using implicit flow for preview environment compatibility
// emailRedirectTo set to window.location.origin for dynamic redirects
// Realtime: Heartbeat ensures reliable connection even when tab is backgrounded,
// preventing silent disconnections in preview/containerized environments.
//
// Global fetch timeout: Wraps the native fetch with a 15-second timeout so that
// any database query that hangs (e.g. due to network issues in preview envs)
// errors cleanly instead of leaving the app in a perpetual loading state.
const TIMEOUT_MS = 15_000;

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(input, {
      ...init,
      signal: init?.signal
        ? // Combine user-provided signal with our timeout — race them
          anySignal(init.signal, controller.signal)
        : controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Combines multiple AbortSignals — aborts when ANY of them fire. */
function anySignal(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), {
      once: true,
    });
  }
  return controller.signal;
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    flowType: 'implicit',
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  // Heartbeat helps maintain connection in preview environments.
  realtime: {
    heartbeatIntervalMs: 15000,
    heartbeatCallback: (status) => {
      if (status === 'disconnected' || status === 'timeout') {
        console.warn('[Realtime] Connection dropped — auto-reconnect in progress');
      }
    },
  },
  global: {
    fetch: fetchWithTimeout,
  },
});

export type SupabaseClient = typeof supabase;
