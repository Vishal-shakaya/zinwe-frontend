import { useState, type ReactElement } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { Icon } from "../../components/ui/Icon";
import { EmptyState, ErrorState, LoadingState } from "../../dashboard/components/States";
import { ApiError, createSubscription, errorMessage, type Plan } from "../../lib/api";
import { clearPlanIntent } from "../../lib/planIntent";
import { onboardingFor } from "../../auth/steps";
import { FormAlert } from "../components/FormAlert";
import { planDevices, planPrice } from "../plan";
import { apiFailureMessage } from "../failure";
import { usePlans } from "../usePlans";

/** Confirm the chosen plan. Free and trial plans activate here; paid plans move on to payment. */
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
        <Confirm plan={plan} />
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

function Confirm({ plan }: { plan: Plan }): ReactElement {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const price = planPrice(plan);
  const paid = plan.requires_payment;

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
    }
  };

  return (
    <>
      <div className="onb__head">
        <p className="sub-kicker">{paid ? "Step 3 of 3 · Payment" : "Step 3 of 3 · Activate"}</p>
        <h1 className="onb__title" id="onb-sub-title">
          {paid ? `Subscribe to ${plan.name}` : `Activate ${plan.name}`}
        </h1>
        <p className="onb__lede">{plan.tagline}</p>
      </div>

      <div className="chosen">
        <p className="plan__price">
          <b>{price.big}</b> <span>{price.small}</span>
        </p>
        <p className="plan__devices">{planDevices(plan)}</p>
        <ul className="plan__features">
          {plan.features.map((feature) => (
            <li key={feature}>
              <Icon name="check" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="dash-note">
        {paid
          ? "Next, pay by UPI or bank transfer and tell us the reference. We switch your plan on once we've checked it, usually within one working day."
          : plan.trial_days > 0
            ? `Your plan starts today. No card needed, and nothing is charged during the ${plan.trial_days}-day trial.`
            : "Your plan starts today. No card needed."}
      </p>

      <FormAlert message={error} />

      <div className="onb__actions">
        <button type="button" className="btn btn--primary" onClick={() => void onConfirm()} disabled={pending}>
          {pending ? (paid ? "Saving…" : "Activating…") : paid ? "Continue to payment" : `Activate ${plan.name}`}
          {pending ? null : <span className="arr">→</span>}
        </button>
        <Link className="dash-link" to="/onboarding/plan">
          Choose a different plan
        </Link>
      </div>
    </>
  );
}
