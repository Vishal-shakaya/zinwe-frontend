import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { EmptyState, ErrorState, LoadingState } from "../../dashboard/components/States";
import { errorMessage } from "../../lib/api";
import { PaymentInstructionsCard } from "../components/PaymentInstructionsCard";
import { PaymentForm } from "../components/PaymentForm";
import { RejectedBanner } from "../components/RejectedBanner";
import { SubscriptionSummary } from "../components/SubscriptionSummary";
import { useSubscriptionInfo } from "../useSubscriptionInfo";

/** Step `payment`: amount, how to pay, and the "I've paid" form. */
export function PayView(): ReactElement {
  const { user } = useAuth();
  const info = useSubscriptionInfo();
  const subscription = info.data?.subscription;

  return (
    <div className="onb__stack">
      <div className="onb__head">
        <p className="sub-kicker">Step 3 of 3 · Payment</p>
        <h1 className="onb__title">Pay for your plan</h1>
        <p className="onb__lede">Pay by UPI or bank transfer, then tell us the reference so we can match it.</p>
      </div>

      {info.data === undefined ? (
        info.error ? (
          <ErrorState
            title="We couldn't load your payment details"
            message={errorMessage(info.error)}
            onRetry={info.reload}
            retrying={info.pending}
          />
        ) : (
          <LoadingState label="Loading your payment details…" />
        )
      ) : subscription ? (
        <>
          <SubscriptionSummary
            subscription={subscription}
            title="You're subscribing to"
            action={
              <Link className="dash-link" to="/onboarding/plan">
                Change plan
              </Link>
            }
          />
          {subscription.latest_payment?.status === "rejected" ? (
            <RejectedBanner payment={subscription.latest_payment} />
          ) : null}
          <PaymentInstructionsCard instructions={info.data.instructions} amount={subscription.amount_inr} />
          <PaymentForm
            amount={subscription.amount_inr}
            payerName={user?.full_name ?? ""}
            onSubmitted={(payment) => info.submitted(subscription, payment)}
          />
        </>
      ) : (
        <EmptyState
          icon="alert"
          title="No plan is waiting for payment"
          action={
            <Link className="btn btn--primary dash-btn-sm" to="/onboarding/plan">
              Choose a plan
            </Link>
          }
        >
          Choose a plan first, then come back here to pay.
        </EmptyState>
      )}
    </div>
  );
}
