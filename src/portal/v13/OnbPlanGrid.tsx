import type { ReactElement, ReactNode } from "react";
import { Link } from "react-router-dom";
import type { BillingCycle, Plan } from "../../lib/api";
import { cx } from "../../lib/cx";
import { hasTrial, planDiscount, planPrice, trialBadge } from "../plan";
import { historyLabel, inclTaxLine } from "./planCard";

export interface CardState {
  /** Can be picked (not reviewing, not below the current plan). */
  pickable: boolean;
  /** A small pill beside the name: "Your plan", "First 3 months free", "Payment being checked"… */
  flag?: string | null;
}

/**
 * The plan step's cards (AuthFlow board): each card is a radio-like button (name, radio dot, was / price / per,
 * the incl-GST line, "Up to N PCs · history", the tagline), then a dashed "Custom: Talk to us" card. Separate from
 * PlanCards so the public /plans page keeps its own look.
 */
export function OnbPlanGrid({
  plans,
  active,
  cycle,
  stateOf,
  onPick,
  showCustom,
}: {
  plans: readonly Plan[];
  /** The plan shown as picked. */
  active: string | null;
  cycle: BillingCycle;
  stateOf: (plan: Plan) => CardState;
  onPick: (plan: Plan) => void;
  showCustom: boolean;
}): ReactElement {
  const biggest = plans.reduce((n, p) => Math.max(n, p.max_devices), 0);
  return (
    <div className="zau-plans">
      {plans.map((plan) => {
        const on = plan.code === active;
        const { pickable, flag } = stateOf(plan);
        const price = planPrice(plan, undefined, cycle);
        const discount = planDiscount(plan, undefined, cycle);
        const line = inclTaxLine(plan, cycle);
        const history = historyLabel(plan.history_days);
        const trial = hasTrial(plan) ? trialBadge(plan) : null;
        return (
          <button
            key={plan.code}
            type="button"
            className={cx("zau-pcard", on && "on", !pickable && "off")}
            aria-pressed={on}
            disabled={!pickable}
            onClick={() => onPick(plan)}
          >
            <span className="zau-pcard__top">
              <b className="zau-pcard__name">{plan.name}</b>
              <span className="zau-pcard__radio" aria-hidden="true" />
            </span>
            {flag || trial ? (
              <span className="zau-pcard__flags">
                {flag ? <span className="zau-pill">{flag}</span> : null}
                {trial && !flag ? <span className="zau-pill green">{trial}</span> : null}
              </span>
            ) : null}
            <span className="zau-pcard__price">
              {discount ? (
                <s className="zau-pcard__was">
                  <span className="z-sr">Was </span>
                  {discount.was}
                </s>
              ) : null}
              <b className="zau-pcard__big">{price.big}</b>
              <span className="zau-pcard__per">{price.small}</span>
            </span>
            {line ? <span className="zau-pcard__line">{line}</span> : null}
            <span className="zau-pcard__limit">
              Up to {plan.max_devices > 0 ? plan.max_devices : "any number of"} PCs
              {history ? ` · ${history} history` : ""}
            </span>
            {plan.tagline ? <span className="zau-pcard__extra">{plan.tagline}</span> : null}
          </button>
        );
      })}
      {showCustom ? (
        <Link className="zau-pcard custom" to="/contact">
          <b className="zau-pcard__name">Custom</b>
          <b className="zau-pcard__talk">Talk to us</b>
          <span className="zau-pcard__limit">More than {biggest} PCs</span>
          <span className="zau-pcard__extra">A plan sized for your company. A person replies within one working day.</span>
        </Link>
      ) : null}
    </div>
  );
}

/** Four shimmer cards while GET plans/ loads. */
export function OnbPlanGridLoading(): ReactElement {
  return (
    <div className="zau-plans" role="status" aria-live="polite">
      <span className="z-sr">Loading plans…</span>
      {[0, 1, 2, 3].map((i) => (
        <div className="zau-pcard skel" key={i} aria-hidden="true">
          <span className="zau-sk" style={{ width: "50%", height: 20 }} />
          <span className="zau-sk" style={{ width: "70%", height: 32 }} />
          <span className="zau-sk" style={{ width: "85%", height: 14 }} />
          <span className="zau-sk" style={{ width: "60%", height: 14 }} />
        </div>
      ))}
    </div>
  );
}

/** The bar under the cards: what the picked plan is, and its one button (from the page's `renderAction`). */
export function OnbSumBar({
  plan,
  text,
  renderAction,
}: {
  plan: Plan;
  text: string;
  renderAction: (plan: Plan) => ReactNode;
}): ReactElement {
  return (
    <div className="zau-sumbar">
      <span>{text}</span>
      <div className="zau-sumbar__acts">{renderAction(plan)}</div>
    </div>
  );
}
