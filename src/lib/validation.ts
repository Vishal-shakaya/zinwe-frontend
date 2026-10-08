import { prefersReducedMotion } from "../hooks/usePrefersReducedMotion";

/** Inline error copy, identical to the static site's messages. */
export const MESSAGES = {
  required: "This field is required.",
  email: "Enter a valid email address.",
  pick: "Pick one option.",
} as const;

// WHATWG "valid e-mail address" — what <input type="email"> checks natively.
const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export function requiredError(value: string): string | undefined {
  return value.trim() === "" ? MESSAGES.required : undefined;
}

export function emailError(value: string): string | undefined {
  return requiredError(value) ?? (EMAIL_RE.test(value.trim()) ? undefined : MESSAGES.email);
}

export function pickError(value: string): string | undefined {
  return value === "" ? MESSAGES.pick : undefined;
}

export type FieldErrorMap<F extends string> = Partial<Record<F, string>>;

/** Drops undefined entries so `Object.keys(errors).length` means "has errors". */
export function compactErrors<F extends string>(errors: Partial<Record<F, string | undefined>>): FieldErrorMap<F> {
  const out: FieldErrorMap<F> = {};
  for (const [key, msg] of Object.entries(errors) as Array<[F, string | undefined]>) {
    if (msg) out[key] = msg;
  }
  return out;
}

/** Focus + centre the first invalid control, in visual (field) order. */
export function focusFirstInvalid<F extends string>(
  order: readonly F[],
  errors: FieldErrorMap<F>,
  controls: Partial<Record<F, HTMLElement | null>>,
): void {
  const first = order.find((f) => errors[f]);
  const el = first ? controls[first] : null;
  if (!el) return;
  el.focus({ preventScroll: true });
  el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
}
