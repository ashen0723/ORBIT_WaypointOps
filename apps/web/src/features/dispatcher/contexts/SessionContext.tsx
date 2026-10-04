import React, { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import type { PublicUser } from '../types/dispatch';
import { OfflineError, transport } from '../utils/network';

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
}

function readStored(): Stored | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) as Stored : null;
  } catch {
    return null;
  }
}

export function SessionProvider({ children }: {children: ReactNode;}) {
  const [session, setSession] = useState<Stored | null>(readStored);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await transport<Stored>({ op: 'login', email, password }, null);
      if (!res.ok) return res.message;
      sessionStorage.setItem(KEY, JSON.stringify(res.data));
      setSession(res.data);
      return null;
    } catch (e) {
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