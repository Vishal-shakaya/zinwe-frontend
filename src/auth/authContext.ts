import { createContext, useContext } from "react";
import type { AuthResponse, Company, Entitlements, Onboarding, Subscription, User } from "../lib/api";

/** What the portal knows about the signed-in owner. */
export interface Account {
  user: User;
  onboarding: Onboarding;
  /** `undefined` until GET me/ has answered (a login response doesn't carry them). */
  company?: Company | null;
  subscription?: Subscription | null;
  /** What the plan switches on; `undefined` until GET me/ answers (or from an older backend). */
  entitlements?: Entitlements;
}

/** Local knowledge to apply if the follow-up GET me/ fails. */
export type AccountPatch = Partial<Omit<Account, "user">>;

export interface AuthValue {
  /** The stored API token, or null when logged out. */
  token: string | null;
  /** Loaded for the current token; null while loading or logged out. */
  account: Account | null;
  user: User | null;
  onboarding: Onboarding | null;
  /** GET me/ failed for a reason other than 401 (offline, server trouble). */
  loadFailed: boolean;
  /** Try GET me/ again after `loadFailed`. */
  retryLoad: () => void;
  /** True when the last session ended because the server rejected the token (401). */
  sessionExpired: boolean;
  /** Store the token, user and onboarding step from an AuthResponse. */
  signIn: (auth: AuthResponse) => void;
  /**
   * Re-read GET me/ (call after each onboarding step). If it fails, `fallback`
   * is applied locally so the owner can still move on. Resolves true when GET me/ answered.
   */
  refresh: (fallback?: AccountPatch) => Promise<boolean>;
  /** POST logout/, then forget the token on this browser. */
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>.");
  return value;
}
