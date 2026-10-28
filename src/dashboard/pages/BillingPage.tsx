import { useCallback, useState, type ReactElement } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { paymentInCheck } from "../../auth/steps";
import { usePageMeta } from "../../hooks/usePageMeta";
import { errorMessage, getPaymentHistory, type BillingCycle, type PaymentInstructions } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import { CheckoutModal } from "../../portal/components/CheckoutModal";
import { PaymentDetails } from "../../portal/components/PaymentDetails";
import { QuoteShare } from "../../portal/components/QuoteShare";
import { QuoteSummary } from "../../portal/components/QuoteSummary";
import { RejectedBanner } from "../../portal/components/RejectedBanner";
import { planChargesGst } from "../../portal/plan";
import { usePlans } from "../../portal/usePlans";
import { useSubscriptionInfo } from "../../portal/useSubscriptionInfo";
import { useEntitlements } from "../features/entitlements";
import { InvoiceCard } from "../settings/InvoiceCard";
import { PaymentsCard } from "../settings/PaymentsCard";
import { PlanCard } from "../settings/PlanCard";
import { useShell } from "../shell/shellContext";
import { formatDateTime } from "../time";
import { EmptyBlock, ErrorBlock, Sk } from "../ui/States";
import { ZIcon } from "../ui/ZIcon";
import { useResource } from "../useResource";

/** Renewing is offered in full only near the end; earlier it's "Pay next month now". */
const RENEW_SOON_DAYS = 7;

/** Board: "Pay by bank transfer or UPI", from the server's own payment details (India only). */
function BankCard({ instructions }: { instructions: PaymentInstructions }): ReactElement | null {
  if (instructions.region === "INTL" || !(instructions.account_number || instructions.upi_id)) return null;
  const type = instructions.account_type ? ` (${instructions.account_type.toLowerCase()} account)` : "";
  return (
    <section className="z-card zp-card mid" aria-labelledby="bank-h" style={{ gap: 12 }}>
      <div>
        <h2 id="bank-h">Pay by bank transfer or UPI</h2>
        <span className="zp-k">
          Card and UPI checkout stay the quickest. If you prefer a transfer, use these details and put your invoice number as
          the reference.
        </span>
      </div>
      <div className="zp-bank">
        {instructions.payee_name ? (
          <>
            <span className="zp-k">Account name</span>
            <b>{instructions.payee_name}</b>
          </>
        ) : null}
        {instructions.bank_name ? (
          <>
            <span className="zp-k">Bank</span>
            <span>
              {instructions.bank_name}
              {type}
            </span>
          </>
        ) : null}
        {instructions.account_number ? (
          <>
            <span className="zp-k">Account number</span>
            <span className="z-mono">{instructions.account_number}</span>
          </>
        ) : null}
        {instructions.ifsc ? (
          <>
            <span className="zp-k">IFSC</span>
            <span className="z-mono">{instructions.ifsc}</span>
          </>
        ) : null}
        {instructions.upi_id ? (
          <>
            <span className="zp-k">UPI</span>
            <span className="z-mono">{instructions.upi_id}</span>
          </>
        ) : null}
      </div>
      <span style={{ fontSize: 13, color: "#4A443C" }}>We confirm a transfer within one working day and email the receipt.</span>
    </section>
  );
}

/**
 * Settings → Plan & billing (board DashSettings #tab=billing): the plan with Change plan and Pay next month now,
 * payments with their invoices, and the bank details. Payments themselves run exactly as before: Razorpay first or
 * a manual payment with a receipt, in the shared CheckoutModal; upgrades on /onboarding/plan.
 */
