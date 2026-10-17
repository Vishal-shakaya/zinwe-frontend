/**
 * Small conveniences around signing in (2026-10-17):
 * - the last email used on this browser, to fill in the login form next time;
 * - "signed in in this tab", so the login page can say "You're logged out" after a log out;
 * - the sign-up code step, kept for the tab so a reload (Android does that after reading the code in
 *   Gmail) comes back to "Check your email" instead of an empty form.
 * Storage can be blocked: every access is wrapped and simply does nothing then.
 */
const EMAIL_KEY = "zinwe.lastEmail";
const SIGNED_IN_KEY = "zinwe.signedInHere";
const SIGNUP_KEY = "zinwe.signupCode";
/** How long a reload can still return to the code step (codes work for 10 minutes; a resend makes a new one). */
const SIGNUP_KEEP_MS = 30 * 60_000;

export function rememberSignIn(email: string): void {
  try {
    window.localStorage.setItem(EMAIL_KEY, email.trim());
    window.sessionStorage.setItem(SIGNED_IN_KEY, "1");
  } catch {
    // Storage blocked: nothing to remember.
  }
}

export function lastEmail(): string {
  try {
    return window.localStorage.getItem(EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

/** Someone signed in in this tab earlier (so arriving at /login signed out means they were logged out). */
export function signedInHere(): boolean {
  try {
    return window.sessionStorage.getItem(SIGNED_IN_KEY) === "1";
  } catch {
    return false;
  }
}

export function forgetSignedInHere(): void {
  try {
    window.sessionStorage.removeItem(SIGNED_IN_KEY);
  } catch {
    // Nothing stored.
  }
}

interface SavedSignupCode {
  email: string;
  /** When the code was sent (ms). */
  at: number;
  /** The resend cooldown it came with (s). */
  resendIn: number;
}

export function saveSignupCode(email: string, resendIn: number): void {
  try {
    const value: SavedSignupCode = { email, at: Date.now(), resendIn };
    window.sessionStorage.setItem(SIGNUP_KEY, JSON.stringify(value));
  } catch {
    // Storage blocked: a reload starts over (signing up again sends a new code).
  }
}

/** The code step to come back to after a reload, with the cooldown that's left; null when there's none. */
export function readSignupCode(): { email: string; resendIn: number } | null {
  try {
    const raw: unknown = JSON.parse(window.sessionStorage.getItem(SIGNUP_KEY) ?? "null");
    if (!raw || typeof raw !== "object") return null;
    const { email, at, resendIn } = raw as Partial<SavedSignupCode>;
    if (typeof email !== "string" || typeof at !== "number" || typeof resendIn !== "number") return null;
    const elapsed = Date.now() - at;
    if (elapsed < 0 || elapsed > SIGNUP_KEEP_MS) return null;
    return { email, resendIn: Math.max(0, Math.ceil(resendIn - elapsed / 1000)) };
  } catch {
    return null;
  }
}

export function clearSignupCode(): void {
  try {
    window.sessionStorage.removeItem(SIGNUP_KEY);
  } catch {
    // Nothing stored.
  }
}
