import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { SessionUser } from "@waypoint/contracts";
import {
  login as backendLogin,
  currentUser,
  isAuthUser,
  tokenExpiry,
  type AuthSession,
} from "../../../api/auth";
import { apiFetch, ApiError, type ApiRequestInit } from "../../../api/client";
interface SessionValue {
  user: SessionUser | null;
  /** Both names refer to the real backend JWT. */
  token: string | null;
  jwtToken: string | null;
  request: <T>(path: string, init?: ApiRequestInit) => Promise<T>;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  expire: (expectedToken?: string | null) => void;
}
const SessionContext = createContext<SessionValue | null>(null);
const KEY = "waypoint.live.session";
function readStored(): AuthSession | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY) ?? "null");
    if (typeof value?.token !== "string" || !isAuthUser(value.user))
      return null;
    const exp = tokenExpiry(value.token);
    if (!Number.isFinite(exp)) return null;
    return {
      ...value,
      expiresAt: new Date(
        Math.min(
          exp,
          Number.isFinite(Date.parse(value.expiresAt))
            ? Date.parse(value.expiresAt)
            : exp,
        ),
      ).toISOString(),
    };
  } catch {
    return null;
  }
}
const expired = (s: AuthSession) =>
  Date.now() >= Math.min(Date.parse(s.expiresAt), tokenExpiry(s.token));
export function SessionProvider({ children }: { children: ReactNode }) {
  const [stored] = useState(readStored);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [restoring, setRestoring] = useState(!!stored);
  const [restoreError, setRestoreError] = useState(false);
  const [offlineCached, setOfflineCached] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const ref = useRef<AuthSession | null>(null),
    generation = useRef(0),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      generation.current++;
    };
  }, []);
  const expire = useCallback((expectedToken?: string | null) => {
    if (expectedToken !== undefined && expectedToken !== ref.current?.token)
      return;
    generation.current++;
    try {
      sessionStorage.removeItem(KEY);
      for (const key of [
        "waypoint.session",
        "waypoint.auth.jwt",
        "waypoint.auth.mockToken",
      ])
        sessionStorage.removeItem(key);
    } catch {}
    ref.current = null;
    setSession(null);
    setRestoreError(false);
    setRestoring(false);
    setOfflineCached(false);
  }, []);
  const establish = useCallback((next: AuthSession, cached = false) => {
    sessionStorage.setItem(KEY, JSON.stringify(next));
    ref.current = next;
    setSession(next);
    setOfflineCached(cached);
    setRestoreError(false);
    setRestoring(false);
  }, []);
  useEffect(() => {
    const cached = ref.current ?? readStored();
    if (!cached) {
      expire();
      return;
    }
    if (expired(cached)) {
      expire();
      return;
    }
    const version = generation.current,
      controller = new AbortController();
    if (!ref.current) setRestoring(true);
    setRestoreError(false);
    void currentUser(cached.token, controller.signal)
      .then((user) => {
        if (
          !controller.signal.aborted &&
          alive.current &&
          generation.current === version
        ) {
          if (expired(cached)) expire();
          else establish({ ...cached, user });
        }
      })
      .catch((error) => {
        if (
          controller.signal.aborted ||
          !alive.current ||
          generation.current !== version
        )
          return;
        if (error instanceof ApiError && error.status === 401) {
          expire();
          return;
        }
        // Preserve durable Driver capture during an offline reload. Server still authorizes every replay.
        if (
          error instanceof TypeError &&
          cached.user.role === "driver" &&
          !expired(cached)
        )
          establish(cached, true);
        else {
          setRestoreError(true);
          setRestoring(false);
        }
      });
    return () => controller.abort();
  }, [attempt, stored, establish, expire]);
  useEffect(() => {
    if (!session) return;
    const check = () => {
      if (expired(session)) expire(session.token);
    };
    check();
    const timer = window.setInterval(check, 1000);
    const online = () => setAttempt((n) => n + 1);
    window.addEventListener("online", online);
    window.addEventListener("focus", check);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", online);
      window.removeEventListener("focus", check);
    };
  }, [session, expire]);
  const login = useCallback(
    async (email: string, password: string) => {
      const version = ++generation.current;
      try {
        const result = await backendLogin(email, password);
        if (!alive.current || generation.current !== version)
          return "Sign-in was cancelled.";
        if (expired(result)) return "Session expired. Please sign in again.";
        establish(result);
        return null;
      } catch (error) {
        if (error instanceof ApiError) return error.message;
        return "Couldn’t sign in. Check your connection and try again.";
      }
    },
    [establish],
  );
  const logout = useCallback(async () => expire(), [expire]);
  const request = useCallback(
    async <T,>(path: string, init: ApiRequestInit = {}): Promise<T> => {
      const token = ref.current?.token ?? null;
      try {
        return await apiFetch<T>(path, { ...init, token });
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) expire(token);
        throw error;
      }
    },
    [expire],
  );
  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      jwtToken: session?.token ?? null,
      request,
      login,
      logout,
      expire,
    }),
    [session, request, login, logout, expire],
  );
  if (restoring) return <p role="status">Checking your session…</p>;
  if (restoreError)
    return (
      <div role="alert">
        Couldn’t check your session. Check your connection.
        <button onClick={() => setAttempt((n) => n + 1)}>Retry</button>
        <button onClick={() => void logout()}>Sign out</button>
      </div>
    );
  return (
    <SessionContext.Provider value={value}>
      {offlineCached && (
        <p role="status">
          Offline: using your saved Driver session. Pending actions will be
          verified when you reconnect.
        </p>
      )}
      {children}
    </SessionContext.Provider>
  );
}
export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}
