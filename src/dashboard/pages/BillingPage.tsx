import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { usePageMeta } from "../../hooks/usePageMeta";
import { errorMessage, type Payment } from "../../lib/api";
import { formatDateTime } from "../time";
import { PaymentDetails, PaymentStatusPill } from "../../portal/components/PaymentDetails";
import { PaymentForm } from "../../portal/components/PaymentForm";
import { PaymentInstructionsCard } from "../../portal/components/PaymentInstructionsCard";
import { RejectedBanner } from "../../portal/components/RejectedBanner";
import { SubscriptionSummary } from "../../portal/components/SubscriptionSummary";
import { useSubscriptionInfo } from "../../portal/useSubscriptionInfo";
import { DashIcon } from "../components/DashIcon";
import { EmptyState, ErrorState, LoadingState, PageHeader, RefreshButton } from "../components/States";

function LatestPayment({ payment }: { payment: Payment }): ReactElement {
  return (
    <section className="dash-card" aria-labelledby="bill-pay-title">
      <div className="dash-card__head--split">
        <div>
          <h2 className="dash-card__title" id="bill-pay-title">
            Latest payment
          </h2>
          <p className="dash-card__sub">Sent {formatDateTime(payment.submitted_at)}</p>
        </div>
        <PaymentStatusPill payment={payment} />
      </div>
      <PaymentDetails payment={payment} />
      {payment.status === "submitted" ? (
        <p className="dash-banner dash-banner--info">
          <DashIcon name="clock" />
          <span>We're matching this payment with our bank statement. We'll email you when your plan is active.</span>
        </p>
      ) : null}
    </section>
  );
}

export default function BillingPage(): ReactElement {
  usePageMeta({ title: "Billing — Zinwe", description: "Your Zinwe plan and payments." });
  const { user } = useAuth();
  const info = useSubscriptionInfo();
  const subscription = info.data?.subscription;
  const payment = subscription?.latest_payment ?? null;
  const needsPayment =
    subscription?.status === "pending_payment" && (payment === null || payment.status === "rejected");

  return (
    <>
      <PageHeader
        title="Billing"
        lede="Your plan, what it costs and your payments."
        actions={<RefreshButton onClick={info.reload} pending={info.pending} />}
      />

      {info.data === undefined ? (
        info.error ? (
          <section className="dash-card">
            <ErrorState
              title="We couldn't load your billing details"
              message={errorMessage(info.error)}
              onRetry={info.reload}
              retrying={info.pending}
            />
          </section>
        ) : (
          <section className="dash-card">
            <LoadingState label="Loading your billing details…" />
          </section>
        )
      ) : subscription ? (
        <>
          <SubscriptionSummary subscription={subscription} />
          {payment ? <LatestPayment payment={payment} /> : null}
          {needsPayment ? (
            <>
              {payment?.status === "rejected" ? <RejectedBanner payment={payment} /> : null}
              <PaymentInstructionsCard instructions={info.data.instructions} amount={subscription.amount_inr} />
              <PaymentForm
                amount={subscription.amount_inr}
                payerName={payment?.payer_name || user?.full_name || ""}
                onSubmitted={(next) => info.submitted(subscription, next)}
              />
            </>
          ) : null}
          <p className="dash-note">
            Want to change your plan or need a receipt? Email <a href="mailto:hello@zinwe.io">hello@zinwe.io</a>.
          </p>
        </>
      ) : (
        <section className="dash-card">
          <EmptyState
            icon="card"
            title="No plan yet"
            action={
              <Link className="btn btn--primary dash-btn-sm" to="/onboarding/plan">
                Choose a plan
              </Link>
            }
          >
            Pick a plan to start protecting your PCs.
          </EmptyState>
        </section>
      )}
    </>
  );
}
