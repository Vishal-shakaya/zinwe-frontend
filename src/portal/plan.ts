import type { BillingCycle, Plan, TeamSize } from "../lib/api";
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

/** A currency the plans can be shown in (the two we bill in): the /plans page's currency choice. */
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

/** The currency a plan card shows: the chosen one, else the owner's own, else rupees. */
export function planCurrency(plan: Plan, show?: ShowCurrency): ShowCurrency {
  return inUsd(plan, show) ? "USD" : "INR";
}

/** The best yearly saving across these plans, in whole percent ("Save up to 17%"); 0 when a year saves nothing. */
export function bestYearlySaving(plans: readonly Plan[], currency: ShowCurrency): number {
  return plans.reduce((best, p) => Math.max(best, p.prices?.[currency]?.yearly_saving_percent ?? 0), 0);
}

/** A year's price for this plan (whole year, before tax), when the server sent prices; null otherwise. */
function yearly(plan: Plan, currency: ShowCurrency): { list: number; price: number } | null {
  const year = plan.prices?.[currency]?.yearly;
  if (!year) return null;
  return { list: Number(year.list), price: Number(year.price) };
}

/** The discount to show: the struck-through list price and "28% off", or null when there's none. */
export function planDiscount(
  plan: Plan,
  show?: ShowCurrency,
  cycle?: BillingCycle,
): { was: string; percent: number } | null {
  const currency = planCurrency(plan, show);
  const year = cycle === "yearly" ? yearly(plan, currency) : null;
  if (year) {
    // A year against 12 months at the list price, shown per month like the price.
    if (!(year.list > year.price) || year.price <= 0) return null;
    return { was: formatMoney(Math.round(year.list / 12), currency), percent: Math.round((1 - year.price / year.list) * 100) };
  }
  if (currency === "USD") {
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
 * "International: $12 a month". Null once the owner's country is known, or when a currency was chosen (`show`).
 */
export function planAltPrice(plan: Plan, show?: ShowCurrency): string | null {
  if (show || plan.quote || isZero(plan.price_inr_monthly)) return null;
  const usd = Number(plan.price_usd_monthly ?? 0);
  if (!(usd > 0)) return null;
  return `International: ${formatMoney(usd, "USD")} a month`;
}

/**
 * The price on a plan card: "₹971" + "a month + GST", "$12" + "a month", or billed yearly, the year as a monthly
 * price: "₹809" + "a month, billed yearly (₹9,710 + GST)". Also "₹0" + "free forever", or a trial's "₹2,999" +
 * "a month after 3 months free". `cycle` omitted = monthly in India, yearly for owners billed in dollars.
 */
export function planPrice(plan: Plan, show?: ShowCurrency, cycle?: BillingCycle): { big: string; small: string } {
  const currency = planCurrency(plan, show);
  if (isZero(plan.price_inr_monthly)) {
    // Owners billed in dollars see "$0". Legacy zero-price trial plans (early-access) still appear on old subscriptions.
    const big = (show ?? plan.quote?.currency) === "USD" ? formatMoney(0, "USD") : "₹0";
    return { big, small: plan.trial_days > 0 ? `for ${trialSpan(plan)}` : "free forever" };
  }
  const gst = currency === "INR" && planChargesGst(plan) ? " + GST" : "";
  const year = (cycle ?? (currency === "USD" ? "yearly" : "monthly")) === "yearly" ? yearly(plan, currency) : null;
  if (year && year.price > 0) {
    return {
      big: formatMoney(Math.round(year.price / 12), currency),
      small: `a month, billed yearly (${formatMoney(year.price, currency)}${gst})`,
    };
  }
  if (currency === "USD") return { big: formatMoney(Number(plan.price_usd_monthly ?? 0), "USD"), small: "a month" };
  const big = formatInr(plan.price_inr_monthly);
  if (hasTrial(plan)) return { big, small: `a month after ${trialSpan(plan)} free` };
  return { big, small: `a month${gst}` };
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