export default function BillingPage(): ReactElement {
  usePageMeta({ title: "Plan & billing — Settings", description: "Your Zinwe plan and payments." });
  const { user, account } = useAuth();
  const ent = useEntitlements();
  const { members } = useShell();
  const plans = usePlans();
  const info = useSubscriptionInfo();
  const navigate = useNavigate();
  const subscription = info.data?.subscription;
  const payment = subscription?.latest_payment ?? null;
  const needsPayment =
    subscription?.status === "pending_payment" && (payment === null || payment.status === "rejected");
  const checking = payment?.status === "submitted";
  const inCheck = paymentInCheck(subscription);
  // Renewal: an active paid plan, nothing under review (the local copy updates right after a submit).
  const canRenew = Boolean(subscription?.can_renew) && !checking;
  const due = subscription?.amount_due ?? null;
  const dueTotal = subscription ? formatMoney(due?.total ?? subscription.amount_inr, due?.currency ?? subscription.currency) : "";
  const reference = account?.company?.name || undefined;
  const soon = canRenew && subscription?.days_left !== null && subscription?.days_left !== undefined && subscription.days_left <= RENEW_SOON_DAYS;
  const period = subscription?.billing_cycle === "yearly" ? "year" : "month";
  // The checkout (Razorpay first, or manual): a renewal (optionally on another cycle) or the payment a plan waits for.
  const [paying, setPaying] = useState<{ kind: "renew" | "due"; cycle?: BillingCycle } | null>(null);
  const [invoiceId, setInvoiceId] = useState<number | null>(null);
  const closeInvoice = useCallback(() => setInvoiceId(null), []);
  const loadHistory = useCallback((signal: AbortSignal) => getPaymentHistory(signal), []);
  const history = useResource(loadHistory);
  const people = members ? members.filter((m) => m.is_active).length : null;
  const gstPaid = (history.data ?? []).some((p) => (p.due?.taxes?.length ?? 0) > 0) || (due?.taxes.length ?? 0) > 0;

  if (info.data === undefined) {
    return info.error ? (
      <section className="z-card zp-card">
        <ErrorBlock title="We couldn't load your billing details" message={errorMessage(info.error)} onRetry={info.reload} />
      </section>
    ) : (
      <section className="z-card zp-plan" aria-busy="true">
        <span className="z-sr" role="status">
          Loading your billing details…
        </span>
        <div className="zp-plan__who">
          <Sk w={80} h={10} />
          <Sk w={180} h={26} />
          <Sk w="80%" h={12} />
        </div>
        <div className="zp-plan__facts" style={{ flex: "1 1 300px" }}>
          <Sk h={40} />
          <Sk h={40} />
          <Sk h={30} style={{ gridColumn: "1 / -1" }} />
        </div>
      </section>
    );
  }

  if (!subscription) {
    return (
      <section className="z-card zp-card">
        <EmptyBlock
          icon="payment"
          title="No plan yet"
          action={
            <Link className="z-btn sm pri" to="/onboarding/plan">
              Choose a plan
            </Link>
          }
        >
          Pick a plan to start protecting your PCs.
        </EmptyBlock>
      </section>
    );
  }

  return (
    <>
      <PlanCard
        sub={subscription}
        plans={plans.data}
        devicesUsed={ent.devicesUsed}
        maxDevices={ent.maxDevices || subscription.plan.max_devices}
        people={people}
        checking={checking}
        canRenew={canRenew}
        onPayEarly={() => setPaying({ kind: "renew" })}
        onChange={(change) => {
          if (change.kind === "upgrade") navigate(`/onboarding/plan?plan=${encodeURIComponent(change.plan.code)}&cycle=${change.cycle}`);
          else setPaying({ kind: "renew", cycle: change.cycle });
        }}
      >
        {checking && payment ? (
          <div className="zp-plan__full">
            <div className="zn-banner info" role="status">
              <ZIcon name="clock" />
              <span>
                <b>
                  {inCheck?.kind === "upgrade"
                    ? `Your upgrade to ${inCheck.planName} is being checked.`
                    : inCheck?.kind === "renewal"
                      ? `Your ${inCheck.planName} renewal payment is being checked.`
                      : "Your payment is being checked."}
                </b>{" "}
                {payment.upgrade_plan_name
                  ? `We're matching this payment with our bank statement. Once it's confirmed, ${payment.upgrade_plan_name} switches on and we'll email you. No need to pay again.`
                  : payment.is_renewal
                    ? "We're matching this renewal with our bank statement. Once it's confirmed, your plan is extended and we'll email you."
                    : "We're matching this payment with our bank statement. We'll email you when your plan is active."}{" "}
                <span className="zp-k">Sent {formatDateTime(payment.submitted_at)}.</span>
              </span>
            </div>
            <PaymentDetails payment={payment} />
          </div>
        ) : null}
        {payment?.status === "rejected" && !needsPayment ? (
          <div className="zp-plan__full">
            <RejectedBanner
              payment={payment}
              next={payment.upgrade_plan_name ? "Choose Change plan to pay for the upgrade again." : `Use Pay next ${period} now to pay again and send the new receipt.`}
            />
          </div>
        ) : null}
        {soon ? (
          <div className="zp-plan__full">
            <div className="zn-banner warn" role="status">
              <ZIcon name="clock" />
              <span>
                <b>{subscription.days_left === 0 ? "Your plan ends today." : `Your plan ends in ${subscription.days_left} day${subscription.days_left === 1 ? "" : "s"}.`}</b>{" "}
                Renew now to keep your PCs protected without a break.
              </span>
              <button type="button" className="z-btn sm pri" onClick={() => setPaying({ kind: "renew" })}>
                Renew now
              </button>
            </div>
            {due ? <QuoteSummary quote={due} title="Renewal" /> : null}
            <QuoteShare ownerEmail={user?.email ?? "your email"} />
          </div>
        ) : null}
      </PlanCard>

      {needsPayment ? (
        <section className="z-card zp-card" aria-labelledby="due-h">
          <h2 id="due-h">Your plan is waiting for payment</h2>
          {payment?.status === "rejected" ? <RejectedBanner payment={payment} /> : null}
          {due ? <QuoteSummary quote={due} /> : null}
          <div className="zp-save" style={{ justifyContent: "space-between" }}>
            <span className="zp-body" style={{ flex: "1 1 260px" }}>
              Pay with Razorpay and your plan switches on at once, or pay manually. Monthly or yearly: you choose next.
            </span>
            <button type="button" className="z-btn pri" onClick={() => setPaying({ kind: "due" })}>
              Pay {dueTotal}
            </button>
          </div>
          <QuoteShare ownerEmail={user?.email ?? "your email"} />
        </section>
      ) : null}

      <PaymentsCard
        payments={history.data}
        error={history.error ? errorMessage(history.error) : null}
        onRetry={history.reload}
        gst={gstPaid || (subscription.currency !== "USD" && planChargesGst(subscription.plan))}
        onInvoice={setInvoiceId}
      />

      {invoiceId !== null ? <InvoiceCard key={invoiceId} paymentId={invoiceId} onClose={closeInvoice} /> : null}

      <BankCard instructions={info.data.instructions} />

      <p className="zp-k" style={{ margin: 0, fontSize: 13 }}>
        Need your GSTIN on an invoice? Add it in <Link to="/app/settings/company">Company</Link> before you pay. Questions about a
        payment? Email <a href="mailto:hello@zinwe.io">hello@zinwe.io</a>.
      </p>

      {paying ? (
        <CheckoutModal
          initialQuote={due ?? undefined}
          initialCycle={paying.cycle}
          instructions={info.data.instructions}
          reference={reference}
          renewal={paying.kind === "renew"}
          rejected={paying.kind === "due" && payment?.status === "rejected" ? payment : null}
          shareQuote={paying.kind === "due"}
          ownerEmail={user?.email ?? "you"}
          onClose={() => setPaying(null)}
          onSubmitted={async (next) => {
            await info.submitted(subscription, next);
            history.reload();
          }}
          onDone={() => navigate("/app")}
        />
      ) : null}
    </>
  );
}
