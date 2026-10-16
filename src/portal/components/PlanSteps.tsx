import type { ReactElement } from "react";
import { PLAN_STEPS } from "../../content/portal";
import { cx } from "../../lib/cx";

/**
 * Choose plan → Payment confirmation → Activation: the progress bar on the plan page and in the checkout
 * modal. `current` is the step in progress (0-2); earlier steps show a tick.
 */
export function PlanSteps({ current, className }: { current: number; className?: string }): ReactElement {
  return (
    <ol className={cx("onb__steps", className)} aria-label="Plan progress">
      {PLAN_STEPS.map((label, i) => (
        <li
          key={label}
          className={cx("onb__step", i < current && "is-done", i === current && "is-on")}
          aria-current={i === current ? "step" : undefined}
        >
          <span className="onb__num" aria-hidden="true">
            {i < current ? "✓" : i + 1}
          </span>
          <span>{label}</span>
        </li>
      ))}
    </ol>
  );
}
