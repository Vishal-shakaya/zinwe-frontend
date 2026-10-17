import type { ReactElement } from "react";
import { DashIcon } from "../../dashboard/components/DashIcon";
import type { Payment } from "../../lib/api";
import { formatDate, formatMoney } from "../../lib/format";

/** Shown wherever the owner pays again when the last payment was not accepted: what, why, and what next. */
export function RejectedBanner({
  payment,
  next = "Check the details and send them again below.",
}: {
  payment: Payment;
  /** What to do now, e.g. "Pay again below and send the new receipt." */
  next?: string;
}): ReactElement {
  const what = payment.upgrade_plan_name
    ? ` for the upgrade to ${payment.upgrade_plan_name}`
    : payment.is_renewal
      ? " for your renewal"
      : "";
  const reason = payment.rejection_reason?.trim() ?? "";
  return (
    <div className="dash-banner dash-banner--bad" role="status">
      <DashIcon name="alert" />
      <span>
        <b>
          We couldn't confirm your payment of {formatMoney(payment.amount_inr, payment.currency)}
          {what}
        </b>
        {payment.paid_on ? ` from ${formatDate(payment.paid_on)}` : ""}
        {payment.reference ? ` (ref. ${payment.reference})` : ""}.
        {reason ? ` Reason: ${/[.!?]$/.test(reason) ? reason : `${reason}.`}` : ""} {next}
      </span>
    </div>
  );
}
