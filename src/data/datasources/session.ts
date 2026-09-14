import { secureStorage } from '@/core/security/secureStorage';

const KEY = 'smtw.session';

export type AppUser = {
  id: string;
  email: string;
};

export type AppSession = {
  accessToken: string;
  user: AppUser;
  isAdmin: boolean;
};

type Listener = (session: AppSession | null) => void;
const listeners = new Set<Listener>();

export function onSessionChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit(session: AppSession | null): void {
  listeners.forEach((listener) => listener(session));
}

export async function getStoredSession(): Promise<AppSession | null> {
  const raw = await secureStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AppSession;
    if (!parsed.accessToken || !parsed.user?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function setStoredSession(session: AppSession | null): Promise<void> {
  if (!session) {
    await secureStorage.removeItem(KEY);
  } else {
    await secureStorage.setItem(KEY, JSON.stringify(session));
  }
  emit(session);
}
