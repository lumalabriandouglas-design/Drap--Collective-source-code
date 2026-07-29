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

  const navLinks = useMemo(() => {
    const links = [
      { label: 'Browse', path: '/browse' },
      { label: 'Discover', path: '/style-feed' },
      { label: 'Style Quiz', path: '/quiz' },
    ];
    if (!user) {
      links.push({ label: 'For Designers', path: '/signup' });
    }
    return links;
  }, [user]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const isHome = location.pathname === '/';
  const isShowroom = location.pathname.startsWith('/showroom');
  const isTransparent = (isHome || isShowroom) && !scrolled && !mobileOpen;

  const barClass = isTransparent
    ? 'bg-transparent'
    : 'bg-white/95 backdrop-blur-xl border-b border-charcoal-100/80 shadow-[0_1px_0_rgba(0,0,0,0.03)]';

  const linkClass = (active: boolean) =>
    `text-[12px] tracking-[0.14em] uppercase transition-colors duration-300 ${
      active
        ? isTransparent
          ? 'text-gold-300'
          : 'text-charcoal-800'
        : isTransparent
          ? 'text-white/70 hover:text-white'
          : 'text-charcoal-400 hover:text-charcoal-700'
    }`;

  const iconClass = isTransparent
    ? 'text-white/70 hover:text-white'
    : 'text-charcoal-400 hover:text-charcoal-700';

  const mutedClass = isTransparent
    ? 'text-white/45 hover:text-white/80'
    : 'text-charcoal-300 hover:text-charcoal-600';

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${barClass}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-[4.5rem]">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0" aria-label="Drapé home">
            <DrapeWordmark className="h-5 md:h-[1.35rem] w-auto" light={isTransparent} />
          </Link>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-9">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={linkClass(location.pathname === link.path)}
              >
                {link.label}
              </Link>
            ))}

            <div className={`w-px h-4 ${isTransparent ? 'bg-white/15' : 'bg-charcoal-200'}`} />

            {authLoading ? (
              <div className="w-16 h-3 rounded-full bg-charcoal-100 animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-6">
                {profile?.role === 'designer' && (
                  <Link to="/dashboard" className={linkClass(location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/designer'))}>
                    Studio
                  </Link>
                )}
                {profile?.role === 'customer' && (
                  <Link to="/collective" className={linkClass(location.pathname === '/collective')}>
                    Collective
                  </Link>
                )}
                {profile?.role === 'admin' && (
                  <Link to="/admin" className={linkClass(location.pathname.startsWith('/admin'))}>
                    Admin
                  </Link>
                )}

                <Link to="/wishlist" className={`relative p-1.5 transition-colors ${iconClass}`} aria-label="Wishlist">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                  </svg>
                </Link>

                <Link to="/messages" className={`relative p-1.5 transition-colors ${iconClass}`} aria-label="Messages">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-gold-500 text-white text-[9px] font-semibold flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>

                <button type="button" onClick={signOut} className={`text-[11px] tracking-[0.1em] uppercase transition-colors ${mutedClass}`}>
                  Sign out
                </button>

                {profile?.profile_photo_url ? (
                  <img
                    src={profile.profile_photo_url}
                    alt=""
                    className="w-7 h-7 rounded-full object-cover ring-1 ring-black/5"
                  />
                ) : (
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isTransparent ? 'bg-white/15' : 'bg-charcoal-100'}`}>
                    <span className={`font-serif text-xs ${isTransparent ? 'text-white/70' : 'text-charcoal-500'}`}>
                      {(profile?.brand_name || profile?.username || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-5">
                <Link to="/login" className={linkClass(false)}>
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  className={`text-[11px] tracking-[0.14em] uppercase px-5 py-2 rounded-full transition-all ${
                    isTransparent
                      ? 'border border-white/25 text-white hover:bg-white/10'
                      : 'bg-charcoal-800 text-white hover:bg-charcoal-900'
                  }`}
                >
                  Join
                </Link>
              </div>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            type="button"
            className={`md:hidden flex items-center justify-center w-11 h-11 -mr-2 transition-colors ${
              isTransparent ? 'text-white' : 'text-charcoal-600'
            }`}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
              {mobileOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile panel */}
        {mobileOpen && (
          <div className="md:hidden pb-5 border-t border-charcoal-100/60 bg-white/98 backdrop-blur-xl -mx-4 px-4 sm:-mx-6 sm:px-6 animate-slide-down">
            <div className="pt-3 space-y-0.5">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center min-h-[44px] px-2 text-[13px] tracking-[0.08em] uppercase ${
                    location.pathname === link.path ? 'text-charcoal-900' : 'text-charcoal-500'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {authLoading ? null : user ? (
              <>
                <div className="my-3 h-px bg-charcoal-100" />
                <div className="space-y-0.5">
                  {profile?.role === 'designer' && (
                    <Link to="/dashboard" className="flex items-center min-h-[44px] px-2 text-[13px] tracking-[0.08em] uppercase text-charcoal-500">
                      Studio
                    </Link>
                  )}
                  {profile?.role === 'customer' && (
                    <Link to="/collective" className="flex items-center min-h-[44px] px-2 text-[13px] tracking-[0.08em] uppercase text-charcoal-500">
                      Collective
                    </Link>
                  )}
                  {profile?.role === 'admin' && (
                    <Link to="/admin" className="flex items-center min-h-[44px] px-2 text-[13px] tracking-[0.08em] uppercase text-charcoal-500">
                      Admin
                    </Link>
                  )}
                  <Link to="/wishlist" className="flex items-center min-h-[44px] px-2 text-[13px] tracking-[0.08em] uppercase text-charcoal-500">
                    Wishlist
                  </Link>
                  <Link to="/messages" className="flex items-center min-h-[44px] px-2 text-[13px] tracking-[0.08em] uppercase text-charcoal-500">
                    Messages
                    {unreadCount > 0 && (
                      <span className="ml-2 min-w-[18px] h-[18px] rounded-full bg-gold-500 text-white text-[10px] font-semibold flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Link>
                </div>
                <div className="my-3 h-px bg-charcoal-100" />
                <button
                  type="button"
                  onClick={() => {
                    signOut();
                    setMobileOpen(false);
                  }}
                  className="flex items-center min-h-[44px] w-full px-2 text-[13px] tracking-[0.08em] uppercase text-charcoal-400"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <div className="my-3 h-px bg-charcoal-100" />
                <div className="space-y-2 pt-1">
                  <Link
                    to="/login"
                    className="flex items-center justify-center min-h-[44px] text-[12px] tracking-[0.12em] uppercase text-charcoal-600"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/signup"
                    className="flex items-center justify-center min-h-[44px] bg-charcoal-800 text-white text-[12px] tracking-[0.12em] uppercase rounded-full"
                  >
                    Join
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