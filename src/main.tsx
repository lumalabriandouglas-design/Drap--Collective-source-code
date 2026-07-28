import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { registerManifest, registerServiceWorker, injectFallbackIcons } from './lib/pwa';

/**
 * Register the PWA manifest and service worker on initial load.
 * These run after render so they don't block first paint.
 */
function initPwa() {
  // Inject the Web App Manifest as an inline Blob URL
  registerManifest();
  // Inject fallback <link rel="icon"> in case the manifest icon fails
  injectFallbackIcons();
  // Register the push-notification service worker (only in production)
  registerServiceWorker();
}

const rootEl = document.getElementById('root');
if (!rootEl) {
  document.body.innerHTML = '<p style="padding:2rem;font-family:sans-serif;">Could not find #root element.</p>';
} else {
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  // Defer PWA init so it doesn't block the critical render path
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => initPwa(), { timeout: 2000 });
  } else {
    setTimeout(() => initPwa(), 2000);
  }
}