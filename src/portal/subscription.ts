import type { Subscription } from "../lib/api";
import { daysUntil, formatInr, isZero } from "../lib/format";

/**
 * A built-in free trial (v1.1 `is_trial`). Legacy zero-price trial plans
 * (early access) predate the flag and are treated the same way.
 */
export function isTrialSubscription(subscription: Subscription): boolean {
  if (subscription.is_trial === true) return true;
  return isZero(subscription.amount_inr) && subscription.plan.trial_days > 0;
}

/** "₹2,999/month" — what the plan costs once the trial is over (null for a free plan). */
export function priceAfterTrial(subscription: Subscription): string | null {
  const price = subscription.plan.price_inr_monthly;
  return isZero(price) ? null : `${formatInr(price)}/month`;
}

/** "₹1,999 a month" / "Free" / "Free trial". */
export function subscriptionPrice(subscription: Subscription): string {
  if (isTrialSubscription(subscription)) return "Free trial";
  if (isZero(subscription.amount_inr)) return "Free";
  const cycle = subscription.billing_cycle === "monthly" ? "a month" : subscription.billing_cycle;
  return `${formatInr(subscription.amount_inr)} ${cycle}`;
}

/** "23 days left" for an active plan with an end date. */
export function daysLeftLabel(subscription: Subscription): string | null {
  if (subscription.status !== "active") return null;
  const days = daysUntil(subscription.ends_at);
  if (days === null) return null;
  if (days === 0) return "Ends today";
  return `${days} day${days === 1 ? "" : "s"} left`;
}

/** "Free trial · 83 days left · then ₹2,999/month" (or "Free trial ended" once expired). */
export function trialLine(subscription: Subscription): string {
  if (subscription.status === "expired") return "Free trial ended";
  const parts = ["Free trial"];
  const left = daysLeftLabel(subscription);
  if (left) parts.push(left === "Ends today" ? "ends today" : left);
  const after = priceAfterTrial(subscription);
  if (after) parts.push(`then ${after}`);
  return parts.join(" · ");
}
