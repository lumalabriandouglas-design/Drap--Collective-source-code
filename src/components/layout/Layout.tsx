import { lazy, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import SEOHead from '../ui/SEOHead';
import Navbar from './Navbar';
import ErrorBoundary from './ErrorBoundary';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { useTrackSiteVisit } from '../../hooks/useTrackSiteVisit';

/* ─── Lazy-load below-fold components ─── */
const Footer = lazy(() => import('./Footer'));
const AIAssistant = lazy(() => import('../assistant/AIAssistant'));
const CookieBanner = lazy(() => import('../layout/CookieBanner'));

export default function Layout() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  // Wire push notification setup for designers — requests permission
  // after a short delay so the user sees the page first.
  usePushNotifications();

  // Track every page navigation for admin analytics
  useTrackSiteVisit();

  return (
    <>
      <SEOHead />
      <div className="min-h-screen flex flex-col bg-bg">
        <Navbar />
        <main className={`flex-1 ${isHome ? '' : 'pt-20'}`}>
          <ErrorBoundary label="Page content">
            <Outlet />
          </ErrorBoundary>
        </main>
        <Suspense fallback={null}>
          <AIAssistant />
        </Suspense>
        <Suspense fallback={null}>
          <CookieBanner />
        </Suspense>
        <Suspense fallback={null}>
          <ErrorBoundary label="Footer">
            <Footer />
          </ErrorBoundary>
        </Suspense>
      </div>
    </>
  );
}
