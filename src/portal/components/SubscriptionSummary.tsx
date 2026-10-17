import type { ReactElement, ReactNode } from "react";
import { PAYMENT_CHECKED_LABEL, SUBSCRIPTION_STATUS_LABEL } from "../../content/portal";
import type { Subscription, SubscriptionStatus } from "../../lib/api";
import { cx } from "../../lib/cx";
import { formatDate, isZero } from "../../lib/format";
import { planDevices } from "../plan";
import { daysLeftLabel, isTrialSubscription, priceAfterTrial, subscriptionPrice, trialLine } from "../subscription";

const TONE: Record<SubscriptionStatus, string> = {
  active: "good",
  pending_payment: "warn",
  expired: "bad",
  cancelled: "bad",
};

/** The plan's status; a plan waiting for a payment we're checking says so (not "Waiting for payment"). */
export function SubscriptionStatusPill({
  status,
  checking = false,
}: {
  status: SubscriptionStatus;
  checking?: boolean;
}): ReactElement {
  if (checking && status === "pending_payment") {
    return <span className="st-pill st-pill--info">{PAYMENT_CHECKED_LABEL}</span>;
  }
  return <span className={cx("st-pill", `st-pill--${TONE[status]}`)}>{SUBSCRIPTION_STATUS_LABEL[status]}</span>;
}

interface SubscriptionSummaryProps {
  subscription: Subscription;
  title?: string;
  action?: ReactNode;
}

/** Plan name, price, status and dates, as one card. */
export function SubscriptionSummary({ subscription, title = "Your plan", action }: SubscriptionSummaryProps): ReactElement {
  const daysLeft = daysLeftLabel(subscription);
  const isTrial = isTrialSubscription(subscription);
  const trialActive = isTrial && subscription.status === "active";
  const after = priceAfterTrial(subscription);
  return (
    <section className="dash-card" aria-labelledby={`sub-${subscription.id}-title`}>
      <div className="dash-card__head--split">
        <div>
          <p className="sub-kicker">{title}</p>
          <h2 className="dash-card__title sub-name" id={`sub-${subscription.id}-title`}>
            {subscription.plan.name}
            {trialActive ? <span className="dash-pill">Free trial</span> : null}
          </h2>
          <p className="dash-card__sub">
            {isTrial ? trialLine(subscription) : subscriptionPrice(subscription)} · {planDevices(subscription.plan)}
          </p>
        </div>
        <SubscriptionStatusPill
          status={subscription.status}
          checking={subscription.latest_payment?.status === "submitted"}
        />
      </div>

      {subscription.status === "active" && (subscription.starts_at || subscription.ends_at) ? (
        <dl className="facts-list">
          {subscription.starts_at ? (
            <div>
              <dt>Started</dt>
              <dd>{formatDate(subscription.starts_at)}</dd>
            </div>
          ) : null}
          {subscription.ends_at ? (
            <div>
              <dt>{isTrial ? "Trial ends" : isZero(subscription.amount_inr) ? "Ends" : "Paid until"}</dt>
              <dd>
                {formatDate(subscription.ends_at)}
                {daysLeft ? <small className="sub-left">{daysLeft}</small> : null}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      {trialActive && subscription.ends_at ? (
        <p className="dash-note">
          Nothing is charged during the trial. After {formatDate(subscription.ends_at)}, keep {subscription.plan.name}
          {after ? ` for ${after}` : ""} or choose another plan.
        </p>
      ) : null}
      {action ?? null}
    </section>
  );
}
