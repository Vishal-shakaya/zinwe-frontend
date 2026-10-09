import type { ReactElement, ReactNode } from "react";
import { Icon } from "../../components/ui/Icon";
import type { Plan } from "../../lib/api";
import { cx } from "../../lib/cx";
import { hasTrial, planDevices, planFeatures, planPrice, trialBadge } from "../plan";

interface PlanCardsProps {
  plans: Plan[];
  /** Plan to mark as picked (e.g. chosen before sign-up or pending payment). */
  selected?: string | null;
  /** Label above the selected card, e.g. "Your pick". */
  selectedNote?: string;
  /** The button (or link) for each card. */
  renderAction: (plan: Plan, highlighted: boolean) => ReactNode;
}

/**
 * Plan cards from GET plans/, shared by /plans and /onboarding/plan.
 * A plan whose trial this caller can still start gets a "First 3 months free" badge.
 */
export function PlanCards({ plans, selected, selectedNote = "Your pick", renderAction }: PlanCardsProps): ReactElement {
  return (
    <ul className="plans">
      {plans.map((plan) => {
        const price = planPrice(plan);
        const isSelected = selected === plan.code;
        const highlighted = isSelected || (!selected && plan.is_recommended);
        return (
          <li key={plan.code} className={cx("plan", highlighted && "plan--hi")}>
            {isSelected ? (
              <span className="plan__flag">{selectedNote}</span>
            ) : plan.is_recommended ? (
              <span className="plan__flag">Recommended</span>
            ) : null}
            <div className="plan__head">
              <h3 className="plan__name">{plan.name}</h3>
              <p className="plan__tag">{plan.tagline}</p>
            </div>
            {hasTrial(plan) ? (
              <p className="plan__trial">{trialBadge(plan)}</p>
            ) : null}
            <p className="plan__price">
              <b>{price.big}</b> <span>{price.small}</span>
            </p>
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
