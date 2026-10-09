/**
 * Typed client for the Zinwe Django API.
 *
 * API_BASE is empty in development, so requests hit /api/... on the Vite dev
 * server and are proxied to http://127.0.0.1:8000 (see vite.config.ts).
 *
 * Public calls (early access, login) return a discriminated union. Dashboard
 * calls send "Authorization: Token <token>" and throw ApiError instead.
 */
import { clearToken, getToken } from "./session";

const API_BASE =(import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

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

// ---------------------------------------------------------------------------
// Owner dashboard: login + authenticated calls
// ---------------------------------------------------------------------------

export interface User {
  id: number;
  email: string;
  full_name: string;
  company: string;
  phone: string;
  is_staff: boolean;
  date_joined: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export type LoginField = keyof LoginPayload;

export interface LoginResponse {
  token: string;
  user: User;
}

export type LoginResult = SubmitResult<LoginResponse, LoginField>;

/** POST /api/auth/login/ — exchange email + password for a token. */
export function login(payload: LoginPayload): Promise<LoginResult> {
  return postJson<LoginResponse, LoginField>("/api/auth/login/", payload, ["email", "password"]);
}

export interface Device {
  id: number;
  hostname: string;
  /** "windows" | "linux" | "macos" today; kept open for new agents. */
  platform: string;
  os_version: string;
  agent_version: string;
  enrolled_at: string;
  last_seen_at: string | null;
  is_online: boolean;
  is_revoked: boolean;
}

export interface EnrollmentKey {
  key: string;
  created_at: string;
  last_used_at: string | null;
}

export type UsbMode = "allow" | "read_only" | "block";

export interface Policy {
  version: number;
  usb: { mode: UsbMode };
  updated_at: string;
}

export type EventSeverity = "info" | "warning" | "critical";

export interface DeviceEvent {
  id: number;
  device_id: number;
  hostname: string;
  type: string;
  /** "info" | "warning" | "critical"; unknown values render as info. */
  severity: string;
  title: string;
  occurred_at: string;
  received_at: string;
  data: Record<string, unknown>;
}

export type ApiErrorKind =
  | "unauthorized"
  | "forbidden"
  | "not_found"
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

  constructor(kind: ApiErrorKind, status: number, message: string, fieldErrors: Record<string, string[]> = {}) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

/** True when the caller aborted the request (unmount, filter change). */
export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

const ERROR_COPY: Record<ApiErrorKind, string> = {
  unauthorized: "Your session has ended. Please log in again.",
  forbidden: "Your account isn't allowed to do that.",
  not_found: "We couldn't find that. It may have been removed.",
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

interface RequestOptions {
  method?: "GET" | "POST" | "PUT";
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  signal?: AbortSignal;
}

function kindForStatus(status: number): ApiErrorKind {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
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
 * Authenticated JSON request ("Authorization: Token <token>").
 * Resolves with the parsed body; throws ApiError, or the caller's AbortError.
 * A 401 clears the stored token, and the auth context sends the owner to /login.
 */
async function authedRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, signal } = options;
  const token = getToken();
  if (!token) throw new ApiError("unauthorized", 401, ERROR_COPY.unauthorized);

  // One controller for both the 15 s timeout and the caller's own abort.
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const forwardAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", forwardAbort, { once: true });
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Token ${token}`,
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
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

  let parsed: unknown = null;
  try {
    parsed = await response.json();
  } catch {
    parsed = null;
  }

  if (response.ok) return parsed as T;

  const kind = kindForStatus(response.status);
  if (kind === "unauthorized") {
    // Only drop the session we sent; a fresh login in another tab survives.
    if (getToken() === token) clearToken();
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
  throw new ApiError(kind, response.status, ERROR_COPY[kind]);
}

/** GET /api/auth/me/ — the logged-in owner. */
export function getMe(signal?: AbortSignal): Promise<User> {
  return authedRequest<User>("/api/auth/me/", { signal });
}

/** GET /api/devices/ — the owner's PCs with online status. */
export function listDevices(signal?: AbortSignal): Promise<Device[]> {
  return authedRequest<Device[]>("/api/devices/", { signal });
}

/** GET /api/devices/enrollment-key/ — the key new PCs join with (created on first call). */
export function getEnrollmentKey(signal?: AbortSignal): Promise<EnrollmentKey> {
  return authedRequest<EnrollmentKey>("/api/devices/enrollment-key/", { signal });
}

/** POST /api/devices/enrollment-key/rotate/ — retire the key and issue a new one. */
export function rotateEnrollmentKey(): Promise<EnrollmentKey> {
  return authedRequest<EnrollmentKey>("/api/devices/enrollment-key/rotate/", { method: "POST", body: {} });
}

/** GET /api/devices/policy/ — the rules every PC follows. */
export function getPolicy(signal?: AbortSignal): Promise<Policy> {
  return authedRequest<Policy>("/api/devices/policy/", { signal });
}

/** PUT /api/devices/policy/ — change the rules; the version goes up only when something changed. */
export function updatePolicy(usbMode: UsbMode): Promise<Policy> {
  return authedRequest<Policy>("/api/devices/policy/", { method: "PUT", body: { usb: { mode: usbMode } } });
}

export const EVENTS_DEFAULT_LIMIT = 50;
export const EVENTS_MAX_LIMIT = 200;

/** GET /api/devices/events/ — newest first, the owner's PCs only. */
export function listEvents(
  params: { device?: number; limit?: number } = {},
  signal?: AbortSignal,
): Promise<DeviceEvent[]> {
  return authedRequest<DeviceEvent[]>("/api/devices/events/", {
    query: { device: params.device, limit: params.limit },
    signal,
  });
}
