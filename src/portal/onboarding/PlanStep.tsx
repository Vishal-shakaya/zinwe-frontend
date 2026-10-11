import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { ErrorState } from "../../dashboard/components/States";
import { usePageMeta } from "../../hooks/usePageMeta";
import { errorMessage } from "../../lib/api";
import { cx } from "../../lib/cx";
import { readPlanIntent } from "../../lib/planIntent";
import { PlanCards, PlanCardsLoading } from "../components/PlanCards";
import { planCtaLabel } from "../plan";
import { usePlans } from "../usePlans";

export default function PlanStep(): ReactElement {
  usePageMeta({ title: "Choose a plan — Zinwe", description: "Pick the Zinwe plan that fits your team." });
  const { account } = useAuth();
  const plans = usePlans();

  // A paid plan waiting for payment, else the plan picked before sign-up.
  const pending = account?.onboarding.step === "payment" ? (account.subscription?.plan.code ?? null) : null;
  const selected = pending ?? readPlanIntent();
  // Back here because the free trial ran out (step `plan`, latest subscription an expired trial).
  const latest = account?.subscription;
  const trialEnded = latest?.is_trial === true && latest.status === "expired";
  // ...or a paid plan that ran out without a renewal.
  const paidEnded = latest?.is_trial === false && latest.status === "expired" && Number(latest.amount_inr) > 0;

  return (
    <section className="onb__wide" aria-labelledby="onb-plan-title">
      <div className="onb__head onb__head--center">
        <h1 className="onb__title" id="onb-plan-title">
          Choose your plan
        </h1>
        <p className="onb__lede">
          {trialEnded
            ? `Your free trial of ${latest.plan.name} has ended. Choose a plan to keep protecting your PCs.`
            : paidEnded
              ? `Your ${latest.plan.name} plan ended. Choose it again to renew, or pick another plan. Your devices and settings are saved.`
              : "Start free. You can change your plan later."}
        </p>
      </div>

      {plans.data ? (
        <PlanCards
          plans={plans.data}
          selected={selected}
          selectedNote={pending ? "Waiting for payment" : "Your pick"}
          renderAction={(plan, highlighted) => {
            const isPending = plan.code === pending;
            return (
              <Link
                className={cx("btn btn--block", highlighted ? "btn--primary" : "btn--ghost")}
                to={isPending ? "/onboarding/subscribe" : `/onboarding/subscribe?plan=${encodeURIComponent(plan.code)}`}
              >
                {isPending ? "Continue to payment" : planCtaLabel(plan)}
              </Link>
            );
          }}
        />
      ) : plans.error ? (
        <ErrorState
          title="We couldn't load the plans"
          message={errorMessage(plans.error)}
          onRetry={plans.reload}
          retrying={plans.pending}
        />
      ) : (
        <PlanCardsLoading />
      )}
    </section>
  );
}
