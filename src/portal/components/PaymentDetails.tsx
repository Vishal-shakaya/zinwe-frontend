import { useState, type ReactElement } from "react";
import { PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL } from "../../content/portal";
import { downloadPaymentProof, errorMessage, type Payment } from "../../lib/api";
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

/** "View receipt": downloads the file the owner uploaded with this payment. */
export function ReceiptLink({ payment }: { payment: Payment }): ReactElement | null {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!payment.has_proof) return null;
  const open = async () => {
    setBusy(true);
    setError(null);
    try {
      await downloadPaymentProof(payment.id);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <span className="inv-links">
      <button type="button" className="dash-link" onClick={() => void open()} disabled={busy}>
        {busy ? "Downloading…" : "View receipt"}
      </button>
      {error ? <small className="inv-links__err">{error}</small> : null}
    </span>
  );
}

/** The facts of one manual payment, as a definition list. Empty facts (no reference) are left out. */
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
      {payment.reference ? (
        <div>
          <dt>Reference</dt>
          <dd className="dash-mono">{payment.reference}</dd>
        </div>
      ) : null}
      <div>
        <dt>Paid on</dt>
        <dd>{formatDate(payment.paid_on)}</dd>
      </div>
      {payment.payer_name ? (
        <div>
          <dt>Paid by</dt>
          <dd>{payment.payer_name}</dd>
        </div>
      ) : null}
      <div>
        <dt>Receipt</dt>
        <dd>{payment.has_proof ? <ReceiptLink payment={payment} /> : "None"}</dd>
      </div>
    </dl>
  );
}
