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

// ---------------------------------------------------------------------------
// Portal (sign up, reset, company, payment)
// ---------------------------------------------------------------------------

export const PASSWORD_HINT = "Use 8 or more characters, with letters as well as numbers. Avoid common passwords.";

/** Mirrors Django's default validators that can be checked in the browser. */
export function newPasswordError(value: string): string | undefined {
  if (value === "") return MESSAGES.required;
  if (value.length < 8) return "Use at least 8 characters.";
  if (/^\d+$/.test(value)) return "Use letters as well as numbers.";
  return undefined;
}

export function codeError(value: string): string | undefined {
  return /^\d{6}$/.test(value) ? undefined : "Enter all 6 digits of the code.";
}

const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** Optional; when given, a 15-character GSTIN (already upper-cased). */
export function gstinError(value: string): string | undefined {
  if (value === "") return undefined;
  return GSTIN_RE.test(value) ? undefined : "Enter a 15-character GSTIN, like 07ABCDE1234F1Z5.";
}

export function phoneError(value: string): string | undefined {
  if (value.trim() === "") return MESSAGES.required;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15 ? undefined : "Enter a phone number with at least 10 digits.";
}

/** Adds https:// when the owner typed a bare domain ("verma.in"). */
export function normaliseWebsite(value: string): string {
  const trimmed = value.trim();
  if (trimmed === "" || /^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function websiteError(value: string): string | undefined {
  if (value === "") return undefined;
  try {
    const url = new URL(value);
    return url.hostname.includes(".") ? undefined : "Enter a website address, like verma.in.";
  } catch {
    return "Enter a website address, like verma.in.";
  }
}
