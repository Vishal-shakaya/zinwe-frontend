import type { Onboarding, OnboardingStep, Subscription } from "../lib/api";

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
