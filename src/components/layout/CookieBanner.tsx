import { useState, useEffect } from 'react';

const COOKIE_CONSENT_KEY = 'drape-cookie-consent';

type ConsentStatus = 'accepted' | 'declined' | null;

export default function CookieBanner() {
  const [consent, setConsent] = useState<ConsentStatus>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY) as ConsentStatus;
    if (stored !== 'accepted' && stored !== 'declined') {
      // Show banner after a brief delay so it doesn't pop in immediately
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
    setConsent(stored);
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    setConsent('accepted');
    setVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'declined');
    setConsent('declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up"
      style={{ animationDuration: '0.5s' }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6">
        <div className="rounded-2xl border border-border-light bg-surface shadow-elevation-3 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-charcoal-600 font-medium">
              🍪 Your privacy matters
            </p>
            <p className="text-xs text-charcoal-300 mt-0.5 leading-relaxed max-w-2xl">
              We use essential cookies to keep the site running and collect anonymous analytics
              to improve your experience. By clicking "Accept", you consent to our use of cookies.
              Learn more in our{' '}
              <a
                href="/privacy"
                className="text-gold-500 hover:text-gold-600 underline underline-offset-2 transition-colors"
              >
                Privacy Policy
              </a>
              .
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <button
              onClick={handleDecline}
              className="px-4 py-2 rounded-full text-xs font-medium text-charcoal-400 hover:text-charcoal-600 border border-border-light hover:border-charcoal-200 transition-all"
            >
              Decline
            </button>
            <button
              onClick={handleAccept}
              className="px-5 py-2 rounded-full text-xs font-medium text-white bg-charcoal-700 hover:bg-charcoal-800 transition-all"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
