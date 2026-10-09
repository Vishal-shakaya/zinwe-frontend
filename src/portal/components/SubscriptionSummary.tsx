import type { ReactElement, ReactNode } from "react";
import { SUBSCRIPTION_STATUS_LABEL } from "../../content/portal";
import type { Subscription, SubscriptionStatus } from "../../lib/api";
import { cx } from "../../lib/cx";
import { formatDate, isZero } from "../../lib/format";
import { planDevices } from "../plan";
import { daysLeftLabel, subscriptionPrice } from "../subscription";

const TONE: Record<SubscriptionStatus, string> = {
  active: "good",
  pending_payment: "warn",
  expired: "bad",
  cancelled: "bad",
};

export function SubscriptionStatusPill({ status }: { status: SubscriptionStatus }): ReactElement {
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
  const isTrial = subscription.plan.trial_days > 0;
  return (
    <section className="dash-card" aria-labelledby={`sub-${subscription.id}-title`}>
      <div className="dash-card__head--split">
        <div>
          <p className="sub-kicker">{title}</p>
          <h2 className="dash-card__title sub-name" id={`sub-${subscription.id}-title`}>
            {subscription.plan.name}
            {isTrial && subscription.status === "active" ? <span className="dash-pill">Trial</span> : null}
          </h2>
          <p className="dash-card__sub">
            {subscriptionPrice(subscription)} · {planDevices(subscription.plan)}
          </p>
        </div>
        <SubscriptionStatusPill status={subscription.status} />
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
      {action ?? null}
    </section>
  );
}
