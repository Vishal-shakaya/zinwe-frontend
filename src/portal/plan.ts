import type { Plan } from "../lib/api";
import { formatDate, formatInr, formatMoney, isZero } from "../lib/format";

const DAY_MS = 86_400_000;

/** A built-in free trial this caller can still start (v1.1: one per account, ever). */
export function hasTrial(plan: Plan): boolean {
  return plan.trial_days > 0 && plan.trial_available;
}

/** 90 -> 3 (months); 0 when the trial is shorter than a month. */
export function trialMonths(plan: Plan): number {
  return plan.trial_days >= 28 ? Math.round(plan.trial_days / 30) : 0;
}

/** "3 months", "1 month", "14 days". */
export function trialSpan(plan: Plan): string {
  const months = trialMonths(plan);
  if (months >= 1) return `${months} month${months === 1 ? "" : "s"}`;
  return `${plan.trial_days} day${plan.trial_days === 1 ? "" : "s"}`;
}

/** "3-month", "14-day" (adjective form, e.g. "your 3-month free trial"). */
export function trialSpanAdjective(plan: Plan): string {
  const months = trialMonths(plan);
  return months >= 1 ? `${months}-month` : `${plan.trial_days}-day`;
}

/** "First 3 months free". */
export function trialBadge(plan: Plan): string {
  return `First ${trialSpan(plan)} free`;
}

/**
 * Feature lines without the seeded "First 3 months free" line: the badge says it when the
 * trial is available, and it would be wrong once the caller has used their trial.
 */
export function planFeatures(plan: Plan): string[] {
  if (plan.trial_days <= 0) return plan.features;
  const badge = trialBadge(plan).toLowerCase();
  return plan.features.filter((f) => f.trim().replace(/\.$/, "").toLowerCase() !== badge);
}

/** When a trial started today would end, e.g. "7 Jan 2027". */
export function trialEndDate(plan: Plan, from = Date.now()): string {
  return formatDate(new Date(from + plan.trial_days * DAY_MS).toISOString());
}

/** Owners outside India (the plan's quote says so) see USD prices. */
function inUsd(plan: Plan): boolean {
  return plan.quote?.currency === "USD" && Number(plan.price_usd_monthly ?? 0) > 0;
}

/** The discount to show: the struck-through list price and "28% off", or null when there's none. */
export function planDiscount(plan: Plan): { was: string; percent: number } | null {
  if (inUsd(plan)) {
    const list = Number(plan.list_price_usd_monthly ?? 0);
    const price = Number(plan.price_usd_monthly ?? 0);
    if (!(list > price) || price <= 0) return null;
    return { was: formatMoney(list, "USD"), percent: Math.round((1 - price / list) * 100) };
  }
  const list = Number(plan.list_price_inr_monthly ?? 0);
  const percent = plan.discount_percent ?? 0;
  if (!(list > Number(plan.price_inr_monthly)) || percent <= 0) return null;
  return { was: formatInr(plan.list_price_inr_monthly ?? "0"), percent };
}

/**
 * The other currency's price, for visitors who aren't signed in (we don't know their country):
 * "Outside India: $12 a month, billed yearly ($144)". Null once the owner's country is known.
 */
export function planAltPrice(plan: Plan): string | null {
  if (plan.quote || isZero(plan.price_inr_monthly)) return null;
  const usd = Number(plan.price_usd_monthly ?? 0);
  if (!(usd > 0)) return null;
  return `Outside India: ${formatMoney(usd, "USD")} a month, billed yearly (${formatMoney(usd * 12, "USD")})`;
}

/**
 * "₹971" + "a month + GST" (India), "$12" + "a month, billed yearly ($144)" (outside India),
 * "₹0" + "free forever", or a trial's "₹2,999" + "a month after 3 months free".
 */
export function planPrice(plan: Plan): { big: string; small: string } {
  if (inUsd(plan) && !isZero(plan.price_inr_monthly)) {
    const usd = Number(plan.price_usd_monthly ?? 0);
    return { big: formatMoney(usd, "USD"), small: `a month, billed yearly (${formatMoney(usd * 12, "USD")})` };
  }
  if (isZero(plan.price_inr_monthly)) {
    // Legacy zero-price trial plans (early-access) still appear on old subscriptions.
    return { big: "₹0", small: plan.trial_days > 0 ? `for ${trialSpan(plan)}` : "free forever" };
  }
  const big = formatInr(plan.price_inr_monthly);
  if (hasTrial(plan)) return { big, small: `a month after ${trialSpan(plan)} free` };
  // India: GST is added on top (the business norm). Signed-in owners see what their quote says.
  const gst = plan.quote ? plan.quote.taxes.length > 0 : true;
  return { big, small: gst ? "a month + GST" : "a month" };
}

/** "Start free trial" or "Choose Startups". */
export function planCtaLabel(plan: Plan): string {
  return hasTrial(plan) ? "Start free trial" : `Choose ${plan.name}`;
}

export function planDevices(plan: Plan): string {
  return `Up to ${plan.max_devices} PC${plan.max_devices === 1 ? "" : "s"}`;
}
