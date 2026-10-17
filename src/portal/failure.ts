import { ApiError, type SubmitResult } from "../lib/api";

type Failure = Exclude<SubmitResult<unknown, string>, { ok: true }>;

/** "45 seconds" / "3 minutes". */
export function formatWait(seconds: number): string {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

export const NETWORK_COPY = "Couldn't reach Zinwe. Check your internet connection and try again.";
export const SERVER_COPY = "Something went wrong on our side. Try again in a moment.";

function waitCopy(retryAfter: number | null): string {
  return retryAfter
    ? `Too many tries. Try again in ${formatWait(retryAfter)}.`
    : "Too many tries. Wait a few minutes, then try again.";
}

/** One plain sentence for a failed public form (field errors are shown separately). */
export function failureMessage(result: Failure): string {
  switch (result.kind) {
    case "validation":
      return result.formError ?? "Check the details above and try again.";
    case "rate_limited":
      return waitCopy(result.retryAfter);
    case "unverified":
      return result.detail || "Verify your email to continue.";
    case "paused":
      return result.detail || "Your Zinwe account is paused. Write to hello@zinwe.io and we'll help.";
    case "network":
      return NETWORK_COPY;
    case "server":
      return SERVER_COPY;
  }
}

/** Same for a thrown ApiError from a signed-in form. */
export function apiFailureMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return SERVER_COPY;
  if (error.kind === "rate_limited") return waitCopy(error.retryAfter);
  return error.message;
}

/** First message per field from an ApiError (400), for inline errors. */
export function apiFieldErrors<F extends string>(error: unknown, fields: readonly F[]): Partial<Record<F, string>> {
  const out: Partial<Record<F, string>> = {};
  if (!(error instanceof ApiError) || error.kind !== "validation") return out;
  for (const field of fields) {
    const message = error.fieldErrors[field]?.[0];
    if (message) out[field] = message;
  }
  return out;
}

/** Form-level message for a 400 whose messages aren't all tied to a rendered field. */
export function apiFormError(error: unknown, fields: readonly string[]): string | null {
  if (!(error instanceof ApiError)) return SERVER_COPY;
  if (error.kind !== "validation") return apiFailureMessage(error);
  const other = Object.entries(error.fieldErrors)
    .filter(([key]) => !fields.includes(key))
    .flatMap(([, messages]) => messages);
  if (other.length > 0) return other.join(" ");
  return Object.keys(error.fieldErrors).length > 0 ? null : error.message;
}
