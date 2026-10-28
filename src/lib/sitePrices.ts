/**
 * Prices for website copy, always read from the plan catalogue (GET /api/auth/plans/), never typed into content
 * (.claude/marketing/context.md: "Never hard-code a price"). Shared by Home (the price question) and Plans.
 */
import type { BillingCycle, Plan } from "./api";
import { planChargesGst } from "../portal/plan";

export type SiteCurrency = "INR" | "USD";

/** "₹971", "₹11,652", "$12", "$1.20" — whole rupees; dollars with cents only when there are any. */
export function money(amount: number, currency: SiteCurrency): string {
  if (currency === "INR") return `₹${Math.round(amount).toLocaleString("en-IN")}`;
  const cents = Math.round(amount * 100) / 100;
  return `$${Number.isInteger(cents) ? cents.toFixed(0) : cents.toFixed(2)}`;
}

/** The plan's price (after any discount) and its list price, in a currency and cycle. 0 = not sold there. */
export function planAmount(plan: Plan, currency: SiteCurrency, cycle: BillingCycle): { price: number; list: number } {
  const p = plan.prices?.[currency]?.[cycle];
  if (p) return { price: Number(p.price) || 0, list: Number(p.list) || 0 };
  // Older backends: monthly prices only.
  const monthly = currency === "INR" ? Number(plan.price_inr_monthly) : Number(plan.price_usd_monthly ?? 0);
  const listMonthly = currency === "INR" ? Number(plan.list_price_inr_monthly ?? 0) : Number(plan.list_price_usd_monthly ?? 0);
  const k = cycle === "yearly" ? 12 : 1;
  return { price: (monthly || 0) * k, list: (listMonthly || 0) * k };
}

/** GST rate applied on top of Indian prices when the seller charges GST. */
export const GST_RATE = 0.18;

/** The paid plans, cheapest first (the catalogue's own order). */
export function paidPlans(plans: readonly Plan[]): Plan[] {
  return [...plans].filter((p) => p.requires_payment).sort((a, b) => a.sort_order - b.sort_order);
}

/**
 * "Free forever for up to 3 PCs. Paid plans start at ₹971 a month plus GST in India, or $12 a month elsewhere, for up
 * to 10 PCs." — the Home price answer, built from the catalogue. null when the catalogue has no paid plan priced.
 */
export function homePriceAnswer(plans: readonly Plan[]): string | null {
  const free = plans.find((p) => !p.requires_payment);
  const first = paidPlans(plans)[0];
  if (!first) return null;
  const inr = planAmount(first, "INR", "monthly").price;
  const usd = planAmount(first, "USD", "monthly").price;
  if (!inr || !usd) return null;
  const gst = planChargesGst(first) ? " plus GST" : "";
  const freePart = free ? `Free forever for up to ${free.max_devices} PCs. ` : "";
  return `${freePart}Paid plans start at ${money(inr, "INR")} a month${gst} in India, or ${money(usd, "USD")} a month elsewhere, for up to ${first.max_devices} PCs.`;
}
