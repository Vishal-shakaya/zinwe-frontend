/**
 * The plan a visitor picked before signing up (/signup?plan=early-access),
 * remembered for this tab so /onboarding/plan can highlight it.
 */
const KEY = "zinwe.planIntent";
const CODE_RE = /^[a-z0-9-]{1,40}$/;

export function rememberPlanIntent(code: string | null): void {
  if (!code || !CODE_RE.test(code)) return;
  try {
    window.sessionStorage.setItem(KEY, code);
  } catch {
    // Storage blocked: the plan page simply highlights the recommended plan.
  }
}

export function readPlanIntent(): string | null {
  try {
    const value = window.sessionStorage.getItem(KEY);
    return value && CODE_RE.test(value) ? value : null;
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

/** A `?plan=` value, if it looks like a plan code. */
export function planCodeParam(value: string | null): string | null {
  return value && CODE_RE.test(value) ? value : null;
}
