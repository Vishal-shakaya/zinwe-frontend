import type { ReactElement } from "react";
import { CopyButton } from "../../dashboard/components/CopyButton";
import type { PaymentInstructions } from "../../lib/api";
import { formatInr } from "../../lib/format";

function Row({ label, value, copy }: { label: string; value: string; copy?: string }): ReactElement | null {
  if (!value) return null;
  return (
    <div className="pay-row">
      <dt>{label}</dt>
      <dd>
        <span className={copy ? "pay-row__value pay-row__value--mono" : "pay-row__value"}>{value}</span>
        {copy ? <CopyButton text={value} what={copy} /> : null}
      </dd>
    </div>
  );
}

/** "Current" -> "Current account"; values that already say "account" are kept. */
function accountTypeLabel(value: string): string {
  const v = value.trim();
  if (!v) return "";
  return /account/i.test(v) ? v : `${v} account`;
}

/** Only http(s) links are opened; anything else (typo, javascript:) hides the PayPal option. */
function safeHttpUrl(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  try {
    const url = new URL(v);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

/**
 * How to pay (values come from GET subscription/): UPI and bank details with copy
 * buttons for India, and a PayPal link for payments from outside India (v1.1).
 * A block with no values is hidden.
 */
export function PaymentInstructionsCard({
  instructions,
  amount,
}: {
  instructions: PaymentInstructions;
  amount: string;
}): ReactElement {
  const i = instructions;
  const hasUpi = Boolean(i.upi_id);
  const hasBank = Boolean(i.account_number || i.ifsc || i.bank_name);
  const paypalUrl = safeHttpUrl(i.paypal_url ?? "");
  const ways = [hasUpi && "UPI", hasBank && "bank transfer"].filter(Boolean).join(" or ");

  return (
    <section className="dash-card" aria-labelledby="pay-how-title">
      <div>
        <h2 className="dash-card__title" id="pay-how-title">
          How to pay
        </h2>
        <p className="dash-card__sub">
          Send <b>{formatInr(amount)}</b>
          {ways ? ` by ${ways}` : ""}
          {paypalUrl ? (ways ? ", or with PayPal from outside India" : " with PayPal") : ""}, then fill in the form
          below.
        </p>
      </div>

      {hasUpi || hasBank ? (
        <div className="pay-ways">
          {hasUpi ? (
            <div className="pay-way">
              <h3 className="pay-way__title">UPI</h3>
              <dl className="pay-rows">
                <Row label="UPI ID" value={i.upi_id} copy="UPI ID" />
                <Row label="Payee" value={i.payee_name} />
              </dl>
            </div>
          ) : null}
          {hasBank ? (
            <div className="pay-way">
              <h3 className="pay-way__title">Bank transfer (NEFT, IMPS or RTGS)</h3>
              <dl className="pay-rows">
                <Row label="Account name" value={i.payee_name} />
                <Row label="Bank" value={i.bank_name} />
                <Row label="Account type" value={accountTypeLabel(i.account_type ?? "")} />
                <Row label="Account number" value={i.account_number} copy="account number" />
                <Row label="IFSC" value={i.ifsc} copy="IFSC code" />
              </dl>
            </div>
          ) : null}
        </div>
      ) : null}

      {paypalUrl ? (
        <div className="pay-way pay-paypal">
          <div className="pay-paypal__text">
            <h3 className="pay-way__title">PayPal</h3>
            <p className="pay-paypal__lead">Paying from outside India? Pay with PayPal.</p>
            <p className="pay-paypal__fine">
              PayPal doesn't handle payments within India, so use UPI or bank transfer there. After paying, choose
              PayPal below and enter the PayPal transaction ID.
            </p>
          </div>
          <a className="btn btn--ghost dash-btn-sm pay-paypal__btn" href={paypalUrl} target="_blank" rel="noopener noreferrer">
            Pay with PayPal <span aria-hidden="true">↗</span>
            <span className="dash-sr"> (opens in a new tab)</span>
          </a>
        </div>
      ) : null}

      {i.note ? <p className="dash-note">{i.note}</p> : null}
    </section>
  );
}
