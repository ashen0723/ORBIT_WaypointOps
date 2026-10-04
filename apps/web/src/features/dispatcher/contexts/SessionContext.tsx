import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PublicUser } from '../types/dispatch';
import { OfflineError, transport } from '../utils/network';
import { apiFetch, ApiError } from '../../../api/client';

const authSource = import.meta.env.VITE_AUTH_SOURCE === 'api' ? 'api' : 'mock';

interface SessionValue {
  user: PublicUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  expire: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);
/** Per-tab, so two tabs can be signed in as two different roles at once. */
const KEY = 'waypoint.session';

interface Stored {
  token: string;
  user: PublicUser;
  source?: 'api' | 'mock';
}

function readStored(): Stored | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as Stored;
    return stored?.token && stored?.user && (stored.source ?? 'mock') === authSource ? stored : null;
  } catch {
    return null;
  }
}

export function SessionProvider({ children }: {children: ReactNode;}) {
  const [session, setSession] = useState<Stored | null>(readStored);

  useEffect(() => {
    if (authSource !== 'api' || !session?.token) return;
    let active = true;
    void apiFetch<PublicUser>('/auth/me', { token: session.token }).then(user => {
      if (!active) return;
      sessionStorage.setItem(KEY, JSON.stringify({ token: session.token, user, source: 'api' }));
      setSession(current => current?.token === session.token ? { token: current.token, user, source: 'api' } : current);
    }).catch(error => {
      if (active && error instanceof ApiError && error.status === 401) {
        sessionStorage.removeItem(KEY);
        setSession(null);
      }
    });
    return () => { active = false; };
  }, [session?.token]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      if (authSource === 'api') {
        const response = await apiFetch<{ token: string; user: PublicUser }>('/auth/login', {
          method: 'POST', body: JSON.stringify({ email, password }),
        });
        if (!response.token || !response.user?.id || !response.user?.role) return 'Sign-in returned an incomplete account.';
        const next: Stored = { ...response, source: 'api' };
        sessionStorage.setItem(KEY, JSON.stringify(next));
        setSession(next);
        return null;
      }
      const res = await transport<Stored>({ op: 'login', email, password }, null);
      if (!res.ok) return res.message;
      const next: Stored = { ...res.data, source: 'mock' };
      sessionStorage.setItem(KEY, JSON.stringify(next));
      setSession(next);
      return null;
    } catch (e) {
      if (e instanceof ApiError) return e.message;
      return e instanceof OfflineError ? 'You’re offline. Signing in needs a connection.' : 'Couldn’t reach the server.';
    }
  }, []);

  const expire = useCallback(() => {
    sessionStorage.removeItem(KEY);
    setSession(null);
  }, []);

  const logout = useCallback(async () => {
    const token = session?.token ?? null;
    expire();
    if (authSource === 'api') return;
    try {
      await transport({ op: 'logout' }, token);
    } catch {

      // Offline sign-out still clears the local session.
    }}, [session, expire]);

  const value = useMemo(() => ({ user: session?.user ?? null, token: session?.token ?? null, login, logout, expire }), [session, login, logout, expire]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
