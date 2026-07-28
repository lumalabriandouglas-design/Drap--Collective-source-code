import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useUnreadCount } from '../../hooks/useUnreadCount';
import { useState, useEffect, useMemo } from 'react';
import DrapeWordmark from '../brand/DrapeWordmark';

export default function Navbar() {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const unreadCount = useUnreadCount();

  // Auth-aware nav links
  const navLinks = useMemo(() => {
    const links = [
      { label: 'Reels', path: '/reels' },
      { label: 'Discover', path: '/style-feed' },
      { label: 'Browse', path: '/browse' },
      { label: 'Look Books', path: '/lookbooks' },
      { label: 'Style Quiz', path: '/quiz' },
    ];
    if (!user) {
      links.push({ label: 'For Designers', path: '/join' });
    }
    return links;
  }, [user]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const isHome = location.pathname === '/';
  const isTransparent = isHome && !scrolled;

  const containerBg = isTransparent
    ? 'bg-transparent'
    : 'bg-white/90 backdrop-blur-xl border-b border-border-light';

  const textColor = (isActive: boolean) =>
    isActive
      ? 'text-gold-400'
      : isTransparent
        ? 'text-white/80 hover:text-white'
        : 'text-charcoal-400 hover:text-charcoal-700';

  const dividerClass = isTransparent
    ? 'border-white/10'
    : 'border-border-light';

  const mobileMenuBg = isTransparent
    ? 'bg-charcoal-800/95 backdrop-blur-xl border-white/10'
    : 'bg-white border-border-light';

  const mobileTextClass = isTransparent
    ? 'text-white/70 hover:text-white'
    : 'text-charcoal-500 hover:text-charcoal-700';

  const iconColor = isTransparent
    ? 'text-white/70 hover:text-white'
    : 'text-charcoal-400 hover:text-charcoal-700';

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 select-none ${containerBg}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link to="/" className="flex items-center group flex-shrink-0">
            <DrapeWordmark className="h-5 md:h-6 w-auto transition-all duration-500" light={isTransparent} />
          </Link>

          {/* ── Desktop nav ── */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link key={link.path} to={link.path} className={`py-2 text-sm tracking-wide transition-all duration-300 ${textColor(location.pathname === link.path)}`}>
                {link.label}
              </Link>
            ))}

            {authLoading ? (
              <div className="flex items-center gap-2">
                <span className="w-20 h-3 rounded-full bg-white/10 animate-pulse" />
              </div>
            ) : user ? (
              <div className="flex items-center gap-5">
                {profile?.role === 'admin' && <Link to="/admin" className={`py-2 text-sm tracking-wide transition-all duration-300 ${textColor(false)}`}>Admin</Link>}
                {profile?.role === 'designer' && <Link to="/dashboard" className={`py-2 text-sm tracking-wide transition-all duration-300 ${textColor(false)}`}>Studio</Link>}
                {profile?.role === 'customer' && <Link to="/collective" className={`py-2 text-sm tracking-wide transition-all duration-300 ${textColor(false)}`}>Collective</Link>}
                <Link to="/wishlist" className={`relative p-2 transition-all duration-300 ${iconColor}`} aria-label="Wishlist">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                  </svg>
                </Link>
                <Link to="/messages" className={`relative py-2 text-sm tracking-wide transition-all duration-300 ${iconColor}`}>
                  Messages
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-4 w-4 h-4 rounded-full bg-gold-500 text-white text-[9px] font-semibold flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
                <button onClick={signOut} className={`py-2 text-sm tracking-wide transition-all duration-300 ${isTransparent ? 'text-white/50 hover:text-white/80' : 'text-charcoal-300 hover:text-error'}`}>Sign Out</button>
                {profile?.profile_photo_url ? (
                  <img src={profile.profile_photo_url} alt="" className="w-8 h-8 rounded-full object-cover border border-white/20" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-charcoal-200 flex items-center justify-center" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/login" className={`py-2 text-sm tracking-wide transition-all duration-300 ${textColor(false)}`}>Sign In</Link>
                <Link to="/signup" className={`btn-luxury text-[11px] !py-2 !px-5 ${
                  isTransparent
                    ? 'bg-white/10 backdrop-blur-sm text-white border border-white/20 hover:bg-white/20 hover:border-white/40'
                    : 'btn-luxury-primary'
                }`}>Get Started</Link>
              </div>
            )}
          </div>

          {/* ── Mobile hamburger ── */}
          <button
            className={`md:hidden flex items-center justify-center min-w-[44px] min-h-[44px] transition-colors active:scale-95 ${isTransparent ? 'text-white' : 'text-charcoal-500'}`}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              {mobileOpen ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>

        {/* ── Mobile menu ── */}
        {mobileOpen && (
          <div className={`md:hidden rounded-2xl px-3 pb-4 pt-3 shadow-elevation-2 border mb-4 animate-slide-down ${mobileMenuBg}`}>
            {/* Brand header — extra padding for vertical alignment with menu items */}
            <div className="pt-1 pb-3 px-[14px]">
              <DrapeWordmark className="h-4 w-auto" light={isTransparent} />
            </div>

            {navLinks.map((link) => (
              <Link key={link.path} to={link.path} onClick={() => setMobileOpen(false)}
                className={`flex items-center min-h-[44px] px-[14px] rounded-xl text-sm transition-colors tracking-wide active:scale-[0.98] ${mobileTextClass}`}>
                {link.label}
              </Link>
            ))}

            {authLoading ? null : user ? (
              <>
                {/* ── Inset divider 1 ── */}
                <div className={`mx-4 mt-2 pt-2 border-t ${dividerClass}`} />
                <div className="space-y-0.5 mt-2">
                  <Link to="/wishlist" onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 min-h-[44px] px-[14px] rounded-xl text-sm transition-colors active:scale-[0.98] ${mobileTextClass}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0">
                      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                    </svg>
                    Wishlist
                  </Link>
                  <Link to="/messages" onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 min-h-[44px] px-[14px] rounded-xl text-sm transition-colors active:scale-[0.98] ${mobileTextClass}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                    </svg>
                    Messages
                    {unreadCount > 0 && (
                      <span className="ml-auto w-5 h-5 rounded-full bg-gold-500 text-white text-[10px] font-semibold flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Link>
                  {profile?.role === 'admin' && (
                    <Link to="/admin" onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 min-h-[44px] px-[14px] rounded-xl text-sm transition-colors active:scale-[0.98] ${mobileTextClass}`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0">
                        <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Admin
                    </Link>
                  )}
                  {profile?.role === 'designer' && (
                    <Link to="/dashboard" onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 min-h-[44px] px-[14px] rounded-xl text-sm transition-colors active:scale-[0.98] ${mobileTextClass}`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0">
                        <path d="M14.7 6.3a1 1 0 00 0 1.4l1.6 1.6a1 1 0 00 1.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
                      </svg>
                      Studio
                    </Link>
                  )}
                  {profile?.role === 'customer' && (
                    <Link to="/collective" onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 min-h-[44px] px-[14px] rounded-xl text-sm transition-colors active:scale-[0.98] ${mobileTextClass}`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 00-3-3.87" />
                        <path d="M16 3.13a4 4 0 010 7.75" />
                      </svg>
                      Collective
                    </Link>
                  )}
                </div>
                {/* ── Inset divider 2 ── */}
                <div className={`mx-4 mt-2 pt-2 border-t ${dividerClass}`} />
                <div className="mt-2">
                  <button onClick={() => { signOut(); setMobileOpen(false); }}
                    className={`flex items-center gap-3 min-h-[44px] w-full px-[14px] rounded-xl text-sm transition-colors active:scale-[0.98] ${isTransparent ? 'text-white/40 hover:text-white/70' : 'text-charcoal-300 hover:text-error'}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0">
                      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* ── Inset divider ── */}
                <div className={`mx-4 mt-2 pt-2 border-t ${dividerClass}`} />
                <div className="space-y-1 mt-2">
                  <Link to="/login" onClick={() => setMobileOpen(false)}
                    className="flex items-center min-h-[44px] px-[14px] rounded-xl text-sm transition-colors active:scale-[0.98] text-charcoal-300">
                    Sign In
                  </Link>
                  <Link to="/signup" onClick={() => setMobileOpen(false)}
                    className="btn-luxury btn-luxury-primary text-[11px] !py-3 !px-5 inline-flex items-center justify-center w-full min-h-[44px] mt-1">
                    Get Started
                  </Link>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
