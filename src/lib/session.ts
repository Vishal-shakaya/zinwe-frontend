/**
 * The owner's API token, kept in localStorage["zinwe.token"].
 *
 * Storage can throw (private mode, blocked site data), so every access is
 * wrapped and falls back to an in-memory copy for the current tab. Listeners
 * are told whenever the token changes, so the auth context and the API client
 * stay in sync (e.g. a 401 anywhere clears the token and the dashboard
 * redirects to /login).
 */
const STORAGE_KEY = "zinwe.token";

type Listener = (token: string | null) => void;

function readStored(): string | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value && value.trim() !== "" ? value : null;
  } catch {
    return null;
  }
}

let current: string | null = readStored();
const listeners = new Set<Listener>();

function emit(): void {
  for (const listener of listeners) listener(current);
}

export function getToken(): string | null {
  return current;
}

export function setToken(token: string): void {
  current = token;
  try {
    window.localStorage.setItem(STORAGE_KEY, token);
  } catch {
    // Storage unavailable: the token lives in memory until the tab closes.
  }
  emit();
}

export function clearToken(): void {
  if (current === null) return;
  current = null;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing stored, nothing to remove.
  }
  emit();
}

/** Subscribe to token changes. Returns the unsubscribe function. */
export function subscribeToken(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Logging out (or in) in one tab updates every other open tab.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    const next = readStored();
    if (next === current) return;
    current = next;
    emit();
  });
}
