import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from "react";
import { ApiError, getMe, isAbortError, logout, type AuthResponse, type Me } from "../lib/api";
import { clearToken, getToken, setToken, subscribeToken } from "../lib/session";
import { AuthContext, type Account, type AccountPatch, type AuthValue } from "./authContext";

function accountFromMe(me: Me): Account {
  const { onboarding, company, subscription, ...user } = me;
  return { user, onboarding, company, subscription };
}

function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.kind === "unauthorized";
}

/**
 * Owns the portal session. The token itself lives in lib/session (so the API
 * client can clear it on a 401); this provider mirrors it into React state,
 * loads GET me/ (user + onboarding step + company + subscription), and
 * remembers whether the session expired or the owner logged out on purpose.
 */
export function AuthProvider({ children }: { children: ReactNode }): ReactElement {
  const [token, setTokenState] = useState<string | null>(getToken);
  // The account is tied to the token it was loaded for, so stale data is never
  // shown after a logout or an account switch in another tab.
  const [profile, setProfile] = useState<{ token: string; account: Account } | null>(null);
  const [failedFor, setFailedFor] = useState<string | null>(null);
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

  const account = profile && profile.token === token ? profile.account : null;
  const hasAccount = account !== null;
  const loadFailed = token !== null && failedFor === token;

  // Load the account for a token restored from storage. A 401 here clears the
  // token (inside the API client), which sends the owner to /login.
  useEffect(() => {
    if (!token || hasAccount || loadFailed) return;
    const controller = new AbortController();
    getMe(controller.signal).then(
      (me) => setProfile({ token, account: accountFromMe(me) }),
      (error: unknown) => {
        if (controller.signal.aborted || isAbortError(error) || isUnauthorized(error)) return;
        setFailedFor(token);
      },
    );
    return () => controller.abort();
  }, [token, hasAccount, loadFailed]);

  const retryLoad = useCallback(() => setFailedFor(null), []);

  const refresh = useCallback(async (fallback?: AccountPatch) => {
    const current = getToken();
    if (!current) return false;
    try {
      const me = await getMe();
      // Ignore an answer for a session that ended (or changed) meanwhile.
      if (getToken() === current) setProfile({ token: current, account: accountFromMe(me) });
      return true;
    } catch (error) {
      if (isUnauthorized(error) || !fallback) return false;
      setProfile((p) => (p && p.token === current ? { token: current, account: { ...p.account, ...fallback } } : p));
      return false;
    }
  }, []);

  const signIn = useCallback(
    (auth: AuthResponse) => {
      setFailedFor(null);
      setProfile({ token: auth.token, account: { user: auth.user, onboarding: auth.onboarding } });
      setToken(auth.token);
      // The login response has no company/subscription: fill them in quietly.
      void refresh();
    },
    [refresh],
  );

  const signOut = useCallback(async () => {
    manualSignOut.current = true;
    if (getToken()) {
      try {
        await logout(AbortSignal.timeout(5000));
      } catch {
        // Offline or already expired: forgetting the token locally still logs out here.
      }
    }
    clearToken();
    manualSignOut.current = false;
    setProfile(null);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      token,
      account,
      user: account?.user ?? null,
      onboarding: account?.onboarding ?? null,
      loadFailed,
      retryLoad,
      sessionExpired,
      signIn,
      refresh,
      signOut,
    }),
    [token, account, loadFailed, retryLoad, sessionExpired, signIn, refresh, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
