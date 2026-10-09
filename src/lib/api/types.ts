/** Shapes from the portal contract (.cloude/system-design-agent/portal-v1.md §3). */

export type TeamSize = "1-10" | "11-25" | "26-50" | "50+";

export interface User {
  id: number;
  email: string;
  full_name: string;
  phone: string;
  is_staff: boolean;
  date_joined: string;
  email_verified?: boolean;
}

export type OnboardingStep = "company" | "plan" | "payment" | "payment_review" | "complete";

export type SubscriptionStatus = "pending_payment" | "active" | "expired" | "cancelled";

/** The frontend routes on `step`. */
export interface Onboarding {
  step: OnboardingStep;
  has_company: boolean;
  subscription_status: SubscriptionStatus | null;
}

export interface AuthResponse {
  token: string;
  user: User;
  onboarding: Onboarding;
}

export type Industry =
  | "it_services"
  | "manufacturing"
  | "finance"
  | "healthcare"
  | "education"
  | "retail"
  | "professional_services"
  | "other";

export interface Company {
  id: number;
  name: string;
  industry: Industry;
  team_size: TeamSize;
  phone: string;
  city: string;
  state: string;
  country: string;
  gstin: string;
  website: string;
  created_at: string;
}

export type CompanyPayload = Omit<Company, "id" | "created_at">;
export type CompanyField = keyof CompanyPayload;

export interface Plan {
  code: string;
  name: string;
  tagline: string;
  /** Decimal string, e.g. "1999.00". */
  price_inr_monthly: string;
  trial_days: number;
  max_devices: number;
  features: string[];
  is_recommended: boolean;
  requires_payment: boolean;
  sort_order: number;
  /** v1.1: `trial_days > 0` and the caller hasn't used a trial (always true signed out). */
  trial_available: boolean;
}

export type PaymentMethod = "upi" | "bank_transfer" | "paypal" | "cheque" | "cash";
export type PaymentStatus = "submitted" | "verified" | "rejected";

export interface Payment {
  id: number;
  method: PaymentMethod;
  amount_inr: string;
  reference: string;
  paid_on: string;
  payer_name: string;
  status: PaymentStatus;
  rejection_reason: string;
  has_proof: boolean;
  submitted_at: string;
  reviewed_at: string | null;
}

export interface Subscription {
  id: number;
  plan: Plan;
  status: SubscriptionStatus;
  amount_inr: string;
  billing_cycle: string;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  latest_payment: Payment | null;
  /** v1.1: a built-in free trial (amount 0, ends at `ends_at`). */
  is_trial: boolean;
}

export interface PaymentInstructions {
  upi_id: string;
  payee_name: string;
  bank_name: string;
  /** e.g. "Current" (v1.1). */
  account_type: string;
  account_number: string;
  ifsc: string;
  /** v1.1: PayPal link for payments from outside India; "" hides the option. */
  paypal_url: string;
  note: string;
}

export interface SubscriptionInfo {
  subscription: Subscription | null;
  instructions: PaymentInstructions;
}

/** GET me/ — the user plus everything the portal routes and greets with. */
export interface Me extends User {
  onboarding: Onboarding;
  company: Company | null;
  subscription: Subscription | null;
  /** Unchanged legacy field; the portal reads `subscription` instead. */
  active_plan?: unknown;
}

export interface PaymentPayload {
  method: PaymentMethod;
  amount_inr: string;
  reference: string;
  /** yyyy-mm-dd */
  paid_on: string;
  payer_name: string;
  proof: File | null;
}

export type PaymentField = keyof PaymentPayload;
