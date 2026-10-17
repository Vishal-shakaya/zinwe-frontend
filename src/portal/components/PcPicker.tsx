import { useId, type ReactElement } from "react";
import { Link } from "react-router-dom";
import type { Plan } from "../../lib/api";
import { planForPcs } from "../plan";

const MAX_PCS = 9999;

/**
 * "How many PCs?" with − / + and a one-line answer: the smallest plan that covers them. The plan cards
 * mark the same plan (PlanCards `fit`). Used on /plans and /onboarding/plan.
 */
export function PcPicker({
  plans,
  pcs,
  onPcs,
  fromTeamSize = false,
  current = null,
}: {
  plans: readonly Plan[];
  /** null = nothing entered yet. */
  pcs: number | null;
  onPcs: (pcs: number | null) => void;
  /** The number came from the company form's team size (says so under the answer). */
  fromTeamSize?: boolean;
  /** The owner's plan, when upgrading: says so when it already covers the PCs. */
  current?: Plan | null;
}): ReactElement {
  const id = useId();
  const fit = pcs ? planForPcs(plans, pcs) : null;
  const biggest = plans.reduce((n, p) => Math.max(n, p.max_devices), 0);
  const covered = Boolean(pcs && current && (current.max_devices === 0 || current.max_devices >= pcs));
  const step = (by: number) => onPcs(Math.min(MAX_PCS, Math.max(1, (pcs ?? 0) + by)));

  return (
    <div className="pc-pick">
      <label className="pc-pick__label" htmlFor={`${id}-pcs`}>
        How many PCs?
      </label>
      <div className="pc-pick__ctl">
        <button type="button" className="pc-pick__btn" onClick={() => step(-1)} disabled={!pcs || pcs <= 1}>
          <span aria-hidden="true">−</span>
          <span className="dash-sr">One PC fewer</span>
        </button>
        <input
          id={`${id}-pcs`}
          className="pc-pick__input"
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_PCS}
          placeholder="0"
          value={pcs ?? ""}
          aria-describedby={`${id}-out`}
          onChange={(e) => {
            const n = Number.parseInt(e.target.value, 10);
            onPcs(Number.isFinite(n) && n > 0 ? Math.min(MAX_PCS, n) : null);
          }}
        />
        <button type="button" className="pc-pick__btn" onClick={() => step(1)}>
          <span aria-hidden="true">+</span>
          <span className="dash-sr">One PC more</span>
        </button>
      </div>
      <p className="pc-pick__out" id={`${id}-out`} aria-live="polite">
        {covered && current ? (
          <>
            Your {current.name} plan already covers {pcs} PC{pcs === 1 ? "" : "s"}.
            {fromTeamSize ? " Based on your team size." : ""}
          </>
        ) : fit ? (
          <>
            {pcs} PC{pcs === 1 ? "" : "s"}: <b>{fit.name}</b> fits, with room for up to {fit.max_devices > 0 ? fit.max_devices : "any number of"}{" "}
            PCs.{fromTeamSize ? " Based on your team size." : ""}
          </>
        ) : pcs ? (
          <>
            More than {biggest} PCs? <Link to="/contact">Talk to us</Link> and we'll set up a plan that fits.
          </>
        ) : (
          "Type how many PCs you want to protect and we'll point to the plan that fits."
        )}
      </p>
    </div>
  );
}
