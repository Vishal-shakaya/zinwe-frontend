import { useCallback, useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { usePageMeta } from "../../hooks/usePageMeta";
import { errorMessage, getPaymentHistory, type Payment, type Subscription } from "../../lib/api";
import { formatDate, formatInr } from "../../lib/format";
import { formatDateTime } from "../time";
import { PaymentDetails, PaymentStatusPill } from "../../portal/components/PaymentDetails";
import { PaymentForm } from "../../portal/components/PaymentForm";
import { PaymentInstructionsCard } from "../../portal/components/PaymentInstructionsCard";
import { RejectedBanner } from "../../portal/components/RejectedBanner";
import { SubscriptionSummary } from "../../portal/components/SubscriptionSummary";
import { useSubscriptionInfo } from "../../portal/useSubscriptionInfo";
import { DashIcon } from "../components/DashIcon";
import { EmptyState, ErrorState, LoadingState, RefreshButton } from "../components/States";
import { useResource } from "../useResource";

function LatestPayment({ payment }: { payment: Payment }): ReactElement {
  return (
    <section className="dash-card" aria-labelledby="bill-pay-title">
      <div className="dash-card__head--split">
        <div>
          <h2 className="dash-card__title" id="bill-pay-title">
            {payment.is_renewal ? "Latest renewal" : "Latest payment"}
          </h2>
          <p className="dash-card__sub">Sent {formatDateTime(payment.submitted_at)}</p>
        </div>
        <PaymentStatusPill payment={payment} />
      </div>
      <PaymentDetails payment={payment} />
      {payment.status === "submitted" ? (
        <p className="dash-banner dash-banner--info">
          <DashIcon name="clock" />
          <span>
            {payment.is_renewal
              ? "We're matching this renewal with our bank statement. Once it's confirmed, your plan is extended by a month and we'll email you."
              : "We're matching this payment with our bank statement. We'll email you when your plan is active."}
          </span>
        </p>
      ) : null}
    </section>
  );
}

/** Pay for next month early: it's added after the current end date, so no days are lost. */
function RenewCard({
  subscription,
  open,
  onOpen,
  children,
}: {
  subscription: Subscription;
  open: boolean;
  onOpen: () => void;
  children: ReactElement[];
}): ReactElement {
  const days = subscription.days_left;
  const soon = days !== null && days <= 7;
  const next = subscription.renewal_period;
  return (
    <section className={"dash-card renew" + (soon ? " renew--soon" : "")} aria-labelledby="renew-title">
      <div className="dash-card__head--split">
        <div>
          <h2 className="dash-card__title" id="renew-title">
            Renew {subscription.plan.name}
          </h2>
          <p className="dash-card__sub">
            {formatInr(subscription.amount_inr)} for one more month
            {next ? `: ${formatDate(next.from)} to ${formatDate(next.until)}` : ""}
          </p>
        </div>
        {!open ? (
          <button type="button" className="btn btn--primary dash-btn-sm" onClick={onOpen}>
            Pay for next month
          </button>
        ) : null}
      </div>
      {soon ? (
        <p className="dash-banner dash-banner--warn">
          <DashIcon name="clock" />
          <span>
            {days === 0 ? "Your plan ends today." : `Your plan ends in ${days} day${days === 1 ? "" : "s"}.`} Renew now to
            keep your PCs protected without a break.
          </span>
        </p>
      ) : (
        <p className="dash-note renew__note">
          You can pay early: the new month starts when the current one ends, so you never lose days.
        </p>
      )}
      {open ? <div className="renew__pay">{children}</div> : null}
    </section>
  );
}

/** Every payment the owner made: what it was for, the period it covered, and its status. */
function PaymentHistory({ payments }: { payments: Payment[] }): ReactElement {
  return (
    <section className="dash-card" aria-labelledby="bill-history-title">
      <h2 className="dash-card__title" id="bill-history-title">
        Payment history
      </h2>
      <div className="pay-hist" role="table" aria-label="Payment history">
        <div className="pay-hist__row pay-hist__row--head" role="row">
          <span role="columnheader">Paid on</span>
          <span role="columnheader">For</span>
          <span role="columnheader">Amount</span>
          <span role="columnheader">Period covered</span>
          <span role="columnheader">Status</span>
          <span role="columnheader">
            <span className="dash-sr">Invoice</span>
          </span>
        </div>
        {payments.map((p) => (
          <div key={p.id} className="pay-hist__row" role="row">
            <span role="cell">{formatDate(p.paid_on)}</span>
            <span role="cell">
              {p.upgrade_plan_name ?? p.plan_name}
              <small>{p.upgrade_plan_name ? "Upgrade" : p.is_renewal ? "Renewal" : "New plan"}</small>
            </span>
            <span role="cell">{formatInr(p.amount_inr)}</span>
            <span role="cell">
              {p.covers_from && p.covers_until
                ? `${formatDate(p.covers_from)} – ${formatDate(p.covers_until)}`
                : p.status === "submitted"
                  ? "Starts once confirmed"
                  : "—"}
            </span>
            <span role="cell">
              <PaymentStatusPill payment={p} />
            </span>
            <span role="cell" className="pay-hist__inv">
              {p.status === "verified" ? (
                <Link className="dash-link" to={`/app/invoice/${p.id}`}>
                  Invoice
                </Link>
              ) : null}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function BillingPage(): ReactElement {
  usePageMeta({ title: "Billing — Settings", description: "Your Zinwe plan and payments." });
  const { user } = useAuth();
  const info = useSubscriptionInfo();
  const subscription = info.data?.subscription;
  const payment = subscription?.latest_payment ?? null;
  const needsPayment =
    subscription?.status === "pending_payment" && (payment === null || payment.status === "rejected");
  // Renewal: an active paid plan, nothing under review (the local copy updates right after a submit).
  const canRenew = Boolean(subscription?.can_renew) && payment?.status !== "submitted";
  const [renewing, setRenewing] = useState(false);
  const loadHistory = useCallback((signal: AbortSignal) => getPaymentHistory(signal), []);
  const history = useResource(loadHistory);

  return (
    <>
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
          <SubscriptionSummary
            subscription={subscription}
            action={
              <div>
                <RefreshButton onClick={info.reload} pending={info.pending} />
              </div>
            }
          />
          {canRenew ? (
            <RenewCard subscription={subscription} open={renewing} onOpen={() => setRenewing(true)}>
              <PaymentInstructionsCard instructions={info.data.instructions} amount={subscription.amount_inr} />
              <PaymentForm
                amount={subscription.amount_inr}
                payerName={payment?.payer_name || user?.full_name || ""}
                onSubmitted={async (next) => {
                  setRenewing(false);
                  await info.submitted(subscription, next);
                  history.reload();
                }}
              />
            </RenewCard>
          ) : null}
          {payment ? <LatestPayment payment={payment} /> : null}
          {needsPayment ? (
            <>
              {payment?.status === "rejected" ? <RejectedBanner payment={payment} /> : null}
              <PaymentInstructionsCard instructions={info.data.instructions} amount={subscription.amount_inr} />
              <PaymentForm
                amount={subscription.amount_inr}
                payerName={payment?.payer_name || user?.full_name || ""}
                onSubmitted={async (next) => {
                  await info.submitted(subscription, next);
                  history.reload();
                }}
              />
            </>
          ) : null}
          {history.data && history.data.length > 0 ? <PaymentHistory payments={history.data} /> : null}
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
