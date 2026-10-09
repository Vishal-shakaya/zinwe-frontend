import { createContext, useContext } from "react";
import type { User } from "../lib/api";

export interface AuthValue {
  /** The stored API token, or null when logged out. */
  token: string | null;
  /** The owner's profile; null until /api/auth/me/ answers (or after logout). */
  user: User | null;
  /** True when the last session ended because the server rejected the token (401). */
  sessionExpired: boolean;
  /** Store a fresh token (and the user from the login response). */
  signIn: (token: string, user: User) => void;
  /** Forget the token on this browser. */
  signOut: () => void;
}

export const AuthContext = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>.");
  return value;
}
