import { useState, type ReactElement } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { onboardingFor } from "../../auth/steps";
import { DashIcon } from "../../dashboard/components/DashIcon";
import { ErrorState } from "../../dashboard/components/States";
import { higherPlans } from "../../dashboard/features/upgrade";
import { usePageMeta } from "../../hooks/usePageMeta";
import { ApiError, createSubscription, errorMessage, getSubscription, type Plan } from "../../lib/api";
import { cx } from "../../lib/cx";
import { clearPlanIntent, planCodeParam, readPlanIntent } from "../../lib/planIntent";
import { CheckoutModal } from "../components/CheckoutModal";
import { FormAlert } from "../components/FormAlert";
import { PlanCards, PlanCardsLoading } from "../components/PlanCards";
import { apiFailureMessage } from "../failure";
import { hasTrial, planCtaLabel, planDevices } from "../plan";
import { usePlans } from "../usePlans";
import { useSubscriptionInfo } from "../useSubscriptionInfo";

/**
 * /onboarding/plan — the one place to choose a plan (2026-10-16), outside the dashboard:
 * - first time (step `plan`) or waiting for payment (`payment`): every plan; free plans and trials start at
 *   once, a paid plan opens the checkout modal (`?checkout=1` opens it for the plan waiting for payment);
 * - on a plan (`complete`): an upgrade. Every plan is shown; the current one is flagged, lower ones are
 *   dimmed, and the first plan above it is preselected. Paying opens the same checkout modal;
 * - payment being checked (`payment_review`): the plans, read only.
 * `?plan=<code>` preselects a plan (links from the dashboard, the website and emails).
 */
