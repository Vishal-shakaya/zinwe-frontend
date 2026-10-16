import type { Industry, PaymentMethod, PaymentStatus, SubscriptionStatus } from "../lib/api";
import type { ChoiceOption } from "./forms";

export const industryOptions: ReadonlyArray<{ value: Industry; label: string }> = [
  { value: "it_services", label: "IT services" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "finance", label: "Finance and accounting" },
  { value: "healthcare", label: "Healthcare" },
  { value: "education", label: "Education" },
  { value: "retail", label: "Retail" },
  { value: "professional_services", label: "Professional services" },
  { value: "other", label: "Something else" },
];

export const paymentMethodOptions: ChoiceOption<PaymentMethod>[] = [
  { id: "pm-upi", value: "upi", label: "UPI" },
  { id: "pm-bank", value: "bank_transfer", label: "Bank transfer" },
  { id: "pm-paypal", value: "paypal", label: "PayPal" },
  { id: "pm-skydo", value: "skydo", label: "Skydo (card or US bank)" },
  { id: "pm-cheque", value: "cheque", label: "Cheque" },
  { id: "pm-cash", value: "cash", label: "Cash" },
];

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  upi: "UPI",
  bank_transfer: "Bank transfer",
  paypal: "PayPal",
  skydo: "Skydo",
  cheque: "Cheque",
  cash: "Cash",
};

/** Label for the reference field, by payment method. */
export const REFERENCE_LABEL: Record<PaymentMethod, string> = {
  upi: "UPI transaction ID (UTR)",
  bank_transfer: "UTR or reference number",
  paypal: "PayPal transaction ID",
  skydo: "Skydo payment ID (or the bank transfer reference)",
  cheque: "Cheque number",
  cash: "Receipt number",
};

export const SUBSCRIPTION_STATUS_LABEL: Record<SubscriptionStatus, string> = {
  pending_payment: "Waiting for payment",
  active: "Active",
  expired: "Expired",
  cancelled: "Cancelled",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  submitted: "Being checked",
  verified: "Verified",
  rejected: "Not accepted",
};

/** Shown on /signup when the visitor came from a plan CTA (`?plan=`; `early-access` arrives as `businesses`). */
export const PLAN_INTENT_COPY: Record<string, string> = {
  free: "Free forever: up to 3 PCs, no payment ever.",
  startups: "Startups plan: full data protection for up to 10 PCs.",
  businesses: "Businesses plan: data protection plus work hours and team chat, for up to 50 PCs.",
};

/** Side panel on the sign-up, login and reset pages. */
export const AUTH_POINTS: ReadonlyArray<{ title: string; detail: string }> = [
  { title: "Plain-English alerts", detail: "Know when files go to a USB drive or a remote-access tool runs." },
  { title: "Set up in minutes", detail: "Install the agent on each PC with one key. No IT team needed." },
  { title: "Fair to your team", detail: "Each person agrees on their own PC. Built around India's DPDP Act and US notice laws." },
];

export const ONBOARDING_STEPS = [
  { key: "company", label: "Company" },
  { key: "plan", label: "Plan" },
  { key: "subscribe", label: "Activate" },
] as const;
