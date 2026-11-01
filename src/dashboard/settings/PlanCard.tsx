import type { ReactElement, ReactNode } from "react";
import { Link } from "react-router-dom";
import { PAYMENT_CHECKED_LABEL, SUBSCRIPTION_STATUS_LABEL } from "../../content/portal";
import type { BillingCycle, Subscription } from "../../lib/api";
import { formatDate, formatMoney, isZero } from "../../lib/format";
import { planChargesGst } from "../../portal/plan";
import { daysLeftLabel, isTrialSubscription, subscriptionPrice } from "../../portal/subscription";

function historyLabel(days: number | undefined): string | null {
  if (days === undefined) return null;
  if (days === 0) return "unlimited history";
  if (days % 365 === 0) return `${days / 365 === 1 ? "1 year" : `${days / 365} years`} of history`;
  return `${days} days of history`;
}

function cycleOf(sub: Subscription): BillingCycle {
  return sub.billing_cycle === "yearly" ? "yearly" : "monthly";
}

/**
 * Settings → Plan & billing → Your plan (board DashSettings): plan, price, paid until, next payment and PCs used,
 * then Change plan (the standard plan page, /onboarding/plan) and Pay next month now (the payment page, where Monthly
 * or Yearly can also be switched).
 */
export function PlanCard({
  sub,
  devicesUsed,
  maxDevices,
  people,
  checking,
  canRenew,
  onPayEarly,
  children,
}: {
  sub: Subscription;
  devicesUsed: number;
  maxDevices: number;
  people: number | null;
  /** A payment is being checked: nothing can be changed until it's confirmed. */
  checking: boolean;
  canRenew: boolean;
  onPayEarly: () => void;
  /** Notices under the plan (being checked, refused, renew soon). */
  children?: ReactNode;
}): ReactElement {
  const plan = sub.plan;
  const current = cycleOf(sub);

  const currency = sub.currency === "USD" ? "USD" : "INR";
  const money = (n: string | number) => formatMoney(n, currency);
  const due = sub.amount_due ?? null;
  const gst = (due?.taxes.length ?? 0) > 0 || (currency === "INR" && planChargesGst(plan));
  const isTrial = isTrialSubscription(sub);
  const free = isZero(sub.amount_inr) && !isTrial;
  const active = sub.status === "active";

  const price = subscriptionPrice(sub) + (due && due.taxes.length > 0 ? ` (${money(due.total)} incl GST)` : "");
  const limit = plan.max_devices > 0 ? `up to ${plan.max_devices} PCs` : "no PC limit";
  const hist = historyLabel(plan.history_days);
  const daysLeft = daysLeftLabel(sub);
  const soon = sub.days_left !== null && sub.days_left <= 7;
  const slotsFree = maxDevices > 0 ? Math.max(0, maxDevices - devicesUsed) : null;
  const usedPct = maxDevices > 0 ? Math.min(100, Math.round((devicesUsed / maxDevices) * 100)) : 0;

  const pill = (() => {
    if (sub.status === "pending_payment" && checking) return <span className="z-pill amber">{PAYMENT_CHECKED_LABEL}</span>;
    if (active && isTrial) return <span className="z-pill blue">Free trial</span>;
    const tone = active ? "green" : sub.status === "pending_payment" ? "amber" : "red";
    return <span className={`z-pill ${tone}`}>{SUBSCRIPTION_STATUS_LABEL[sub.status]}</span>;
  })();

  return (
    <section className="z-card zp-plan" aria-labelledby="plan-h">
      <div className="zp-plan__who">
        <span className="zp-k">YOUR PLAN</span>
        <span className="zp-plan__name">
          <b id="plan-h">{plan.name}</b>
          {pill}
        </span>
        <span className="zp-body">{[price, limit, hist].filter(Boolean).join(" · ")}</span>
        {!free && !isTrial ? (
          <span style={{ fontSize: 13, color: "#404040" }}>
            Billed {current}
            {gst && currency === "INR" ? " · India prices are + 18% GST" : ""}
          </span>
        ) : null}
      </div>

      <div className="zp-plan__facts">
        {active && sub.ends_at ? (
          <div>
            <span className="zp-k">{isTrial ? "Trial ends" : free ? "Ends" : "Paid until"}</span>
            <br />
            <b>{formatDate(sub.ends_at)}</b>
            {daysLeft ? (
              <>
                <br />
                <span style={{ fontSize: 12, color: soon ? "#A84505" : "#6B6B6B" }}>{daysLeft}</span>
              </>
            ) : null}
          </div>
        ) : null}
        {active && plan.requires_payment && due && sub.ends_at ? (
          <div>
            <span className="zp-k">Next payment</span>
            <br />
            <b>
              {money(due.total)} on {formatDate(sub.ends_at)}
            </b>
            <br />
            <span style={{ fontSize: 12, color: "#6B6B6B" }}>We remind you a week before</span>
          </div>
        ) : null}
        <div style={{ gridColumn: "1 / -1" }}>
          <span className="zp-k">PCs used</span>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span className="zp-bar" aria-hidden="true">
              <span style={{ width: `${usedPct}%` }} />
            </span>
            <b className="z-num">{maxDevices > 0 ? `${devicesUsed} of ${maxDevices}` : `${devicesUsed}`}</b>
          </div>
          <span style={{ fontSize: 12, color: "#6B6B6B" }}>
            {[slotsFree !== null ? `${slotsFree} free slot${slotsFree === 1 ? "" : "s"}` : "No PC limit", people !== null ? `${people} ${people === 1 ? "person" : "people"}` : null]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
      </div>

      <div className="zp-plan__acts">
        <Link className="z-btn sm" to="/onboarding/plan">
          Change plan
        </Link>
        {canRenew && plan.requires_payment ? (
          <button type="button" className="z-btn sm" onClick={onPayEarly}>
            Pay next {current === "yearly" ? "year" : "month"} now
          </button>
        ) : null}
      </div>

      {children}
    </section>
  );
}
