import type { Onboarding, OnboardingStep, Payment, Subscription } from "../lib/api";

/**
 * A payment the owner sent while their plan was already active (an upgrade or a renewal) that the Zinwe
 * team hasn't checked yet. While it's being checked nothing may sell the upgrade again: no upgrade bar,
 * no sidebar Upgrade button, no PC-limit upsell, and the plan cards say "Payment being checked" (J3-01).
 */
export interface PaymentInCheck {
  kind: "upgrade" | "renewal";
  /** The plan the upgrade moves to (upgrade), or the current plan (renewal). */
  planName: string;
  payment: Payment;
}

export function paymentInCheck(subscription: Subscription | null | undefined): PaymentInCheck | null {
  if (!subscription || subscription.status !== "active") return null;
  const payment = subscription.latest_payment;
  if (!payment || payment.status !== "submitted") return null;
  const upgradeTo = payment.upgrade_plan_name?.trim();
  if (upgradeTo) return { kind: "upgrade", planName: upgradeTo, payment };
  return { kind: payment.is_renewal ? "renewal" : "upgrade", planName: subscription.plan.name, payment };
}

/** An active plan with an upgrade (or renewal) payment waiting to be checked: don't offer the upgrade again. */
export function upgradeBeingChecked(subscription: Subscription | null | undefined): boolean {
  return paymentInCheck(subscription) !== null;
}

/** The newest payment was not accepted by the Zinwe team (its `rejection_reason` says why), or null. */
export function rejectedPayment(subscription: Subscription | null | undefined): Payment | null {
  const payment = subscription?.latest_payment;
  return payment && payment.status === "rejected" ? payment : null;
}

/** Where each onboarding step lives (contract §5 guards). Signing in lands here. */
export function stepPath(step: OnboardingStep): string {
  switch (step) {
    case "company":
      return "/onboarding/company";
    case "plan":
      return "/onboarding/plan";
    case "payment":
      return "/onboarding/subscribe";
    case "payment_review":
    case "complete":
      return "/app";
  }
}

/**
 * Steps that may use the dashboard: everyone with a company (2026-10-16). Before a paid plan is
 * active the dashboard runs on the Free plan's features, with a bar linking back to the plan or payment.
 */
export const APP_STEPS: readonly OnboardingStep[] = ["plan", "payment", "payment_review", "complete"];

export function canUseApp(step: OnboardingStep): boolean {
  return APP_STEPS.includes(step);
}

/** A plan is chosen and paid for (or its payment is being checked): plan pages point to Billing. */
export function hasSettledPlan(step: OnboardingStep): boolean {
  return step === "payment_review" || step === "complete";
}

/**
 * The step after creating or paying for a subscription, so the portal can move
 * on even if the follow-up GET me/ fails (it is refreshed again on the next load).
 */
export function onboardingFor(subscription: Subscription): Onboarding {
  const base = { has_company: true, subscription_status: subscription.status };
  if (subscription.status === "active") return { ...base, step: "complete" };
  if (subscription.status === "pending_payment") {
    const submitted = subscription.latest_payment?.status === "submitted";
    return { ...base, step: submitted ? "payment_review" : "payment" };
  }
  return { ...base, step: "plan" };
}
