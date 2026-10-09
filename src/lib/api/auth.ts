/** Accounts: sign up, codes, log in/out, password reset, the current user. */
import { authedRequest, postPublic, type SubmitResult } from "./http";
import type { AuthResponse, Me } from "./types";

export type OtpPurpose = "signup" | "login" | "password_reset";

/** Every "a code is on its way" answer carries the resend cooldown. */
export interface CodeSent {
  detail?: string;
  /** Seconds before another code can be requested. */
  resend_in: number;
}

export interface SignupPayload {
  full_name: string;
  email: string;
  password: string;
}
export type SignupField = keyof SignupPayload;
export interface SignupResponse extends CodeSent {
  email: string;
  otp_sent: boolean;
}

/** POST signup/ — create (or refresh) an unverified account and email a code. */
export function signup(payload: SignupPayload): Promise<SubmitResult<SignupResponse, SignupField>> {
  return postPublic("/api/auth/signup/", payload, ["full_name", "email", "password"]);
}

export type CodeField = "email" | "code";

/** POST signup/verify/ — activate the account; signs the owner in. */
export function signupVerify(email: string, code: string): Promise<SubmitResult<AuthResponse, CodeField>> {
  return postPublic("/api/auth/signup/verify/", { email, code }, ["email", "code"]);
}

/** POST otp/resend/ — always 200 (no enumeration); 429 while cooling down. */
export function resendOtp(email: string, purpose: OtpPurpose): Promise<SubmitResult<CodeSent, "email">> {
  return postPublic("/api/auth/otp/resend/", { email, purpose }, ["email"]);
}

export type LoginField = "email" | "password";

/** POST login/ — 403 `unverified` when the account still needs its signup code. */
export function login(email: string, password: string): Promise<SubmitResult<AuthResponse, LoginField>> {
  return postPublic("/api/auth/login/", { email, password }, ["email", "password"]);
}

/** POST login/otp/request/ — always 200 with the same body. */
export function loginOtpRequest(email: string): Promise<SubmitResult<CodeSent, "email">> {
  return postPublic("/api/auth/login/otp/request/", { email }, ["email"]);
}

/** POST login/otp/verify/ */
export function loginOtpVerify(email: string, code: string): Promise<SubmitResult<AuthResponse, CodeField>> {
  return postPublic("/api/auth/login/otp/verify/", { email, code }, ["email", "code"]);
}

/** POST password/forgot/ — always 200 with the same body. */
export function forgotPassword(email: string): Promise<SubmitResult<CodeSent, "email">> {
  return postPublic("/api/auth/password/forgot/", { email }, ["email"]);
}

export type ResetField = "email" | "code" | "new_password";

/** POST password/reset/ — sets the password, revokes old tokens, signs in. */
export function resetPassword(
  email: string,
  code: string,
  newPassword: string,
): Promise<SubmitResult<AuthResponse, ResetField>> {
  return postPublic("/api/auth/password/reset/", { email, code, new_password: newPassword }, [
    "email",
    "code",
    "new_password",
  ]);
}

/** POST logout/ — deletes the token server-side (204). */
export function logout(signal?: AbortSignal): Promise<null> {
  return authedRequest<null>("/api/auth/logout/", { method: "POST", signal });
}

/** GET me/ — the owner, their onboarding step, company and subscription. */
export function getMe(signal?: AbortSignal): Promise<Me> {
  return authedRequest<Me>("/api/auth/me/", { signal });
}
