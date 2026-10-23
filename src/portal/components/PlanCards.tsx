import type { ReactElement, ReactNode } from "react";
import { Icon } from "../../components/ui/Icon";
import type { Plan } from "../../lib/api";
import { cx } from "../../lib/cx";
import {
  hasTrial,
  planAltPrice,
  planDevices,
  planDiscount,
  planFeatures,
  planPrice,
  trialBadge,
  type ShowCurrency,
} from "../plan";

interface PlanCardsProps {
  plans: Plan[];
  /** Plan to mark as picked (e.g. chosen before sign-up or pending payment). */
  selected?: string | null;
  /** Label above the selected card, e.g. "Your pick". */
  selectedNote?: string;
  /** The button (or link) for each card. */
  renderAction: (plan: Plan, highlighted: boolean) => ReactNode;
  /** The owner's current plan: flagged "Your plan" (upgrades). */
  current?: string | null;
  /** Plans that can't be picked right now (e.g. below the current plan): shown in full, never highlighted. */
  unavailable?: readonly string[];
  /** The smallest plan for the owner's PC count ("How many PCs?"): flagged, and highlighted when nothing is selected. */
  fit?: { code: string; pcs: number } | null;
  /** Show every price in this currency (the /plans page's choice); omitted = the owner's own, or both for visitors. */
  currency?: ShowCurrency;
}

/**
 * Plan cards from GET plans/, shared by /plans and /onboarding/plan.
 * A plan whose trial this caller can still start gets a "First 3 months free" badge.
 */
export function PlanCards({
  plans,
  selected,
  selectedNote = "Your pick",
  renderAction,
  current = null,
  unavailable = [],
  fit = null,
  currency,
}: PlanCardsProps): ReactElement {
  return (
    <ul className="plans">
      {plans.map((plan) => {
        const price = planPrice(plan, currency);
        const discount = planDiscount(plan, currency);
        const alt = planAltPrice(plan, currency);
        const isSelected = selected === plan.code;
        const isCurrent = current === plan.code;
        const off = unavailable.includes(plan.code);
        const isFit = fit?.code === plan.code;
        const highlighted = !off && (isSelected || (!selected && (fit ? isFit : plan.is_recommended)));
        return (
          <li key={plan.code} className={cx("plan", highlighted && "plan--hi", off && "plan--off", isCurrent && "plan--current")}>
            {isCurrent ? (
              <span className="plan__flag plan__flag--current">Your plan</span>
            ) : isSelected && !off ? (
              <span className="plan__flag">{selectedNote}</span>
            ) : fit && isFit && !off ? (
              <span className="plan__flag">
                Fits {fit.pcs} PC{fit.pcs === 1 ? "" : "s"}
              </span>
            ) : plan.is_recommended && !off && !selected && !fit ? (
              <span className="plan__flag">Recommended</span>
            ) : null}
            <div className="plan__head">
              <h2 className="plan__name">{plan.name}</h2>
              <p className="plan__tag">{plan.tagline}</p>
            </div>
            {hasTrial(plan) ? (
              <p className="plan__trial">{trialBadge(plan)}</p>
            ) : null}
            {discount ? (
              <p className="plan__was">
                <s aria-label={`was ${discount.was}`}>{discount.was}</s>
                <span className="plan__off">{discount.percent}% off</span>
              </p>
            ) : null}
            <p className="plan__price">
              <b>{price.big}</b> <span>{price.small}</span>
            </p>
            {alt ? <p className="plan__alt">{alt}</p> : null}
            <p className="plan__devices">{planDevices(plan)}</p>
            <ul className="plan__features">
              {planFeatures(plan).map((feature) => (
                <li key={feature}>
                  <Icon name="check" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <div className="plan__cta">{renderAction(plan, highlighted)}</div>
          </li>
        );
      })}
    </ul>
  );
}

/** Three skeleton cards while GET plans/ loads. */
export function PlanCardsLoading(): ReactElement {
  return (
    <div className="plans" role="status" aria-live="polite">
      <span className="dash-sr">Loading plans…</span>
      {[0, 1, 2].map((i) => (
        <div className="plan plan--skel" key={i} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}
