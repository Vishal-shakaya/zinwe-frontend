/** Company, plans, subscription and manual payment. */
import { ApiError, authedDownload, authedRequest } from "./http";
import type {
  Company,
  CompanyPayload,
  Payment,
  PaymentPayload,
  Plan,
  SharedQuote,
  Subscription,
  SubscriptionInfo,
} from "./types";

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

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

/** A frozen tax invoice (backend z_auth/invoices.py). Amounts are in `currency`. */
export interface Invoice {
  number: string;
  title?: string;
  issued_on: string;
  paid_on: string;
  status: "paid";
  currency?: "INR" | "USD";
  seller: { name: string; address: string; email: string; gstin: string; state?: string };
  customer: { name: string; contact: string; email: string; address: string; gstin: string; state?: string; country?: string };
  place_of_supply?: string;
  export?: boolean;
  lines: Array<{
    description: string;
    sac?: string;
    period_from: string | null;
    period_until: string | null;
    list_amount?: string;
    discount_amount?: string;
    amount?: string;
    amount_inr: string;
  }>;
  taxable_amount?: string;
  taxes?: Array<{ label: string; rate: string; amount: string }>;
  tax_total?: string;
  total?: string;
  total_inr: string;
  total_in_words?: string;
  payment: { method: string; reference: string; payer: string; amount_paid?: string };
  notes?: string[];
  note: string;
}

/** Download the invoice PDF of a confirmed payment. */
export function downloadInvoicePdf(paymentId: number, number?: string | null): Promise<void> {
  const name = `Zinwe-invoice-${(number ?? String(paymentId)).replace(/\//g, "-")}.pdf`;
  return authedDownload(`/api/auth/subscription/payments/${paymentId}/invoice/pdf/`, name);
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
  for (const key of ["method", "amount_inr", "reference", "paid_on", "payer_name"] as const) {
    const value = payload[key];
    if (value) form.append(key, value);
  }
  if (payload.proof) form.append("proof", payload.proof, payload.proof.name);
  if (payload.upgrade_plan) form.append("upgrade_plan", payload.upgrade_plan);
  form.append("accept_terms", payload.accept_terms ? "true" : "false");
  return authedRequest<Payment>("/api/auth/subscription/payment/", { method: "POST", form });
}

/** GET subscription/quote/ — the owner's quote and its public link (409 when nothing is due). */
export function getMyQuote(signal?: AbortSignal): Promise<SharedQuote> {
  return authedRequest<SharedQuote>("/api/auth/subscription/quote/", { signal });
}

/** POST subscription/quote/email/ — email the quote PDF (attached) to the owner, or to `email`. */
export function emailQuote(email = ""): Promise<{ sent_to: string; public_url: string }> {
  return authedRequest("/api/auth/subscription/quote/email/", { method: "POST", body: email ? { email } : {} });
}

/** Download the owner's quote as a PDF. */
export function downloadQuotePdf(): Promise<void> {
  return authedDownload("/api/auth/subscription/quote/pdf/", "Zinwe-quote.pdf");
}

/** GET quotes/<token>/ — a shared quote, for anyone with the link (404 once nothing is due). */
export function getPublicQuote(token: string, signal?: AbortSignal): Promise<SharedQuote> {
  return authedRequest<SharedQuote>(`/api/auth/quotes/${encodeURIComponent(token)}/`, { anonymous: true, signal });
}

/** The shared quote's PDF, as a plain link (no sign-in needed). */
export function publicQuotePdfUrl(token: string): string {
  return `${API_BASE}/api/auth/quotes/${encodeURIComponent(token)}/pdf/`;
}
