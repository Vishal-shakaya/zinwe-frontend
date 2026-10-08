/**
 * Typed client for the Zinwe Django API.
 *
 * API_BASE is empty in development, so requests hit /api/... on the Vite dev
 * server and are proxied to http://127.0.0.1:8000 (see vite.config.ts).
 */
const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

const REQUEST_TIMEOUT_MS = 15_000;

export type TeamSize = "1-10" | "11-25" | "26-50" | "50+";
export type Platform = "windows" | "linux" | "macos";
export type Concern = "usb" | "remote" | "installs" | "email" | "compliance";

export interface EarlyAccessPayload {
  name: string;
  email: string;
  company: string;
  /** Empty string when not given. */
  phone: string;
  team_size: TeamSize;
  platforms: Platform[];
  concerns: Concern[];
}

export type EarlyAccessField = keyof EarlyAccessPayload;

export interface EarlyAccessResponse {
  id: number | string;
  email: string;
  status: string;
  trial_days: number;
  /** true on a 200 for an email that already reserved a spot. */
  already_registered: boolean;
  message: string;
}

/** DRF-style error lists, keyed by payload field. */
export type FieldErrors<F extends string> = Partial<Record<F, string[]>>;

export type SubmitResult<T, F extends string> =
  | { ok: true; data: T }
  | { ok: false; kind: "validation"; fieldErrors: FieldErrors<F>; formError?: string }
  | { ok: false; kind: "rate_limited" | "network" | "server" };

export type EarlyAccessResult = SubmitResult<EarlyAccessResponse, EarlyAccessField>;

const EARLY_ACCESS_FIELDS: readonly EarlyAccessField[] = [
  "name",
  "email",
  "company",
  "phone",
  "team_size",
  "platforms",
  "concerns",
];

function toMessages(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(toMessages);
  if (typeof value === "string") return [value];
  if (value && typeof value === "object") return Object.values(value).flatMap(toMessages);
  return [];
}

/** Split a DRF 400 body into known field errors plus one form-level message. */
function parseValidationBody<F extends string>(
  body: unknown,
  fields: readonly F[],
): { fieldErrors: FieldErrors<F>; formError?: string } {
  const fieldErrors: FieldErrors<F> = {};
  const formMessages: string[] = [];

  if (body && typeof body === "object" && !Array.isArray(body)) {
    for (const [key, value] of Object.entries(body)) {
      const messages = toMessages(value);
      if (messages.length === 0) continue;
      if ((fields as readonly string[]).includes(key)) {
        fieldErrors[key as F] = messages;
      } else {
        // non_field_errors, detail, or a field this form does not render.
        formMessages.push(...messages);
      }
    }
  } else {
    formMessages.push(...toMessages(body));
  }

  return formMessages.length > 0
    ? { fieldErrors, formError: formMessages.join(" ") }
    : { fieldErrors };
}

async function postJson<T, F extends string>(
  path: string,
  payload: unknown,
  fields: readonly F[],
): Promise<SubmitResult<T, F>> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch {
    // Offline, DNS/CORS failure, or the 15 s timeout fired.
    return { ok: false, kind: "network" };
  } finally {
    window.clearTimeout(timeout);
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (response.ok) {
    if (body && typeof body === "object") return { ok: true, data: body as T };
    return { ok: false, kind: "server" };
  }
  if (response.status === 429) return { ok: false, kind: "rate_limited" };
  if (response.status === 400 && body !== null) {
    return { ok: false, kind: "validation", ...parseValidationBody(body, fields) };
  }
  return { ok: false, kind: "server" };
}

/** POST /api/auth/early-access/ — reserve an early-access spot. */
export function submitEarlyAccess(payload: EarlyAccessPayload): Promise<EarlyAccessResult> {
  return postJson<EarlyAccessResponse, EarlyAccessField>(
    "/api/auth/early-access/",
    payload,
    EARLY_ACCESS_FIELDS,
  );
}
