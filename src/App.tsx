import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { lazy, Suspense } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { CurrencyProvider } from './contexts/CurrencyContext';
import { AutoRefresherProvider } from './contexts/RefreshContext';
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/layout/ErrorBoundary';
import PageLoader from './components/ui/PageLoader';
import ScrollToTop from './components/layout/ScrollToTop';
import { GuestRoute, ProtectedRoute, DesignerRoute, AdminRoute, BuyerRoute, RootRedirect } from './components/layout/RouteGuards';
import ComingSoon from './components/placeholder/ComingSoon';

// Lazy-loaded pages — public
const Landing = lazy(() => import('./pages/public/Landing'));
const Privacy = lazy(() => import('./pages/public/Privacy'));
const Terms = lazy(() => import('./pages/public/Terms'));
const Explore = lazy(() => import('./pages/public/Explore'));

// Lazy-loaded pages — public showroom (no auth)
const PublicShowroom = lazy(() => import('./pages/public/PublicShowroom'));
const Login = lazy(() => import('./pages/auth/Login'));
const Signup = lazy(() => import('./pages/auth/Signup'));

// Lazy-loaded pages — protected (any authenticated user)
const Feed = lazy(() => import('./pages/customer/Feed'));
const Quiz = lazy(() => import('./pages/customer/Quiz'));
const Saved = lazy(() => import('./pages/customer/Saved'));
const Messages = lazy(() => import('./pages/customer/Messages'));
const ProductDetail = lazy(() => import('./pages/customer/ProductDetail'));
const BuyerDashboard = lazy(() => import('./pages/customer/BuyerDashboard'));

// Lazy-loaded pages — designer
const DesignerDashboard = lazy(() => import('./pages/designer/Dashboard'));
const DesignerProducts = lazy(() => import('./pages/designer/Products'));
const AddProduct = lazy(() => import('./pages/designer/AddProduct'));
const DesignerLookbooks = lazy(() => import('./pages/designer/Lookbooks'));
const DesignerReels = lazy(() => import('./pages/designer/Reels'));
const DesignerOnboarding = lazy(() => import('./pages/designer/Onboarding'));

// Lazy-loaded pages — admin
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminModeration = lazy(() => import('./pages/admin/Moderation'));
const AdminAnalytics = lazy(() => import('./pages/admin/Analytics'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
export default function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <ErrorBoundary label="Application">
        <AuthProvider>
          <CurrencyProvider>
            <AutoRefresherProvider>
              <ScrollToTop />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route element={<Layout />}>
                    <Route path="/" element={<RootRedirect><Landing /></RootRedirect>} />
                    <Route path="/explore" element={<Explore />} />
                    <Route path="/browse" element={<Explore />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/reels" element={<ComingSoon title="Reels — Coming Soon" subtitle="Video reels are being curated for our next drop. Stay tuned." pageTitle="Reels — Coming Soon — Drapé Collective" buttonLabel="Browse All Products" />} />
                    <Route path="/lookbooks" element={<ComingSoon title="Lookbooks — Coming Soon" subtitle="Editorial lookbooks are being assembled for the upcoming collection." pageTitle="Lookbooks — Coming Soon — Drapé Collective" buttonLabel="Browse All Products" />} />
                    <Route path="/product/:id" element={<ProductDetail />} />
                    <Route path="/showroom/:designerId" element={<PublicShowroom />} />
                    <Route path="/brand/:designerId" element={<PublicShowroom />} />
                    <Route element={<GuestRoute />}>
                      <Route path="/login" element={<Login />} />
                      <Route path="/signup" element={<Signup />} />
                    </Route>
                    <Route element={<ProtectedRoute />}>
                      <Route path="/feed" element={<Feed />} />
                      <Route path="/style-feed" element={<Feed />} />
                      <Route path="/quiz" element={<Quiz />} />
                      <Route path="/saved" element={<Saved />} />
                      <Route path="/wishlist" element={<Saved />} />
                      <Route path="/messages" element={<Messages />} />
                      <Route element={<BuyerRoute />}>
                        <Route path="/collective" element={<BuyerDashboard />} />
                      </Route>
                      {/* Designer routes */}
                      <Route element={<DesignerRoute />}>
                        <Route path="/dashboard" element={<DesignerDashboard />} />
                        <Route path="/designer/dashboard" element={<DesignerDashboard />} />
                        <Route path="/designer/products" element={<DesignerProducts />} />
                        <Route path="/designer/add-product" element={<AddProduct />} />
                        <Route path="/designer/lookbooks" element={<DesignerLookbooks />} />
                        <Route path="/designer/reels" element={<DesignerReels />} />
                        <Route path="/designer/onboarding" element={<DesignerOnboarding />} />
                      </Route>

                      {/* Admin routes */}
                      <Route element={<AdminRoute />}>
                        <Route path="/admin" element={<AdminDashboard />} />
                        <Route path="/admin/dashboard" element={<AdminDashboard />} />
                        <Route path="/admin/moderation" element={<AdminModeration />} />
                        <Route path="/admin/analytics" element={<AdminAnalytics />} />
                        <Route path="/admin/users" element={<AdminUsers />} />
                      </Route>

                    </Route>

                    {/* Catch-all 404 */}
                    <Route path="*" element={
                      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
                        <h1 className="font-heading text-6xl font-bold text-foreground">404</h1>
                        <p className="mt-2 text-foreground/60">Page not found</p>
                      </div>
                    } />
                  </Route>
                </Routes>
              </Suspense>
            </AutoRefresherProvider>
          </CurrencyProvider>
        </AuthProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </HelmetProvider>
  );
}
