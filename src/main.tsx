import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { registerManifest, injectFallbackIcons } from './lib/pwa';
import { suppressViteHmrErrors } from './lib/suppressErrors';

// Drop known non-critical console noise early
suppressViteHmrErrors();

/**
 * PWA only — NO auto-reload / update checker (that caused the infinite loop).
 */
function initPwa() {
  registerManifest();
  injectFallbackIcons();
  // Service worker + updateChecker DISABLED until fingerprint logic is safe
  // registerServiceWorker();
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

  const boot = () => {
    initPwa();
  };

  if ('requestIdleCallback' in window) {
    requestIdleCallback(boot, { timeout: 2000 });
  } else {
    setTimeout(boot, 2000);
  }
}