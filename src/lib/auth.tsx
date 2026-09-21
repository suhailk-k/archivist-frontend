import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiGet, apiPost, ApiRequestError, setUnauthorizedHandler } from "./api-client";

export type AuthRole = "superadmin" | "member";

export interface SessionUser {
  id: string;
  username: string;
  displayName: string;
  role: AuthRole;
  memberId: string | null;
  disabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AuthValue {
  user: SessionUser | null;
  ready: boolean;
  needsSetup: boolean;
  /** Set when the backend could not be reached at all. Never a reason to show the login form. */
  backendError: string | null;
  login: (username: string, password: string) => Promise<void>;
  setup: (username: string, displayName: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  // Any 401 after load means the backend dropped the session: clear it and let AuthGate redirect.
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      apiGet<{ needsSetup: boolean }>("/api/auth/setup-status"),
      apiGet<SessionUser>("/api/auth/me").catch((error: unknown) => {
        if (error instanceof ApiRequestError && error.status === 401) return null;
        throw error;
      }),
    ])
      .then(([setupStatus, currentUser]) => {
        if (cancelled) return;
        setNeedsSetup(setupStatus.needsSetup);
        setUser(currentUser);
        setBackendError(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        // A failed probe means we know nothing — say so instead of falling through to the
        // login form, which claims an account exists when the backend was never reached.
        setUser(null);
        setBackendError(error instanceof ApiRequestError ? error.message : "Archivist backend is unreachable.");
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const result = await apiPost<{ user: SessionUser }>("/api/auth/login", { username, password });
    setUser(result.user);
    setNeedsSetup(false);
    setBackendError(null);
  }, []);

  const setup = useCallback(async (username: string, displayName: string, password: string) => {
    const result = await apiPost<{ user: SessionUser }>("/api/auth/setup", { username, displayName, password });
    setUser(result.user);
    setNeedsSetup(false);
    setBackendError(null);
  }, []);

  const logout = useCallback(async () => {
    await apiPost<null>("/api/auth/logout");
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, ready, needsSetup, backendError, login, setup, logout }),
    [user, ready, needsSetup, backendError, login, setup, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
