/**
 * The dashboard's "Upgrade" entry points (sidebar card, Overview header) go to
 * the /app/upgrade flow. Pages call `useUpgrade().open()`; after paying, the
 * flow returns to /app with `UpgradeDoneState`, and AppLayout shows the dialog.
 */
import { createContext, useContext } from "react";
import type { BillingCycle, Currency, Plan } from "../../lib/api";

export interface UpgradeApi {
  open: () => void;
  /** False when the owner is already on the highest-priced plan. */
  canUpgrade: boolean;
}

export const UpgradeContext = createContext<UpgradeApi>({ open: () => undefined, canUpgrade: false });

export function useUpgrade(): UpgradeApi {
  return useContext(UpgradeContext);
}

/** Router state the upgrade flow hands back to /app. */
export interface UpgradeDoneState {
  upgradedTo: string;
}

export function isUpgradeDone(state: unknown): state is UpgradeDoneState {
  return typeof (state as UpgradeDoneState | null)?.upgradedTo === "string";
}

export function priceOf(plan: Plan): number {
  return Number(plan.price_inr_monthly) || 0;
}

/** How the subscriber pays: compared in their own currency and billing cycle (defaults: rupees, monthly). */
export interface PaysIn {
  currency?: Currency | string | null;
  billing_cycle?: BillingCycle | string | null;
}

/** One whole billing cycle's price in that currency (0 = not sold there, or an older API without `prices`). */
function cyclePrice(plan: Plan, pays: PaysIn): number {
  const currency = pays.currency === "USD" ? "USD" : "INR";
  const cycle = pays.billing_cycle === "yearly" ? "yearly" : "monthly";
  return Number(plan.prices?.[currency]?.[cycle]?.price) || 0;
}

/**
 * `plan` costs more than `current`, the way the server decides an upgrade (z_auth/billing.py costs_more,
 * FIX-004c): in the subscriber's own currency and cycle, falling back to the rupee monthly price when either
 * plan has no price there.
 */
export function costsMore(plan: Plan, current: Plan, pays: PaysIn): boolean {
  const next = cyclePrice(plan, pays);
  const now = cyclePrice(current, pays);
  if (next <= 0 || (now <= 0 && current.requires_payment)) return priceOf(plan) > priceOf(current);
  return next > now;
}

/**
 * Plans the owner can upgrade to: paid plans that cost more than the current one as they pay, cheapest first.
 * No current plan → every paid plan.
 */
export function higherPlans(plans: readonly Plan[], currentCode: string | null | undefined, pays: PaysIn = {}): Plan[] {
  const current = plans.find((p) => p.code === currentCode);
  const sortKey = (p: Plan) => cyclePrice(p, pays) || priceOf(p);
  return plans
    .filter((p) => p.requires_payment && priceOf(p) + cyclePrice(p, pays) > 0 && (!current || costsMore(p, current, pays)))
    .sort((a, b) => sortKey(a) - sortKey(b));
}
