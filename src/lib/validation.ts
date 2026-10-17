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

/** The WHATWG pattern allows `name@host`; a real reply needs a domain ending (`name@firm.in`). */
function hasDomainDot(email: string): boolean {
  const domain = email.slice(email.lastIndexOf("@") + 1);
  return /\.[a-zA-Z0-9-]{2,}$/.test(domain);
}

export function emailError(value: string): string | undefined {
  const v = value.trim();
  if (requiredError(v)) return MESSAGES.required;
  if (!EMAIL_RE.test(v)) return MESSAGES.email;
  return hasDomainDot(v) ? undefined : "Check your email address. It needs an ending like .com or .in.";
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

/** The example shown in the GSTIN field. */
export const GSTIN_EXAMPLE = "07ABCDE1234F1Z5";

/**
 * GST state codes (the first two digits of a GSTIN), by the state names the company form uses.
 * Some states have two: Andhra Pradesh (28 before 2014, 37 after), Dadra and Nagar Haveli and Daman and Diu
 * (25 and 26, merged in 2020) and Ladakh (38, earlier 01 under Jammu and Kashmir).
 */
const GST_STATE_CODES: Readonly<Record<string, readonly string[]>> = {
  "Jammu and Kashmir": ["01"],
  "Himachal Pradesh": ["02"],
  Punjab: ["03"],
  Chandigarh: ["04"],
  Uttarakhand: ["05"],
  Haryana: ["06"],
  Delhi: ["07"],
  Rajasthan: ["08"],
  "Uttar Pradesh": ["09"],
  Bihar: ["10"],
  Sikkim: ["11"],
  "Arunachal Pradesh": ["12"],
  Nagaland: ["13"],
  Manipur: ["14"],
  Mizoram: ["15"],
  Tripura: ["16"],
  Meghalaya: ["17"],
  Assam: ["18"],
  "West Bengal": ["19"],
  Jharkhand: ["20"],
  Odisha: ["21"],
  Chhattisgarh: ["22"],
  "Madhya Pradesh": ["23"],
  Gujarat: ["24"],
  "Dadra and Nagar Haveli and Daman and Diu": ["26", "25"],
  Maharashtra: ["27"],
  Karnataka: ["29"],
  Goa: ["30"],
  Lakshadweep: ["31"],
  Kerala: ["32"],
  "Tamil Nadu": ["33"],
  Puducherry: ["34"],
  "Andaman and Nicobar Islands": ["35"],
  Telangana: ["36"],
  "Andhra Pradesh": ["37", "28"],
  Ladakh: ["38", "01"],
};

/** The state a GSTIN was issued in (from its first two digits), or null when the code isn't a state's. */
export function gstinState(gstin: string): string | null {
  const code = gstin.slice(0, 2);
  for (const [state, codes] of Object.entries(GST_STATE_CODES)) {
    if (codes.includes(code)) return state;
  }
  return null;
}

/**
 * Optional; when given, a 15-character GSTIN (already upper-cased) that isn't the field's example and,
 * when the company's Indian `state` is known, was issued in that state (it decides CGST + SGST or IGST).
 */
export function gstinError(value: string, state = ""): string | undefined {
  if (value === "") return undefined;
  if (!GSTIN_RE.test(value)) return `Enter a 15-character GSTIN, like ${GSTIN_EXAMPLE}.`;
  if (value === GSTIN_EXAMPLE) return "That's the example GSTIN. Enter your own, or leave this empty.";
  const codes = GST_STATE_CODES[state.trim()];
  if (!codes || codes.includes(value.slice(0, 2))) return undefined;
  const issuedIn = gstinState(value);
  return issuedIn
    ? `This GSTIN is from ${issuedIn}, but you picked ${state}. Check the GSTIN or the state.`
    : `This GSTIN doesn't match ${state}: GSTINs from ${state} start with ${codes[0]}.`;
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
