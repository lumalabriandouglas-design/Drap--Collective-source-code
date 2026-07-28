/**
 * Suppresses known non-critical browser errors in preview environments.
 *
 * 1. Vite HMR WebSocket connection errors — when server.hmr: false is set,
 *    the Vite client runtime still attempts to open a WebSocket, which fails
 *    behind a reverse proxy.
 *
 * 2. Safari/WebKit 'EmptyRanges' ReferenceError — known browser bug (WebKit
 *    bugs #226857, #228082) triggered internally when accessing <video>
 *    element's buffered TimeRanges. The error is cosmetic and doesn't affect
 *    video playback.
 */

const VITE_HMR_WS_PATTERNS = [
  'vite',
  'hmr',
  'websocket',
  'failed to connect',
  'ws://',
  'wss://',
  'WebSocket connection',
  'load failed',
  'error loading',
  'hot update',
];

function isViteHmrError(...args: unknown[]): boolean {
  const message = args
    .map((arg) => {
      if (typeof arg === 'string') return arg;
      if (arg instanceof Error) return arg.message;
      return '';
    })
    .join(' ')
    .toLowerCase();

  // Quick match: any WebSocket connection failure
  if (message.includes('websocket') && (message.includes('failed') || message.includes('error'))) return true;

  // Quick match: generic load failure that isn't application-specific
  if (
    message.includes('load failed') &&
    !message.includes('module') &&
    !message.includes('chunk')
  ) return true;

  // Score-based match: count how many Vite/HMR-related patterns are present
  let matchCount = 0;
  for (const pattern of VITE_HMR_WS_PATTERNS) {
    if (message.includes(pattern)) matchCount++;
  }
  return matchCount >= 2;
}

/** Check if an error is the known Safari/WebKit EmptyRanges bug. */
function isEmptyRangesError(...args: unknown[]): boolean {
  const message = args
    .map((arg) => {
      if (typeof arg === 'string') return arg;
      if (arg instanceof Error) return arg.message;
      return '';
    })
    .join(' ');
  return message.includes('EmptyRanges') || message.includes('empty ranges');
}

/**
 * Call this once at app startup to intercept known non-critical errors.
 * It wraps console.error to silently drop:
 *  - Vite HMR WebSocket connection failures
 *  - Safari/WebKit EmptyRanges ReferenceErrors
 */
export function suppressViteHmrErrors(): void {
  const originalConsoleError = console.error;

  console.error = function (...args: unknown[]) {
    if (isViteHmrError(...args) || isEmptyRangesError(...args)) {
      // Silently drop — the error is cosmetic in this environment
      return;
    }
    // Pass through to the original (which may be natively-runtime.js's wrapper)
    return originalConsoleError.apply(console, args);
  };

  // Also suppress the Vite HMR unhandled rejection (promise-based WS connect)
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const reason = event.reason?.message ?? String(event.reason);
    const lower = reason.toLowerCase();
    if (
      lower.includes('websocket') ||
      lower.includes('hmr') ||
      lower.includes('load failed') ||
      lower.includes('hot update') ||
      lower.includes('emptyranges') ||
      lower.includes('empty ranges')
    ) {
      event.preventDefault();
    }
  });

  // Suppress the global 'error' event for EmptyRanges (caught by the
  // natively-runtime.js bridge before our handler, but still worth
  // preventing default so it doesn't echo in the browser console).
  window.addEventListener('error', (event) => {
    const msg = event.message ?? '';
    if (msg.includes('EmptyRanges') || msg.includes('empty ranges')) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });
}
