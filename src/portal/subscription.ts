import type { Subscription } from "../lib/api";
import { daysUntil, formatInr, isZero } from "../lib/format";

/** "₹1,999 a month" / "Free". */
export function subscriptionPrice(subscription: Subscription): string {
  if (isZero(subscription.amount_inr)) return subscription.plan.trial_days > 0 ? "Free during the trial" : "Free";
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
