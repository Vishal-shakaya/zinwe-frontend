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
  { id: "pm-cheque", value: "cheque", label: "Cheque" },
  { id: "pm-cash", value: "cash", label: "Cash" },
];

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  upi: "UPI",
  bank_transfer: "Bank transfer",
  cheque: "Cheque",
  cash: "Cash",
};

/** Label for the reference field, by payment method. */
export const REFERENCE_LABEL: Record<PaymentMethod, string> = {
  upi: "UPI transaction ID (UTR)",
  bank_transfer: "UTR or reference number",
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

/** Shown on /signup when the visitor came from a plan CTA (`?plan=`). */
export const PLAN_INTENT_COPY: Record<string, string> = {
  free: "Free plan: up to 3 PCs, free forever.",
  "early-access": "Early access: the full plan, free for 3 months.",
  pro: "Pro plan: everything, for growing teams.",
};

/** Side panel on the sign-up, login and reset pages. */
export const AUTH_POINTS: ReadonlyArray<{ title: string; detail: string }> = [
  { title: "Plain-English alerts", detail: "Know when files go to a USB drive or someone connects remotely." },
  { title: "Set up in minutes", detail: "Install the agent on each PC with one key. No IT team needed." },
  { title: "Fair to your team", detail: "Aligned with India's DPDP Act from day one." },
];

export const ONBOARDING_STEPS = [
  { key: "company", label: "Company" },
  { key: "plan", label: "Plan" },
  { key: "subscribe", label: "Activate" },
] as const;
