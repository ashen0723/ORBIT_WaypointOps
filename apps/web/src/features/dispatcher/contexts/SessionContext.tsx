import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { PublicUser } from '../types/dispatch';
import { login as backendLogin, currentUser, type AuthSession } from '../../../api/auth';
import { apiFetch, ApiError, type ApiRequestInit } from '../../../api/client';
import { createMockSession, removeMockSession } from '../utils/mock-session';

interface SessionValue {
  user: (PublicUser & { vehicleId?: string }) | null;
  /** Legacy consumers use this ONLY for the mock business transport. */
  token: string | null;
  jwtToken: string | null;
  request: <T>(path: string, init?: ApiRequestInit) => Promise<T>;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  expire: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);
// Per-tab session storage; never persist credentials or the JWT in the shared mock database.
const KEY = 'waypoint.auth.jwt';
const MOCK_KEY = 'waypoint.auth.mockToken';
interface Session { jwtToken: string; mockToken: string; user: PublicUser & { vehicleId?: string } }

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [restoreError, setRestoreError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const sessionRef = useRef<Session | null>(null);
  const generation = useRef(0);

  const expire = useCallback(() => {
    generation.current++;
    sessionStorage.removeItem(KEY);
    sessionStorage.removeItem('waypoint.session'); // Discard pre-JWT sessions.
    try { removeMockSession(sessionRef.current?.mockToken ?? sessionStorage.getItem(MOCK_KEY)); } catch { /* Local sign-out still succeeds. */ }
    sessionStorage.removeItem(MOCK_KEY);
    sessionRef.current = null;
    setSession(null);
    setRestoreError(false);
    setRestoring(false);
  }, []);

  const establish = useCallback(({ token, user }: AuthSession) => {
    const mock = createMockSession(user);
    try { removeMockSession(sessionRef.current?.mockToken ?? sessionStorage.getItem(MOCK_KEY)); } catch { /* Replace stale local session. */ }
    const next = { jwtToken: token, mockToken: mock.mockToken, user: mock.user };
    sessionStorage.setItem(KEY, token);
    sessionStorage.setItem(MOCK_KEY, mock.mockToken);
    sessionRef.current = next;
    setSession(next);
  }, []);

  useEffect(() => {
    let alive = true;
    const version = generation.current;
    sessionStorage.removeItem('waypoint.session');
    const token = sessionStorage.getItem(KEY);
    if (!token) { setRestoring(false); return; }
    setRestoring(true);
    setRestoreError(false);
    currentUser(token).then(user => {
      if (alive && generation.current === version) establish({ token, user });
    }).catch(error => {
      if (!alive || generation.current !== version) return;
      if (error instanceof ApiError && error.status === 401) expire();
      else setRestoreError(true);
    }).finally(() => {
      if (alive && generation.current === version) setRestoring(false);
    });
    return () => { alive = false; };
  }, [attempt, establish, expire]);

  // Expiry only controls local sign-out; the backend remains authoritative for validity.
  useEffect(() => {
    if (!session) return;
    try {
      const payload = JSON.parse(atob(session.jwtToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (typeof payload.exp !== 'number') return;
      const timer = window.setInterval(() => { if (Date.now() >= payload.exp * 1000) expire(); }, 1000);
      return () => window.clearInterval(timer);
    } catch { /* /auth/me validates token contents on restoration. */ }
  }, [session, expire]);

  const login = useCallback(async (email: string, password: string) => {
    const version = ++generation.current;
    try {
      const result = await backendLogin(email, password);
      if (version !== generation.current) return 'Sign-in was cancelled.';
      establish(result);
      return null;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return 'Email or password is incorrect.';
      if (error instanceof ApiError && error.status === 400) return 'Enter a valid email and password.';
      return 'Couldn’t sign in. Check your connection and try again.';
    }
  }, [establish]);

  const logout = useCallback(async () => { expire(); }, [expire]);
  const request = useCallback(async <T,>(path: string, init: ApiRequestInit = {}): Promise<T> => {
    const token = sessionRef.current?.jwtToken ?? null;
    try { return await apiFetch<T>(path, { ...init, token }); }
    catch (error) {
      if (error instanceof ApiError && error.status === 401 && token === sessionRef.current?.jwtToken) expire();
      throw error;
    }
  }, [expire]);
  const value = useMemo(() => ({ user: session?.user ?? null, token: session?.mockToken ?? null,
    jwtToken: session?.jwtToken ?? null, request, login, logout, expire }), [session, request, login, logout, expire]);

  if (restoring) return <p role="status">Checking your session…</p>;
  if (restoreError) return <div role="alert">Couldn’t check your session. Check your connection.
    <button onClick={() => setAttempt(value => value + 1)}>Retry</button>
    <button onClick={() => void logout()}>Sign out</button>
  </div>;
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