export default function PlanStep(): ReactElement {
  const { account, refresh } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const plans = usePlans();
  const info = useSubscriptionInfo();

  const step = account?.onboarding.step;
  const subscription = account?.subscription ?? null;
  const upgrading = step === "complete" && subscription?.status === "active";
  const reviewing = step === "payment_review";
  const pending = step === "payment" ? (subscription?.plan.code ?? null) : null;
  const current = upgrading ? (subscription?.plan.code ?? null) : null;
  const eligible = upgrading && plans.data ? higherPlans(plans.data, current).map((p) => p.code) : [];
  const unavailable = upgrading && plans.data ? plans.data.map((p) => p.code).filter((c) => !eligible.includes(c)) : [];

  // Back here because the free trial ran out, or a paid plan ended without a renewal (step `plan`).
  const trialEnded = !upgrading && subscription?.is_trial === true && subscription.status === "expired";
  const paidEnded =
    !upgrading && subscription?.is_trial === false && subscription.status === "expired" && Number(subscription.amount_inr) > 0;

  usePageMeta({
    title: upgrading ? "Upgrade your plan — Zinwe" : "Choose a plan — Zinwe",
    description: "Pick the Zinwe plan that fits your team.",
  });

  const asked = planCodeParam(params.get("plan"));
  const suggested = upgrading
    ? asked && eligible.includes(asked)
      ? asked
      : (eligible[0] ?? null)
    : (pending ?? asked ?? readPlanIntent());
  const [picked, setPicked] = useState<string | null>(null);
  const selected = picked ?? suggested;

  // `?checkout=1` opens the checkout for the plan waiting for payment. Latched on arrival: once the receipt is
  // sent the step moves on (payment_review), and the modal must stay open to say so.
  const [checkout, setCheckout] = useState<string | null>(() => (params.get("checkout") === "1" ? pending : null));
  const openCode = checkout;
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const closeCheckout = () => setCheckout(null);

  const choose = async (plan: Plan) => {
    setPicked(plan.code);
    setError(null);
    if (upgrading || plan.code === pending) {
      setCheckout(plan.code);
      return;
    }
    setBusy(plan.code);
    try {
      const created = await createSubscription(plan.code);
      clearPlanIntent();
      await refresh({ onboarding: onboardingFor(created), subscription: created });
      if (created.status === "active") {
        navigate("/app", { replace: true });
        return;
      }
      // Waiting for payment: load what's due and how to pay for the new choice, then check out.
      info.setData(await getSubscription());
      setCheckout(plan.code);
    } catch (err) {
      setError(apiFailureMessage(err));
      // 409: already active or under review elsewhere (another tab) — let the page catch up.
      if (err instanceof ApiError && err.kind === "conflict") void refresh();
      // A trial this account already used: reload so the card shows the paid price.
      if (err instanceof ApiError && err.kind === "validation" && hasTrial(plan)) plans.reload();
    } finally {
      setBusy(null);
    }
  };

  const action = (plan: Plan, highlighted: boolean): ReactElement => {
    const primary = highlighted ? "btn--primary" : "btn--ghost";
    if (reviewing) {
      return (
        <button type="button" className="btn btn--block btn--ghost" disabled>
          {plan.code === subscription?.plan.code ? "Payment being checked" : "Available after the check"}
        </button>
      );
    }
    if (upgrading && !eligible.includes(plan.code)) {
      return (
        <button type="button" className="btn btn--block btn--ghost" disabled>
          {plan.code === current ? "Current plan" : "Included in your plan"}
        </button>
      );
    }
    const label = upgrading
      ? `Upgrade to ${plan.name}`
      : plan.code === pending
        ? "Continue to payment"
        : planCtaLabel(plan);
    return (
      <button
        type="button"
        className={cx("btn btn--block", primary)}
        disabled={busy !== null}
        onClick={() => void choose(plan)}
      >
        {busy === plan.code ? "Please wait…" : label}
      </button>
    );
  };

  // The checkout: an upgrade is priced from the plan; a new subscription from what's due on it.
  const openPlan = openCode && plans.data ? plans.data.find((p) => p.code === openCode) : undefined;
  const pendingInfo = info.data?.subscription?.plan.code === openCode ? info.data?.subscription : null;
  const quote = upgrading ? openPlan?.quote : (pendingInfo?.amount_due ?? openPlan?.quote);
  const checkoutReady = Boolean(openPlan && quote && info.data && (upgrading || pendingInfo));

  return (
    <section className="onb__wide" aria-labelledby="onb-plan-title">
      {upgrading || reviewing ? (
        <Link className="onb__back" to="/app">
          <DashIcon name="back" />
          Back to dashboard
        </Link>
      ) : null}

      <div className="onb__head onb__head--center">
        <h1 className="onb__title" id="onb-plan-title">
          {upgrading ? "Upgrade your plan" : reviewing ? "Your plan" : "Choose your plan"}
        </h1>
        <p className="onb__lede">
          {upgrading
            ? eligible.length
              ? `You're on ${subscription?.plan.name}. Pick a bigger plan: it starts once we've confirmed the payment, and any paid days left carry over.`
              : `You're on ${subscription?.plan.name}, our biggest plan. Need more? Email hello@zinwe.io.`
            : reviewing
              ? "We're checking your payment. You can change plans once it's confirmed, usually within one working day."
              : trialEnded
                ? `Your free trial of ${subscription?.plan.name} has ended. Choose a plan to keep protecting your PCs.`
                : paidEnded
                  ? `Your ${subscription?.plan.name} plan ended. Choose it again to renew, or pick another plan. Your devices and settings are saved.`
                  : "Start free. You can change your plan later."}
        </p>
      </div>

      <FormAlert message={error} />

      {plans.data ? (
        <PlanCards
          plans={plans.data}
          selected={selected}
          selectedNote={upgrading ? "Suggested" : pending ? "Waiting for payment" : "Your pick"}
          current={current}
          unavailable={unavailable}
          renderAction={action}
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

      {!upgrading && !reviewing ? (
        <p className="onb__skip">
          Not sure yet? <Link className="dash-link" to="/app">Go to your dashboard</Link> and start with the Free
          features. You can choose a plan any time.
        </p>
      ) : null}

      {openCode && info.error && !info.data ? (
        <ErrorState
          title="We couldn't load the payment details"
          message={errorMessage(info.error)}
          onRetry={info.reload}
          retrying={info.pending}
        />
      ) : null}

      {checkoutReady && openPlan && quote && info.data ? (
        <CheckoutModal
          quote={quote}
          // The server's UPI QR holds the amount due on the current subscription, not an upgrade's.
          instructions={upgrading ? { ...info.data.instructions, upi_qr_svg: "" } : info.data.instructions}
          devices={planDevices(openPlan)}
          reference={account?.company?.name || undefined}
          upgradePlan={upgrading ? openPlan.code : undefined}
          shareQuote={!upgrading}
          ownerEmail={account?.user.email ?? "you"}
          onClose={closeCheckout}
          onSubmitted={async (payment) => {
            if (!upgrading && pendingInfo) await info.submitted(pendingInfo, payment);
            else await refresh();
          }}
          onDone={() => navigate("/app")}
        />
      ) : null}
    </section>
  );
}
