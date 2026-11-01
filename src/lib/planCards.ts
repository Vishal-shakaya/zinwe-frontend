/**
 * What a plan card says, shared by the public /plans page and the choose view for registering and upgrading
 * (portal/components/PlanChooser.tsx). The two draw it differently; the words and the maths live here once.
 * Prices, PC limits and history come from the catalogue (GET /api/auth/plans/), the copy from content/site/plans.ts.
 */
import { PLAN_COPY, fill, historyLabel } from "../content/site/plans";
import { planChargesGst } from "../portal/plan";
import type { BillingCycle, Plan } from "./api";
import { GST_RATE, money, paidPlans, planAmount, type SiteCurrency } from "./sitePrices";

export interface PlanPoint {
  text: string;
  /** A real addition (false = the "Everything in Free" line). */
  strong: boolean;
  isNew: boolean;
}

export interface PlanCardText {
  tag: string;
  /** "90 days", "1 year". */
  history: string;
  /** The price shown big: "₹971". */
  price: string;
  /** The list price struck through, or "". */
  was: string;
  /** "a month + GST", "a year", "forever". */
  per: string;
  /** "About ₹97 per PC a month" or "Free for up to 3 PCs". */
  perPcLine: string;
  /** "₹1,146 a month including GST", "No card needed.", "No Indian GST.", or "". */
  sub: string;
  points: PlanPoint[];
}

export function pcWord(n: number): string {
  return `${n} ${n === 1 ? "PC" : "PCs"}`;
}

/** The price per PC for a month, before tax. A yearly price is shared over its twelve months. */
export function perPc(plan: Plan, currency: SiteCurrency, cycle: BillingCycle = "monthly"): number {
  if (plan.max_devices <= 0) return 0;
  const { price } = planAmount(plan, currency, cycle);
  return (cycle === "yearly" ? price / 12 : price) / plan.max_devices;
}

/** The paid plan with the lowest price per PC. */
export function cheapestPerPc(plans: readonly Plan[], currency: SiteCurrency, cycle: BillingCycle = "monthly"): Plan | null {
  return paidPlans(plans).reduce<Plan | null>((best, p) => (!best || perPc(p, currency, cycle) < perPc(best, currency, cycle) ? p : best), null);
}

/** Used only until the catalogue has loaded. */
const USUAL_PC_CAP = 50;

/** The most PCs a plan covers: the PC steppers stop here. */
export function pcCap(plans: readonly Plan[]): number {
  if (plans.some((p) => p.max_devices === 0)) return 9999;
  return plans.reduce((most, p) => Math.max(most, p.max_devices), 0) || USUAL_PC_CAP;
}

/** Said beside the steppers at the cap. */
export function pcCapLine(cap: number): string {
  return `Zinwe plans cover up to ${cap} PCs.`;
}

/**
 * One card's text. `perPcCycle` is the cycle the per-PC line is worked out on: the public page always shows the
 * monthly figure, the choose view follows the Monthly / Yearly switch.
 */
export function planCardText(plan: Plan, currency: SiteCurrency, cycle: BillingCycle, perPcCycle: BillingCycle = "monthly"): PlanCardText {
  const copy = PLAN_COPY[plan.code];
  const history = historyLabel(plan.history_days);
  const points: PlanPoint[] = copy
    ? copy.points.map(([text, strong, isNew]) => ({ text: fill(text, { pcs: plan.max_devices, history }), strong, isNew }))
    : plan.features.map((text) => ({ text, strong: true, isNew: false }));
  const base = { tag: copy?.tag ?? plan.tagline, history, points };
  if (!plan.requires_payment) {
    return { ...base, price: money(0, currency), was: "", per: "forever", perPcLine: `Free for up to ${pcWord(plan.max_devices)}`, sub: "No card needed." };
  }
  const inr = currency === "INR";
  const gst = inr && planChargesGst(plan);
  const { price, list } = planAmount(plan, currency, cycle);
  const period = cycle === "yearly" ? "a year" : "a month";
  return {
    ...base,
    price: money(price, currency),
    was: list > price ? money(list, currency) : "",
    per: `${period}${gst ? " + GST" : ""}`,
    perPcLine: `About ${money(perPc(plan, currency, perPcCycle), currency)} per PC a month`,
    sub: gst ? `${money(price * (1 + GST_RATE), currency)} ${period} including GST` : inr ? "" : "No Indian GST.",
  };
}
