/**
 * The dashboard's "Upgrade" entry points (sidebar card, Overview header) go to
 * the /app/upgrade flow. Pages call `useUpgrade().open()`; after paying, the
 * flow returns to /app with `UpgradeDoneState`, and AppLayout shows the dialog.
 */
import { createContext, useContext } from "react";
import type { Plan } from "../../lib/api";

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

/** Plans priced above the current one, cheapest first. No current plan → every paid plan. */
export function higherPlans(plans: readonly Plan[], currentCode: string | null | undefined): Plan[] {
  const current = plans.find((p) => p.code === currentCode);
  const floor = current ? priceOf(current) : 0;
  return plans.filter((p) => priceOf(p) > floor).sort((a, b) => priceOf(a) - priceOf(b));
}
