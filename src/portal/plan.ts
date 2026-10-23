import type { Plan, TeamSize } from "../lib/api";
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

/** A currency the plans can be shown in (the two we bill in): the /plans page's "Show prices in" choice. */
export type ShowCurrency = "INR" | "USD";

/**
 * USD prices: the currency chosen on /plans (`show`), else the owner's own (their quote says so). A plan with no
 * USD price stays in rupees.
 */
function inUsd(plan: Plan, show?: ShowCurrency): boolean {
  const hasUsd = Number(plan.price_usd_monthly ?? 0) > 0;
  if (show) return show === "USD" && hasUsd;
  return plan.quote?.currency === "USD" && hasUsd;
}

/** The discount to show: the struck-through list price and "28% off", or null when there's none. */
export function planDiscount(plan: Plan, show?: ShowCurrency): { was: string; percent: number } | null {
  if (inUsd(plan, show)) {
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
 * "Outside India: $12 a month, billed yearly ($144)". Null once the owner's country is known, or when a
 * currency was chosen (`show`).
 */
export function planAltPrice(plan: Plan, show?: ShowCurrency): string | null {
  if (show || plan.quote || isZero(plan.price_inr_monthly)) return null;
  const usd = Number(plan.price_usd_monthly ?? 0);
  if (!(usd > 0)) return null;
  return `Outside India: ${formatMoney(usd, "USD")} a month, billed yearly (${formatMoney(usd * 12, "USD")})`;
}

/**
 * "₹971" + "a month + GST" (India), "$12" + "a month, billed yearly ($144)" (outside India),
 * "₹0" + "free forever", or a trial's "₹2,999" + "a month after 3 months free".
 */
export function planPrice(plan: Plan, show?: ShowCurrency): { big: string; small: string } {
  if (inUsd(plan, show) && !isZero(plan.price_inr_monthly)) {
    const usd = Number(plan.price_usd_monthly ?? 0);
    return { big: formatMoney(usd, "USD"), small: `a month, billed yearly (${formatMoney(usd * 12, "USD")})` };
  }
  if (isZero(plan.price_inr_monthly)) {
    // Owners billed in dollars see "$0". Legacy zero-price trial plans (early-access) still appear on old subscriptions.
    const big = (show ?? plan.quote?.currency) === "USD" ? formatMoney(0, "USD") : "₹0";
    return { big, small: plan.trial_days > 0 ? `for ${trialSpan(plan)}` : "free forever" };
  }
  const big = formatInr(plan.price_inr_monthly);
  if (hasTrial(plan)) return { big, small: `a month after ${trialSpan(plan)} free` };
  return { big, small: planChargesGst(plan) ? "a month + GST" : "a month" };
}

/**
 * GST is added on top of this plan's price: what the signed-in owner's quote says, else the server's
 * `gst_charged` (seller registered for GST). Never assumed: an older backend without the flag promises no GST.
 */
export function planChargesGst(plan: Plan): boolean {
  if (plan.quote) return plan.quote.taxes.length > 0;
  return plan.gst_charged === true;
}

/** Upper end of the company form's team size, as a PC count ("11-25" -> 25). */
export function pcsForTeamSize(teamSize: TeamSize | "" | null | undefined): number | null {
  switch (teamSize) {
    case "1-10":
      return 10;
    case "11-25":
      return 25;
    case "26-50":
      return 50;
    case "50+":
      return 51;
    default:
      return null;
  }
}

/** The smallest plan on sale that covers `pcs` PCs (max_devices 0 = no limit); null when none does. */
export function planForPcs(plans: readonly Plan[], pcs: number): Plan | null {
  if (!(pcs > 0)) return null;
  const limit = (p: Plan) => (p.max_devices > 0 ? p.max_devices : Number.POSITIVE_INFINITY);
  const fits = plans.filter((p) => limit(p) >= pcs);
  if (fits.length === 0) return null;
  return fits.reduce((best, p) =>
    limit(p) < limit(best) || (limit(p) === limit(best) && p.sort_order < best.sort_order) ? p : best,
  );
}

/** "Start free trial" or "Choose Startups". */
export function planCtaLabel(plan: Plan): string {
  return hasTrial(plan) ? "Start free trial" : `Choose ${plan.name}`;
}

export function planDevices(plan: Plan): string {
  return `Up to ${plan.max_devices} PC${plan.max_devices === 1 ? "" : "s"}`;
}
