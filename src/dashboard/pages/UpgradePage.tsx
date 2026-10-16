import type { ReactElement } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { usePageMeta } from "../../hooks/usePageMeta";
import { errorMessage, type Plan } from "../../lib/api";
import { cx } from "../../lib/cx";
import { formatInr, formatMoney } from "../../lib/format";
import { PaymentForm } from "../../portal/components/PaymentForm";
import { PaymentInstructionsCard } from "../../portal/components/PaymentInstructionsCard";
import { QuoteSummary } from "../../portal/components/QuoteSummary";
import { PlanCards, PlanCardsLoading } from "../../portal/components/PlanCards";
import { planDevices } from "../../portal/plan";
import { usePlans } from "../../portal/usePlans";
import { useSubscriptionInfo } from "../../portal/useSubscriptionInfo";
import { DashIcon } from "../components/DashIcon";
import { ErrorState, LoadingState, PageHeader } from "../components/States";
import { higherPlans, type UpgradeDoneState } from "../features/upgrade";

const STEPS = ["Choose a plan", "Pay", "Done"] as const;

/**
 * Upgrade, in three steps like sign-up: pick a higher plan, pay for it (same
 * UPI/bank details and "I've paid" form as billing), then land back on the
 * dashboard with a confirmation. The current plan keeps running until the
 * payment is confirmed; paid days left carry over to the new plan.
 */
export default function UpgradePage(): ReactElement {
  usePageMeta({ title: "Upgrade your plan — Zinwe", description: "Move to a bigger plan in two steps." });
  const { account, refresh } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const plans = usePlans();
  const info = useSubscriptionInfo();

  const current = account?.subscription ?? null;
  const currentPlan = current?.plan ?? null;
  const options = plans.data ? higherPlans(plans.data, currentPlan?.code) : [];
  const chosen = options.find((p) => p.code === params.get("plan")) ?? null;
  const step = chosen ? 1 : 0;
  const underReview = current?.latest_payment?.status === "submitted";

  const choose = (plan: Plan | null) => {
    const next = new URLSearchParams(params);
    if (plan) next.set("plan", plan.code);
    else next.delete("plan");
    setParams(next);
    window.scrollTo(0, 0);
  };

  return (
    <>
      <PageHeader
        title="Upgrade your plan"
        lede={
          currentPlan
            ? `You're on ${currentPlan.name}. Pick a bigger plan, pay, and we'll switch you over once the payment is confirmed.`
            : "Pick a plan, pay, and we'll switch it on once the payment is confirmed."
        }
        actions={
          <Link className="btn btn--ghost dash-btn-sm" to="/app">
            Cancel
          </Link>
        }
      />

      <ol className="onb__steps up-steps" aria-label="Upgrade progress">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={cx("onb__step", i < step && "is-done", i === step && "is-on")}
            aria-current={i === step ? "step" : undefined}
          >
            <span className="onb__num" aria-hidden="true">
              {i < step ? "✓" : i + 1}
            </span>
            <span>{label}</span>
          </li>
        ))}
      </ol>

      {underReview ? (
        <section className="dash-card">
          <p className="dash-banner dash-banner--info" role="status">
            <DashIcon name="clock" />
            <span>
              <b>A payment is already being checked.</b> Once it's confirmed you can upgrade from here. Questions? Email{" "}
              <a className="dash-link" href="mailto:hello@zinwe.io">
                hello@zinwe.io
              </a>
              .
            </span>
          </p>
          <div>
            <Link className="btn btn--ghost dash-btn-sm" to="/app/settings/billing">
              See billing
            </Link>
          </div>
        </section>
      ) : plans.data === undefined ? (
        plans.error ? (
          <section className="dash-card">
            <ErrorState message={errorMessage(plans.error)} onRetry={plans.reload} retrying={plans.pending} />
          </section>
        ) : (
          <PlanCardsLoading />
        )
      ) : options.length === 0 ? (
        <section className="dash-card">
          <p className="dash-note">
            You're already on our top plan. Need more than it covers? Email{" "}
            <a className="dash-link" href="mailto:hello@zinwe.io">
              hello@zinwe.io
            </a>
            .
          </p>
        </section>
      ) : !chosen ? (
        <PlanCards
          plans={options}
          renderAction={(plan, highlighted) => (
            <button
              type="button"
              className={cx("btn btn--block", highlighted ? "btn--primary" : "btn--ghost")}
              onClick={() => choose(plan)}
            >
              Choose {plan.name} <span className="arr">→</span>
            </button>
          )}
        />
      ) : (
        <>
          <section className="dash-card up-summary" aria-label="Your upgrade">
            <div className="up-summary__plans">
              <span>
                <small>From</small>
                <b>{currentPlan?.name ?? "No plan"}</b>
              </span>
              <DashIcon name="arrow" />
              <span>
                <small>To</small>
                <b>{chosen.name}</b>
              </span>
            </div>
            <div className="up-summary__price">
              <b>{chosen.quote ? formatMoney(chosen.quote.total, chosen.quote.currency) : formatInr(chosen.price_inr_monthly)}</b>
              <small>
                {chosen.quote?.months === 12 ? "a year" : "a month"}
                {chosen.quote?.taxes.length ? " incl. GST" : ""} · {planDevices(chosen)}
              </small>
            </div>
            <button type="button" className="dash-link up-summary__change" onClick={() => choose(null)}>
              Change plan
            </button>
            <p className="dash-note up-summary__note">
              Your current plan keeps running until we confirm the payment. Then {chosen.name} starts for{" "}
              {chosen.quote?.months === 12 ? "a year" : "a month"}, and any paid days left on your current plan are
              added on top.
            </p>
          </section>

          {info.data === undefined ? (
            info.error ? (
              <section className="dash-card">
                <ErrorState message={errorMessage(info.error)} onRetry={info.reload} retrying={info.pending} />
              </section>
            ) : (
              <section className="dash-card">
                <LoadingState label="Loading payment details…" rows={3} />
              </section>
            )
          ) : (
            <>
              {chosen.quote ? <QuoteSummary quote={chosen.quote} title="Upgrade" /> : null}
              <PaymentInstructionsCard
                instructions={info.data.instructions}
                quote={chosen.quote}
                amount={chosen.price_inr_monthly}
              />
              <PaymentForm
                key={chosen.code}
                amount={chosen.quote?.total ?? chosen.price_inr_monthly}
                currency={chosen.quote?.currency}
                region={info.data.instructions.region}
                allowPaypal={Boolean(info.data.instructions.paypal_url)}
                payerName={account?.user.full_name ?? ""}
                upgradePlan={chosen.code}
                onSubmitted={async () => {
                  await refresh();
                  const state: UpgradeDoneState = { upgradedTo: chosen.name };
                  navigate("/app", { replace: true, state });
                }}
              />
            </>
          )}
        </>
      )}
    </>
  );
}

