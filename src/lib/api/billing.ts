/** Company, plans, subscription and manual payment. */
import { ApiError, authedRequest } from "./http";
import type {
  Company,
  CompanyPayload,
  Payment,
  PaymentPayload,
  Plan,
  Subscription,
  SubscriptionInfo,
} from "./types";

/** GET company/ — throws ApiError `not_found` before the company is registered. */
export function getCompany(signal?: AbortSignal): Promise<Company> {
  return authedRequest<Company>("/api/auth/company/", { signal });
}

/** POST company/ — 409 `conflict` if one is already registered. */
export function createCompany(payload: CompanyPayload): Promise<Company> {
  return authedRequest<Company>("/api/auth/company/", { method: "POST", body: payload });
}

/** PATCH company/ */
export function updateCompany(payload: Partial<CompanyPayload>): Promise<Company> {
  return authedRequest<Company>("/api/auth/company/", { method: "PATCH", body: payload });
}

/**
 * GET plans/ — public, ordered by sort_order. Signed-in callers send their token
 * so `trial_available` reflects their own account (one free trial, ever).
 * A stale token (401) is cleared by the transport; the list is then fetched anonymously.
 */
export async function getPlans(signal?: AbortSignal): Promise<Plan[]> {
  try {
    return await authedRequest<Plan[]>("/api/auth/plans/", { signal, optionalAuth: true });
  } catch (error) {
    if (error instanceof ApiError && error.kind === "unauthorized") {
      return authedRequest<Plan[]>("/api/auth/plans/", { signal, anonymous: true });
    }
    throw error;
  }
}

/** GET subscription/ — the latest subscription (or null) and how to pay. */
export function getSubscription(signal?: AbortSignal): Promise<SubscriptionInfo> {
  return authedRequest<SubscriptionInfo>("/api/auth/subscription/", { signal });
}

/** POST subscription/ — free/trial plans come back `active`, paid ones `pending_payment`. */
export function createSubscription(plan: string): Promise<Subscription> {
  return authedRequest<Subscription>("/api/auth/subscription/", { method: "POST", body: { plan } });
}

export interface Invoice {
  number: string;
  issued_on: string;
  paid_on: string;
  status: "paid";
  seller: { name: string; address: string; email: string; gstin: string };
  customer: { name: string; contact: string; email: string; address: string; gstin: string };
  lines: Array<{ description: string; period_from: string | null; period_until: string | null; amount_inr: string }>;
  total_inr: string;
  payment: { method: string; reference: string; payer: string };
  note: string;
}

/** GET subscription/payments/<id>/invoice/ — only for confirmed payments (409 before). */
export function getInvoice(paymentId: number, signal?: AbortSignal): Promise<Invoice> {
  return authedRequest<Invoice>(`/api/auth/subscription/payments/${paymentId}/invoice/`, { signal });
}

/** GET subscription/payments/ — every payment the owner reported, newest first. */
export function getPaymentHistory(signal?: AbortSignal): Promise<Payment[]> {
  return authedRequest<Payment[]>("/api/auth/subscription/payments/", { signal });
}

/** POST subscription/payment/ — multipart, so the proof file can ride along. A payment made
 * while a paid plan is active is a renewal: it adds a month once confirmed. */
export function submitPayment(payload: PaymentPayload): Promise<Payment> {
  const form = new FormData();
  form.append("method", payload.method);
  form.append("amount_inr", payload.amount_inr);
  form.append("reference", payload.reference);
  form.append("paid_on", payload.paid_on);
  form.append("payer_name", payload.payer_name);
  if (payload.proof) form.append("proof", payload.proof, payload.proof.name);
  if (payload.upgrade_plan) form.append("upgrade_plan", payload.upgrade_plan);
  return authedRequest<Payment>("/api/auth/subscription/payment/", { method: "POST", form });
}
