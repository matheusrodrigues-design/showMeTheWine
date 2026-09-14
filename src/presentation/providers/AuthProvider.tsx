import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { z } from 'zod';
import { apiRequest } from '@/data/datasources/apiClient';
import {
  getStoredSession,
  onSessionChange,
  setStoredSession,
  type AppSession,
  type AppUser,
} from '@/data/datasources/session';

interface AuthContextValue {
  session: AppSession | null;
  user: AppUser | null;
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

type AuthResponse = {
  accessToken: string;
  user: AppUser & { isAdmin?: boolean };
};

async function persistAuth(data: AuthResponse): Promise<void> {
  await setStoredSession({
    accessToken: data.accessToken,
    user: { id: data.user.id, email: data.user.email },
    isAdmin: data.user.isAdmin === true,
  });
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AppSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void getStoredSession().then(async (stored) => {
      if (!stored) {
        if (active) setLoading(false);
        return;
      }
      try {
        const me = await apiRequest<{ user: AppUser & { isAdmin?: boolean } }>(
          '/auth/me',
        );
        const next: AppSession = {
          ...stored,
          user: { id: me.user.id, email: me.user.email },
          isAdmin: me.user.isAdmin === true,
        };
        await setStoredSession(next);
        if (active) setSession(next);
      } catch {
        if (active) setSession(null);
      } finally {
        if (active) setLoading(false);
      }
    });

    const unsub = onSessionChange((next) => {
      setSession(next);
      setLoading(false);
    });
    return () => {
      active = false;
      unsub();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isAdmin: session?.isAdmin === true,
      loading,
      async signIn(email, password) {
        const creds = credentialsSchema.parse({ email, password });
        const data = await apiRequest<AuthResponse>('/auth/login', {
          body: creds,
          auth: false,
        });
        await persistAuth(data);
      },
      async signUp(email, password) {
        const creds = credentialsSchema.parse({ email, password });
        const data = await apiRequest<AuthResponse>('/auth/signup', {
          body: creds,
          auth: false,
        });
        await persistAuth(data);
      },
      async signOut() {
        await setStoredSession(null);
      },
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fora de AuthProvider');
  return ctx;
}
