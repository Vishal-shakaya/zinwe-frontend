import { useState, type ReactElement } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { Icon } from "../../components/ui/Icon";
import { EmptyState, ErrorState, LoadingState } from "../../dashboard/components/States";
import { ApiError, createSubscription, errorMessage, type Plan } from "../../lib/api";
import { formatInr } from "../../lib/format";
import { clearPlanIntent } from "../../lib/planIntent";
import { onboardingFor } from "../../auth/steps";
import { FormAlert } from "../components/FormAlert";
import { hasTrial, planDevices, planFeatures, planPrice, trialBadge, trialEndDate, trialSpanAdjective } from "../plan";
import { apiFailureMessage } from "../failure";
import { usePlans } from "../usePlans";

/**
 * Confirm the chosen plan. Free plans and available trials activate here (no payment);
 * paid plans (incl. Businesses once its trial is used) move on to payment.
 */
export function ChosenPlan({ code }: { code: string }): ReactElement {
  const plans = usePlans();
  const plan = plans.data?.find((p) => p.code === code);

  return (
    <section className="onb__card" aria-labelledby="onb-sub-title">
      {plans.data === undefined ? (
        plans.error ? (
          <ErrorState
            title="We couldn't load the plans"
            message={errorMessage(plans.error)}
            onRetry={plans.reload}
            retrying={plans.pending}
          />
        ) : (
          <LoadingState label="Loading your plan…" rows={2} />
        )
      ) : plan ? (
        <Confirm plan={plan} onStale={plans.reload} />
      ) : (
        <EmptyState
          icon="alert"
          title="That plan isn't available"
          action={
            <Link className="btn btn--primary dash-btn-sm" to="/onboarding/plan">
              See all plans
            </Link>
          }
        >
          It may have been retired. Pick one of the current plans instead.
        </EmptyState>
      )}
    </section>
  );
}

type Mode = "trial" | "paid" | "free";

function modeFor(plan: Plan): Mode {
  if (hasTrial(plan)) return "trial";
  return plan.requires_payment ? "paid" : "free";
}

function Confirm({ plan, onStale }: { plan: Plan; onStale: () => void }): ReactElement {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const price = planPrice(plan);
  const mode = modeFor(plan);

  const onConfirm = async () => {
    setPending(true);
    setError(null);
    try {
      const subscription = await createSubscription(plan.code);
      clearPlanIntent();
      await refresh({ onboarding: onboardingFor(subscription), subscription });
      // Free/trial: the guard now sends the owner to /app. Paid: the payment form.
      navigate(subscription.status === "active" ? "/app" : "/onboarding/subscribe", { replace: true });
    } catch (err) {
      setPending(false);
      setError(apiFailureMessage(err));
      // 409: already active elsewhere (another tab) — let the guard catch up.
      if (err instanceof ApiError && err.kind === "conflict") void refresh();
      // 400 on a trial ("You've already used this trial."): reload the plans so this page
      // shows the paid price instead of offering the trial again.
      if (err instanceof ApiError && err.kind === "validation" && mode === "trial") onStale();
    }
  };

  const copy = {
    trial: {
      kicker: "Step 3 of 3 · Free trial",
      title: `Start your ${trialSpanAdjective(plan)} free trial of ${plan.name}`,
      lede: `No payment now. ${formatInr(plan.price_inr_monthly)}/month after ${trialEndDate(plan)}.`,
      note: `Your trial starts today and ends on ${trialEndDate(plan)}. Nothing is charged during the trial. After it ends, you choose whether to pay to keep the plan. One free trial per account.`,
      button: "Start free trial",
      busy: "Starting your trial…",
    },
    paid: {
      kicker: "Step 3 of 3 · Payment",
      title: `Subscribe to ${plan.name}`,
      lede: plan.tagline,
      note: "Next, pay by UPI or bank transfer (or PayPal from outside India) and tell us the reference. We switch your plan on once we've checked it, usually within one working day.",
      button: "Continue to payment",
      busy: "Saving…",
    },
    free: {
      kicker: "Step 3 of 3 · Activate",
      title: `Activate ${plan.name}`,
      lede: plan.tagline,
      note: "Your plan starts today. No card needed.",
      button: `Activate ${plan.name}`,
      busy: "Activating…",
    },
  }[mode];

  return (
    <>
      <div className="onb__head">
        <p className="sub-kicker">{copy.kicker}</p>
        <h1 className="onb__title" id="onb-sub-title">
          {copy.title}
        </h1>
        <p className="onb__lede">{copy.lede}</p>
      </div>

      <div className="chosen">
        {mode === "trial" ? <p className="plan__trial">{trialBadge(plan)}</p> : null}
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
      </div>

      <p className="dash-note">{copy.note}</p>

      <FormAlert message={error} />

      <div className="onb__actions">
        <button type="button" className="btn btn--primary" onClick={() => void onConfirm()} disabled={pending}>
          {pending ? copy.busy : copy.button}
          {pending ? null : <span className="arr">→</span>}
        </button>
        <Link className="dash-link" to="/onboarding/plan">
          Choose a different plan
        </Link>
      </div>
    </>
  );
}
