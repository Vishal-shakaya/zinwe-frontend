/**
 * The plan a visitor picked before signing up (/signup?plan=businesses),
 * remembered for this tab so /onboarding/plan can highlight it.
 */
const KEY = "zinwe.planIntent";
const CODE_RE = /^[a-z0-9-]{1,40}$/;

/** Retired plan codes still found in old links and bookmarks (v1.1: early access became the Businesses trial). */
const LEGACY_CODES: Record<string, string> = { "early-access": "businesses" };

/** A valid plan code with legacy codes mapped to their replacement; null otherwise. */
function normalize(value: string | null): string | null {
  if (!value || !CODE_RE.test(value)) return null;
  return LEGACY_CODES[value] ?? value;
}

export function rememberPlanIntent(value: string | null): void {
  const code = normalize(value);
  if (!code) return;
  try {
    window.sessionStorage.setItem(KEY, code);
  } catch {
    // Storage blocked: the plan page simply highlights the recommended plan.
  }
}

export function readPlanIntent(): string | null {
  try {
    return normalize(window.sessionStorage.getItem(KEY));
  } catch {
    return null;
  }
}

export function clearPlanIntent(): void {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}

/** A `?plan=` value, if it looks like a plan code (`early-access` reads as `businesses`). */
export function planCodeParam(value: string | null): string | null {
  return normalize(value);
}
