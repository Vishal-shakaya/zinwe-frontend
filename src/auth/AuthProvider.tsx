import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from "react";
import { getMe, type User } from "../lib/api";
import { clearToken, getToken, setToken, subscribeToken } from "../lib/session";
import { AuthContext, type AuthValue } from "./authContext";

/**
 * Owns the dashboard session. The token itself lives in lib/session (so the
 * API client can clear it on a 401); this provider mirrors it into React state,
 * loads the owner's profile, and remembers whether the session expired or the
 * owner logged out on purpose (the login page words its notice accordingly).
 */
export function AuthProvider({ children }: { children: ReactNode }): ReactElement {
  const [token, setTokenState] = useState<string | null>(getToken);
  // The profile is tied to the token it was loaded for, so a stale profile is
  // never shown after a logout or an account switch in another tab.
  const [profile, setProfile] = useState<{ token: string; user: User } | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const manualSignOut = useRef(false);

  useEffect(
    () =>
      subscribeToken((next) => {
        setTokenState(next);
        if (next === null) {
          setSessionExpired(!manualSignOut.current);
          manualSignOut.current = false;
        } else {
          setSessionExpired(false);
        }
      }),
    [],
  );

  const user = profile && profile.token === token ? profile.user : null;

  // Load the profile for a token restored from storage. A 401 here clears the
  // token (inside the API client), which is exactly the redirect we want.
  useEffect(() => {
    if (!token || user) return;
    const controller = new AbortController();
    getMe(controller.signal)
      .then((me) => setProfile({ token, user: me }))
      .catch(() => {
        // Aborted, offline or server trouble: keep the session. Each page shows
        // its own error, and the sidebar simply shows no name.
      });
    return () => controller.abort();
  }, [token, user]);

  const signIn = useCallback((nextToken: string, nextUser: User) => {
    setProfile({ token: nextToken, user: nextUser });
    setToken(nextToken);
  }, []);

  const signOut = useCallback(() => {
    manualSignOut.current = true;
    clearToken();
    setProfile(null);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ token, user, sessionExpired, signIn, signOut }),
    [token, user, sessionExpired, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
