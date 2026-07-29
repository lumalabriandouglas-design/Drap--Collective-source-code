import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile, Enums } from '../types/supabase';
import type { User, AuthError } from '@supabase/supabase-js';

type UserRole = Enums<'user_role'>;

interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  suspensionError: string | null;
  signUp: (email: string, password: string, role: UserRole, username?: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null; profile: Profile | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

// Helper: promise with timeout
function withTimeout<T>(promise: Promise<T>, ms = 8000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out')), ms)
    ),
  ]);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [suspensionError, setSuspensionError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const initialLoadDone = useRef(false);

  async function fetchProfile(userId: string) {
    try {
      const { data } = await withTimeout(
        supabase.from('profiles').select('*').eq('user_id', userId).single(),
        6000
      );
      setProfile(data);
      return data;
    } catch (err) {
      console.warn('[AuthContext] Profile fetch failed or timed out:', err);
      setProfile(null);
      return null;
    }
  }

  async function enforceSuspension(profileData: Profile | null) {
    if (profileData?.is_suspended) {
      setSuspensionError('Your account has been suspended. Contact support for more information.');
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      return true;
    }
    return false;
  }

  // Realtime suspension listener
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel('profile-suspension')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${profile.id}`,
        },
        async (payload) => {
          if ((payload.new as any).is_suspended) {
            setSuspensionError('Your account has been suspended. Contact support for more information.');
            await supabase.auth.signOut();
            setUser(null);
            setProfile(null);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [profile?.id]);

  // Initial session load with timeout protection
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const { data: { session } } = await withTimeout(supabase.auth.getSession(), 7000);
        if (cancelled) return;

        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          const profileData = await fetchProfile(currentUser.id);
          if (!cancelled) await enforceSuspension(profileData);
        }
      } catch (err) {
        console.warn('[AuthContext] Initial session failed:', err);
        // Fail open — let the user at least see the public site
        setUser(null);
        setProfile(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
          initialLoadDone.current = true;
        }
      }
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);

      if (nextUser) {
        const profileData = await fetchProfile(nextUser.id);
        if (_event !== 'SIGNED_IN') {
          await enforceSuspension(profileData);
        }
      } else {
        setProfile(null);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // ─── Recovery when user returns to the tab ───
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'visible' && initialLoadDone.current) {
        // Quietly re-validate the session when the user comes back
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session) {
            setUser(null);
            setProfile(null);
          }
        }).catch(() => {
          // Ignore — network may still be waking up
        });
      }
    }

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  async function refreshProfile() {
    if (user) {
      const profileData = await fetchProfile(user.id);
      await enforceSuspension(profileData);
    }
  }

  async function signUp(email: string, password: string, role: UserRole, username?: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role, username, preferred_currency: 'UGX' },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error: error as AuthError | null };
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (!error && data?.user) {
      const profileData = await fetchProfile(data.user.id);

      if (profileData?.is_suspended) {
        setSuspensionError('This account has been suspended. Contact support.');
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        const suspensionAuthError = new Error('This account has been suspended. Contact support.') as AuthError;
        suspensionAuthError.status = 403;
        return { error: suspensionAuthError, profile: null };
      }

      return { error: null as AuthError | null, profile: profileData };
    }

    return { error: error as AuthError | null, profile: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSuspensionError(null);
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, suspensionError, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}