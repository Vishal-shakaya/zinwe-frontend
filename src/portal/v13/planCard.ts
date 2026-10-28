import type { BillingCycle, Plan } from "../../lib/api";
import { formatMoney, isZero } from "../../lib/format";

/** "7 days", "90 days", "180 days", "1 year", "unlimited". */
export function historyLabel(days: number | undefined): string | null {
  if (days === undefined) return null;
  if (days <= 0) return "unlimited";
  if (days % 365 === 0) return `${days / 365} year${days === 365 ? "" : "s"}`;
  return `${days} day${days === 1 ? "" : "s"}`;
}

/** The owner's own price incl. tax for the shown cycle, e.g. "₹2,123 a month incl GST" (null when not known). */
export function inclTaxLine(plan: Plan, cycle: BillingCycle): string | null {
  const quote = plan.quote;
  if (!quote || quote.billing_cycle !== cycle || quote.taxes.length === 0 || isZero(plan.price_inr_monthly)) return null;
  return `${formatMoney(quote.total, quote.currency)} a ${cycle === "yearly" ? "year" : "month"} incl GST`;
}
