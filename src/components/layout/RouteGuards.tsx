import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import SuspendedAccount from '../ui/SuspendedAccount';
import type { ReactNode } from 'react';

/* ─── Shared loading spinner ─── */

function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs tracking-widest uppercase text-foreground/50">
          Loading
        </p>
      </div>
    </div>
  );
}

/**
 * ProtectedRoute — requires an authenticated user.
 */
export function ProtectedRoute() {
  const { user, profile, loading } = useAuth();

  if (loading) return <AuthLoading />;
  if (!user) return <Navigate to="/login" replace />;
  if (profile?.is_suspended) return <SuspendedAccount />;
  return <Outlet />;
}

/**
 * GuestRoute — renders children only for logged-out users.
 * Once the user is authenticated, redirects based on their role.
 * Keeps showing a loading state while the profile (and its role)
 * is still being resolved, preventing a flicker to the wrong page.
 */
export function GuestRoute() {
  const { user, profile, loading } = useAuth();

  if (loading) return <AuthLoading />;

  // Logged in — wait for profile before deciding destination
  if (user) {
    // Profile not yet available; stay loading (prevents flicker)
    if (!profile) return <AuthLoading />;

    // Suspended user — show suspension page
    if (profile.is_suspended) return <SuspendedAccount />;

    switch (profile.role) {
      case 'admin':
        return <Navigate to="/admin" replace />;
      case 'designer':
        return <Navigate to="/dashboard" replace />;
      case 'customer':
        return <Navigate to="/collective" replace />;
      default:
        return <Navigate to="/browse" replace />;
    }
  }

  return <Outlet />;
}

/**
 * AdminRoute — requires authenticated user with role === 'admin'.
 */
export function AdminRoute() {
  const { user, profile, loading } = useAuth();

  if (loading) return <AuthLoading />;
  if (!user) return <Navigate to="/login" replace />;
  if (profile?.is_suspended) return <SuspendedAccount />;
  if (profile?.role !== 'admin') return <Navigate to="/" replace />;
  return <Outlet />;
}

/**
 * DesignerRoute — requires authenticated user with role === 'designer'.
 */
export function DesignerRoute() {
  const { user, profile, loading } = useAuth();

  console.log('[DesignerRoute] user:', !!user, 'profile:', !!profile, 'role:', profile?.role, 'loading:', loading);

  if (loading) return <AuthLoading />;
  if (!user) {
    console.log('[DesignerRoute] No user — redirecting to /login');
    return <Navigate to="/login" replace />;
  }
  if (profile?.is_suspended) return <SuspendedAccount />;
  if (profile?.role !== 'designer') {
    console.log('[DesignerRoute] Role mismatch — got:', profile?.role, 'expected: designer — redirecting to /');
    return <Navigate to="/" replace />;
  }
  console.log('[DesignerRoute] Access granted');
  return <Outlet />;
}

/**
 * BuyerRoute — requires authenticated user with role === 'customer'.
 */
export function BuyerRoute() {
  const { user, profile, loading } = useAuth();

  if (loading) return <AuthLoading />;
  if (!user) return <Navigate to="/login" replace />;
  if (profile?.is_suspended) return <SuspendedAccount />;
  if (profile?.role !== 'customer') return <Navigate to="/" replace />;
  return <Outlet />;
}

/**
 * RootRedirect — renders children (the LandingPage) for everyone.
 * The hero slider handles its own branded loading state.
 */
export function RootRedirect({ children }: { children: ReactNode }) {
  return children ? <>{children}</> : <Outlet />;
}