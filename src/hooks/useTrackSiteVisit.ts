import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

/**
 * Generates a stable session ID that persists for the browser tab's lifetime.
 * A single session ID groups all page visits from one browsing session
 * so the analytics can distinguish unique vs returning visitors.
 */
function getSessionId(): string {
  const key = 'dc_session_id';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

/** Throttle map — skip recording the same path within this window */
const visitTimestamps = new Map<string, number>();
const MIN_INTERVAL_MS = 10_000; // 10 seconds between same page

/**
 * Tracks every page navigation by inserting a row into `site_visits`.
 * Handles both authenticated and anonymous visitors.
 * Uses sessionStorage for session dedup and a local throttle to
 * avoid spamming the DB on rapid route changes.
 */
export function useTrackSiteVisit() {
  const location = useLocation();
  const path = location.pathname;

  useEffect(() => {
    const now = Date.now();
    const last = visitTimestamps.get(path);
    if (last && now - last < MIN_INTERVAL_MS) return;

    visitTimestamps.set(path, now);

    const sessionId = getSessionId();

    supabase
      .from('site_visits')
      .insert({
        session_id: sessionId,
        page_path: path,
        visited_at: new Date().toISOString(),
      })
      .then(({ error }) => {
        if (error && error.code !== '23505') {
          console.warn('useTrackSiteVisit error:', error.message);
        }
      });
  }, [path]);
}