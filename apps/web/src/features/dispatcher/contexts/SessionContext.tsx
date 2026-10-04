import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { SessionUser as PublicUser } from "@waypoint/contracts";
import { apiFetch } from "../../../api/client";

interface SessionValue {
  user: PublicUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  expire: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);
/** Per-tab, so two tabs can be signed in as two different roles at once. */
const KEY = "waypoint.live.session";

interface Stored {
  token: string;
  user: PublicUser;
}

function readStored(): Stored | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Stored | null>(readStored);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await apiFetch<Stored>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      sessionStorage.setItem(KEY, JSON.stringify(res));
      setSession(res);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Couldn’t reach the server.";
    }
  }, []);

  const expire = useCallback(() => {
    sessionStorage.removeItem(KEY);
    setSession(null);
  }, []);

  const logout = useCallback(async () => {
    expire();
  }, [expire]);

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      login,
      logout,
      expire,
    }),
    [session, login, logout, expire],
  );
  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
