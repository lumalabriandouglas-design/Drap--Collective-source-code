/**
 * updateChecker — Automated Background Version Checking & Smart Auto-Reload
 *
 * Uses runtime asset fingerprinting: collects all current Vite content-hashed
 * script/link URLs from the DOM to build a fingerprint of the current build.
 * Periodically re-fetches index.html (with cache buster), extracts the new
 * asset URLs, and compares fingerprints. If different → new build detected.
 *
 * Three triggers:
 *  1. Periodically every POLL_INTERVAL_MS (default 5 min)
 *  2. On `visibilitychange` → document.visibilityState === 'visible'
 *  3. On `online` event (app regains connectivity)
 *
 * When a new build is detected, checks whether the user is idle (not typing in
 * a form, not focused on an input/textarea/contenteditable). If idle, fires a
 * clean page reload. If busy, dispatches a CustomEvent for a UI toast instead.
 *
 * Also listens for the SW 'onUpdate' callback for instant detection.
 */

let currentFingerprint: string | null = null;
let pollingTimer: ReturnType<typeof setTimeout> | null = null;
let initialized = false;

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/* ───── Helpers ───── */

/**
 * Build a fingerprint of the current build by collecting all content-hashed
 * asset URLs from <script src> and <link href> elements.
 */
function getAssetFingerprint(): string {
  const assets: string[] = [];

  // Collect all script src URLs
  document.querySelectorAll('script[src]').forEach((el) => {
    const src = (el as HTMLScriptElement).src;
    if (src && !src.includes('natively-runtime')) {
      assets.push(src);
    }
  });

  // Collect all stylesheet/link href URLs
  document.querySelectorAll('link[href]').forEach((el) => {
    const href = (el as HTMLLinkElement).href;
    if (href && (href.endsWith('.css') || href.endsWith('.js'))) {
      assets.push(href);
    }
  });

  // Hash using a simple string concatenation approach
  const raw = assets.sort().join('|');
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const chr = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36) + '-' + assets.length;
}

/**
 * Fetch the page's own index.html (cache-busted), extract asset URLs,
 * and compute the fingerprint. Returns null if fetching fails.
 */
async function fetchServerFingerprint(): Promise<string | null> {
  try {
    const res = await fetch(`/?t=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
      headers: { 'Accept': 'text/html' },
    });
    if (!res.ok) return null;

    const html = await res.text();

    // Extract script src and link href values from the HTML string
    const scriptRegex = /<script[^>]+src="([^"]+)"[^>]*><\/script>/g;
    const linkRegex = /<link[^>]+href="([^"]+)"[^>]*>/g;

    const assets: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = scriptRegex.exec(html)) !== null) {
      const src = match[1];
      if (src && !src.includes('natively-runtime')) {
        assets.push(src);
      }
    }

    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1];
      if (href && (href.endsWith('.css') || href.endsWith('.js'))) {
        assets.push(href);
      }
    }

    const raw = assets.sort().join('|');
    if (!raw) return null;

    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const chr = raw.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return Math.abs(hash).toString(36) + '-' + assets.length;
  } catch {
    return null;
  }
}

/**
 * Returns true if the user is engaged with a text input, textarea,
 * select, or contenteditable element — during which we should NOT reload.
 */
function isUserTyping(): boolean {
  const active = document.activeElement;
  if (!active) return false;

  const tag = active.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if ((active as HTMLElement).isContentEditable) return true;
  if (active.getAttribute('role') === 'textbox') return true;

  return false;
}

/**
 * Returns true if any form on the page has unsaved / dirty state.
 */
function hasDirtyForms(): boolean {
  const forms = document.querySelectorAll('form');
  for (const form of forms) {
    const elements = form.querySelectorAll<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >('input, textarea, select');
    for (const el of elements) {
      if (el.type === 'checkbox' || el.type === 'radio') {
        if (el.checked !== el.defaultChecked) return true;
      } else if (el.value !== el.defaultValue) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Core check: compare the server fingerprint with the current one.
 * If different, attempt a smart reload.
 */
async function performCheck(): Promise<void> {
  // Skip check in dev mode (HMR handles updates)
  if (import.meta.env.DEV) return;

  const serverFingerprint = await fetchServerFingerprint();
  if (!serverFingerprint) return; // couldn't fetch — try again later

  // First run — stash the fingerprint and return
  if (currentFingerprint === null) {
    currentFingerprint = serverFingerprint;
    return;
  }

  // Same version — nothing to do
  if (serverFingerprint === currentFingerprint) return;

  // New build detected!
  console.info('[UpdateChecker] New build detected. Server:', serverFingerprint, 'Current:', currentFingerprint);

  if (isUserTyping() || hasDirtyForms()) {
    // User is active — dispatch a notification event instead of reloading
    window.dispatchEvent(
      new CustomEvent('drape:new-version', {
        detail: { fingerprint: serverFingerprint, deferred: true },
      }),
    );
    return;
  }

  // User is idle — clean reload
  window.dispatchEvent(
    new CustomEvent('drape:new-version', {
      detail: { fingerprint: serverFingerprint, deferred: false },
    }),
  );

  // Small delay so the event can be caught for UI toasts
  setTimeout(() => {
    window.location.reload();
  }, 300);
}

/* ───── Lifecycle ───── */

function startPolling(): void {
  stopPolling();
  pollingTimer = setTimeout(async () => {
    await performCheck();
    startPolling(); // re-schedule
  }, POLL_INTERVAL_MS);
}

function stopPolling(): void {
  if (pollingTimer !== null) {
    clearTimeout(pollingTimer);
    pollingTimer = null;
  }
}

function handleVisibilityChange(): void {
  if (document.visibilityState === 'visible') {
    performCheck();
  }
}

function handleOnline(): void {
  performCheck();
}

/* ───── SW onUpdate callback (called from main.tsx) ───── */

/**
 * Call this when the Service Worker detects an update.
 * Triggers a smart reload similar to performCheck().
 */
export function handleServiceWorkerUpdate(): void {
  if (isUserTyping() || hasDirtyForms()) {
    window.dispatchEvent(
      new CustomEvent('drape:new-version', {
        detail: { source: 'sw', deferred: true },
      }),
    );
    return;
  }

  window.dispatchEvent(
    new CustomEvent('drape:new-version', {
      detail: { source: 'sw', deferred: false },
    }),
  );

  setTimeout(() => {
    window.location.reload();
  }, 300);
}

/**
 * Initialize the update checker.
 * Call this once from the app entry point (main.tsx) after the root renders.
 * Captures the first fingerprint from the fully-loaded DOM.
 */
export function initUpdateChecker(): void {
  if (initialized) return;
  initialized = true;
  if (import.meta.env.DEV) {
    console.log('[UpdateChecker] Skipping in dev mode');
    return;
  }

  // Build initial fingerprint from the current DOM
  currentFingerprint = getAssetFingerprint();

  // Run an initial check ASAP (deferred to not block rendering)
  queueMicrotask(() => {
    performCheck();
  });

  // Start periodic polling
  startPolling();

  // Listen for visibility changes (tab regain focus)
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Listen for online transitions
  window.addEventListener('online', handleOnline);

  console.log('[UpdateChecker] Initialized (fingerprint:', currentFingerprint, ')');
}

/**
 * Clean up listeners and timers.
 */
export function destroyUpdateChecker(): void {
  initialized = false;
  stopPolling();
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('online', handleOnline);
}