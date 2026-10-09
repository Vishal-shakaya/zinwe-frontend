import type { Plan } from "../lib/api";
import { formatInr, isZero } from "../lib/format";

/** "₹1,999 / month", "Free", "Free for 3 months". */
export function planPrice(plan: Plan): { big: string; small: string } {
  if (plan.trial_days > 0) {
    const months = Math.round(plan.trial_days / 30);
    const span = months >= 1 ? `${months} month${months === 1 ? "" : "s"}` : `${plan.trial_days} days`;
    return { big: "₹0", small: `for ${span}` };
  }
  if (isZero(plan.price_inr_monthly)) return { big: "₹0", small: "free forever" };
  return { big: formatInr(plan.price_inr_monthly), small: "per month" };
}

export function planDevices(plan: Plan): string {
  return `Up to ${plan.max_devices} PC${plan.max_devices === 1 ? "" : "s"}`;
}
