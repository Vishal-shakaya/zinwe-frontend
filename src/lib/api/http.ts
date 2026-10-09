/**
 * Transport for the Zinwe Django API.
 *
 * API_BASE is empty in development, so requests hit /api/... on the Vite dev
 * server and are proxied to http://127.0.0.1:8000 (see vite.config.ts).
 *
 * Public forms (sign up, log in, codes) use `postPublic`, which returns a
 * discriminated union and never throws. Signed-in calls use `authedRequest`,
 * which sends "Authorization: Token <token>" and throws ApiError instead.
 */
import { clearToken, getToken } from "../session";

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

const REQUEST_TIMEOUT_MS = 15_000;

/** DRF-style error lists, keyed by payload field. */
export type FieldErrors<F extends string> = Partial<Record<F, string[]>>;

export type SubmitResult<T, F extends string> =
  | { ok: true; data: T }
  | { ok: false; kind: "validation"; fieldErrors: FieldErrors<F>; formError?: string }
  /** 429: `retryAfter` is in seconds when the server said so (OTP cooldown, throttles). */
  | { ok: false; kind: "rate_limited"; retryAfter: number | null; detail?: string }
  /** 403 `{"code": "email_not_verified"}` from login: a fresh signup code was sent. */
  | { ok: false; kind: "unverified"; detail: string }
  | { ok: false; kind: "network" | "server" };

export function toMessages(value: unknown): string[] {
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

  return formMessages.length > 0 ? { fieldErrors, formError: formMessages.join(" ") } : { fieldErrors };
}

function bodyString(body: unknown, key: string): string | undefined {
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const value = (body as Record<string, unknown>)[key];
    if (typeof value === "string") return value;
  }
  return undefined;
}

/** Seconds to wait, from `retry_after` in the body or the Retry-After header. */
function retryAfterOf(response: Response, body: unknown): number | null {
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const value = Number((body as Record<string, unknown>).retry_after);
    if (Number.isFinite(value) && value > 0) return Math.ceil(value);
  }
  const header = Number(response.headers.get("Retry-After"));
  return Number.isFinite(header) && header > 0 ? Math.ceil(header) : null;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/** POST a public JSON form. Never throws. */
export async function postPublic<T, F extends string>(
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
      credentials: "omit",
    });
  } catch {
    // Offline, DNS/CORS failure, or the 15 s timeout fired.
    return { ok: false, kind: "network" };
  } finally {
    window.clearTimeout(timeout);
  }

  const body = await readJson(response);

  if (response.ok) {
    if (body && typeof body === "object") return { ok: true, data: body as T };
    return { ok: false, kind: "server" };
  }
  if (response.status === 429) {
    return { ok: false, kind: "rate_limited", retryAfter: retryAfterOf(response, body), detail: bodyString(body, "detail") };
  }
  if (response.status === 403 && bodyString(body, "code") === "email_not_verified") {
    return { ok: false, kind: "unverified", detail: bodyString(body, "detail") ?? "" };
  }
  if (response.status === 400 && body !== null) {
    return { ok: false, kind: "validation", ...parseValidationBody(body, fields) };
  }
  return { ok: false, kind: "server" };
}

// ---------------------------------------------------------------------------
// Signed-in calls
// ---------------------------------------------------------------------------

export type ApiErrorKind =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "validation"
  | "rate_limited"
  | "network"
  | "server";

/** Thrown by every authenticated call. `message` is plain language, safe to show. */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number;
  /** Flattened DRF messages for a 400, keyed by top-level field (e.g. `usb`). */
  readonly fieldErrors: Record<string, string[]>;
  /** Seconds to wait on a 429, when the server said. */
  readonly retryAfter: number | null;

  constructor(
    kind: ApiErrorKind,
    status: number,
    message: string,
    fieldErrors: Record<string, string[]> = {},
    retryAfter: number | null = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.retryAfter = retryAfter;
  }
}

/** True when the caller aborted the request (unmount, filter change). */
export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export const ERROR_COPY: Record<ApiErrorKind, string> = {
  unauthorized: "Your session has ended. Please log in again.",
  forbidden: "Your account isn't allowed to do that.",
  not_found: "We couldn't find that. It may have been removed.",
  conflict: "That's already been done. Refresh the page to see the latest.",
  validation: "Some details weren't accepted. Check them and try again.",
  rate_limited: "Too many attempts. Try again in a few minutes.",
  network: "Couldn't reach Zinwe. Check your internet connection and try again.",
  server: "Something went wrong on our side. Try again in a moment.",
};

/** Plain-language message for anything a dashboard call can throw. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return ERROR_COPY.server;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH";
  /** JSON body. */
  body?: unknown;
  /** Multipart body; the browser sets the Content-Type with its boundary. */
  form?: FormData;
  query?: Record<string, string | number | undefined>;
  signal?: AbortSignal;
  /** Skip the token (public GETs such as the plan list). */
  anonymous?: boolean;
}

function kindForStatus(status: number): ApiErrorKind {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 400) return "validation";
  if (status === 429) return "rate_limited";
  return "server";
}

function buildUrl(path: string, query: RequestOptions["query"]): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return `${API_BASE}${path}${qs ? `?${qs}` : ""}`;
}

/**
 * JSON (or multipart) request. Resolves with the parsed body (null for a 204);
 * throws ApiError, or the caller's AbortError.
 * A 401 clears the stored token, and the route guards send the owner to /login.
 */
export async function authedRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, form, query, signal, anonymous = false } = options;
  const token = anonymous ? null : getToken();
  if (!anonymous && !token) throw new ApiError("unauthorized", 401, ERROR_COPY.unauthorized);

  // One controller for both the 15 s timeout and the caller's own abort.
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const forwardAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", forwardAbort, { once: true });
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Token ${token}`;
  if (body !== undefined && !form) headers["Content-Type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: form ?? (body === undefined ? undefined : JSON.stringify(body)),
      signal: controller.signal,
      // Token auth only: never send cookies, so a stray Django session can't
      // switch DRF to session auth and its CSRF check.
      credentials: "omit",
    });
  } catch (error) {
    // The caller gave up (unmount, new filter): let them ignore it quietly.
    if (signal?.aborted) throw error;
    // Offline, DNS/CORS failure, or the 15 s timeout fired.
    throw new ApiError("network", 0, ERROR_COPY.network);
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener("abort", forwardAbort);
  }

  const parsed = await readJson(response);

  if (response.ok) return parsed as T;

  const kind = kindForStatus(response.status);
  if (kind === "unauthorized") {
    // Only drop the session we sent; a fresh login in another tab survives.
    if (token && getToken() === token) clearToken();
    throw new ApiError(kind, response.status, ERROR_COPY.unauthorized);
  }
  if (kind === "validation") {
    const fieldErrors: Record<string, string[]> = {};
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      for (const [key, value] of Object.entries(parsed)) {
        const messages = toMessages(value);
        if (messages.length > 0) fieldErrors[key] = messages;
      }
    }
    const first = Object.values(fieldErrors)[0]?.[0];
    throw new ApiError(kind, response.status, first ?? ERROR_COPY.validation, fieldErrors);
  }
  if (kind === "rate_limited") {
    const retryAfter = retryAfterOf(response, parsed);
    throw new ApiError(kind, response.status, bodyString(parsed, "detail") ?? ERROR_COPY.rate_limited, {}, retryAfter);
  }
  // 409 bodies carry a plain sentence ("Your company is already registered.").
  const detail = kind === "conflict" ? bodyString(parsed, "detail") : undefined;
  throw new ApiError(kind, response.status, detail ?? ERROR_COPY[kind]);
}
