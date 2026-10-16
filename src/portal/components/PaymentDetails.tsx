import type { ReactElement } from "react";
import { PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL } from "../../content/portal";
import type { Payment } from "../../lib/api";
import { cx } from "../../lib/cx";
import { formatDate, formatMoney } from "../../lib/format";

const STATUS_TONE = { submitted: "warn", verified: "good", rejected: "bad" } as const;

export function PaymentStatusPill({ payment }: { payment: Payment }): ReactElement {
  return (
    <span className={cx("st-pill", `st-pill--${STATUS_TONE[payment.status]}`)}>
      {PAYMENT_STATUS_LABEL[payment.status]}
    </span>
  );
}

/** The facts of one manual payment, as a definition list. */
export function PaymentDetails({ payment }: { payment: Payment }): ReactElement {
  return (
    <dl className="facts-list">
      <div>
        <dt>Amount</dt>
        <dd>{formatMoney(payment.amount_inr, payment.currency)}</dd>
      </div>
      <div>
        <dt>Method</dt>
        <dd>{PAYMENT_METHOD_LABEL[payment.method] ?? payment.method}</dd>
      </div>
      <div>
        <dt>Reference</dt>
        <dd className="dash-mono">{payment.reference || "—"}</dd>
      </div>
      <div>
        <dt>Paid on</dt>
        <dd>{formatDate(payment.paid_on)}</dd>
      </div>
      <div>
        <dt>Paid by</dt>
        <dd>{payment.payer_name}</dd>
      </div>
      <div>
        <dt>Receipt</dt>
        <dd>{payment.has_proof ? "Uploaded" : "None"}</dd>
      </div>
    </dl>
  );
}
