import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabase } from '@/data/datasources/supabaseClient';
import { z } from 'zod';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const credentialsSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
});

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();

    async function loadAdminFlag(userId: string | undefined) {
      if (!userId) {
        setIsAdmin(false);
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .maybeSingle();
      const row = data as { is_admin?: boolean } | null;
      setIsAdmin(row?.is_admin === true);
    }

    void supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadAdminFlag(data.session?.user.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      void loadAdminFlag(next?.user.id);
      setLoading(false);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isAdmin,
      loading,
      async signIn(email, password) {
        const creds = credentialsSchema.parse({ email, password });
        const { error } = await getSupabase().auth.signInWithPassword(creds);
        if (error) throw new Error(error.message);
      },
      async signUp(email, password) {
        const creds = credentialsSchema.parse({ email, password });
        const { error } = await getSupabase().auth.signUp(creds);
        if (error) throw new Error(error.message);
      },
      async signOut() {
        const { error } = await getSupabase().auth.signOut();
        if (error) throw new Error(error.message);
      },
    }),
    [session, isAdmin, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fora de AuthProvider');
  return ctx;
}
