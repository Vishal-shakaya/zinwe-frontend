import type { ReactElement } from "react";
import { DashIcon } from "../../dashboard/components/DashIcon";
import type { Payment } from "../../lib/api";
import { formatDate, formatInr } from "../../lib/format";

/** Shown above the payment form when the last payment was not accepted. */
export function RejectedBanner({ payment }: { payment: Payment }): ReactElement {
  return (
    <div className="dash-banner dash-banner--bad" role="status">
      <DashIcon name="alert" />
      <span>
        <b>We couldn't accept your payment of {formatInr(payment.amount_inr)}</b> from {formatDate(payment.paid_on)}
        {payment.reference ? ` (ref. ${payment.reference})` : ""}.
        {payment.rejection_reason ? ` Reason: ${payment.rejection_reason}` : ""} Check the details and send them again
        below.
      </span>
    </div>
  );
}
