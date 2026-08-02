import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { registerManifest, registerServiceWorker, injectFallbackIcons } from './lib/pwa';
import { initUpdateChecker, handleServiceWorkerUpdate } from './lib/updateChecker';
import { suppressViteHmrErrors } from './lib/suppressErrors';

// Drop known non-critical console noise early
suppressViteHmrErrors();

/**
 * Register the PWA manifest and service worker on initial load.
 * These run after render so they don't block first paint.
 */
function initPwa() {
  registerManifest();
  injectFallbackIcons();
  registerServiceWorker({
    onUpdate: () => handleServiceWorkerUpdate(),
  });
}

const rootEl = document.getElementById('root');
if (!rootEl) {
  document.body.innerHTML =
    '<p style="padding:2rem;font-family:sans-serif;">Could not find #root element.</p>';
} else {
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );

  // Defer non-critical startup work so first paint stays fast
  const boot = () => {
    initPwa();
    initUpdateChecker();
  };

  if ('requestIdleCallback' in window) {
    requestIdleCallback(boot, { timeout: 2000 });
  } else {
    setTimeout(boot, 2000);
  }
}