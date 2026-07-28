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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [suspensionError, setSuspensionError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    setProfile(data);
    console.log('[AuthContext] Profile loaded for user:', userId, 'role:', data?.role);
    return data;
  }

  /** Check if the loaded profile is suspended and sign out if so */
  async function enforceSuspension(profileData: Profile | null) {
    if (profileData?.is_suspended) {
      setSuspensionError('Your account has been suspended. Contact support for more information.');
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      return true; // was suspended
    }
    return false;
  }

  // Set up Realtime subscription on profiles table to catch suspension toggles
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
          if (payload.new.is_suspended) {
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

  // Initial session + profile load — loading stays true until profile is resolved
  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const profileData = await fetchProfile(currentUser.id);
        await enforceSuspension(profileData);
      }

      if (!cancelled) {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);

      if (nextUser) {
        const profileData = await fetchProfile(nextUser.id);
        // Don't run suspension check on SIGNED_IN if the user just logged in
        // — signIn already handles it. But do check on TOKEN_REFRESH, USER_UPDATED etc.
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

      // Suspended user trying to log in
      if (profileData?.is_suspended) {
        setSuspensionError('This account has been suspended. Contact support.');
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        // Return a custom error so the login form can display it inline
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
