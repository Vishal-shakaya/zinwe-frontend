import type { ReactElement } from "react";
import { CopyButton } from "../../dashboard/components/CopyButton";
import type { PaymentInstructions, Quote } from "../../lib/api";
import { formatMoney } from "../../lib/format";

function Row({ label, value, copy }: { label: string; value?: string; copy?: string }): ReactElement | null {
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

/** Only https links are opened; anything else (typo, javascript:) hides the option. */
function safeHttpsUrl(value: string | undefined): string | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  try {
    const url = new URL(v);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

/**
 * How to pay, for the customer's country (GET subscription/ `instructions`):
 *
 * - India: scan the UPI QR (the exact amount is filled in) or pay the UPI ID, or bank transfer.
 * - Outside India: this customer's Skydo payment link (card or US bank), or a transfer to the Skydo US
 *   account (ACH / wire). With neither set up yet: we email a secure payment link.
 *
 * Then three plain steps: pay → tell us the reference → we confirm and the invoice is ready.
 */
export function PaymentInstructionsCard({
  instructions,
  quote,
  amount,
}: {
  instructions: PaymentInstructions;
  /** The amount due (preferred); `amount` is the fallback for an older backend. */
  quote?: Quote | null;
  amount: string;
}): ReactElement {
  const i = instructions;
  const abroad = i.region === "INTL";
  const currency = quote?.currency ?? i.currency ?? "INR";
  const total = formatMoney(quote?.total ?? amount, currency);
  const link = safeHttpsUrl(i.payment_link);
  const paypal = safeHttpsUrl(i.paypal_url);
  const skydo = i.skydo ?? null;
  const hasUpi = !abroad && Boolean(i.upi_id);
  const hasBank = !abroad && Boolean(i.account_number || i.ifsc || i.bank_name);

  return (
    <section className="dash-card" aria-labelledby="pay-how-title">
      <div>
        <h2 className="dash-card__title" id="pay-how-title">
          How to pay {total}
        </h2>
        <ol className="pay-steps">
          <li>
            Pay <b>{total}</b> {abroad ? "by card or US bank transfer" : "by UPI or bank transfer"}.
          </li>
          <li>Fill in the form below with the payment reference.</li>
          <li>We confirm it (usually within a working day), switch your plan on and email you the invoice.</li>
        </ol>
      </div>

      {abroad ? (
        <div className="pay-ways">
          {link ? (
            <div className="pay-way pay-way--primary">
              <h3 className="pay-way__title">Pay online (card or US bank)</h3>
              <p className="pay-way__lead">A secure Skydo page made for your account. The amount is already filled in.</p>
              <a className="btn btn--primary dash-btn-sm" href={link} target="_blank" rel="noopener noreferrer">
                Pay {total} <span aria-hidden="true">↗</span>
                <span className="dash-sr"> (opens in a new tab)</span>
              </a>
            </div>
          ) : null}
          {skydo ? (
            <div className="pay-way">
              <h3 className="pay-way__title">US bank transfer (ACH or wire)</h3>
              <dl className="pay-rows">
                <Row label="Account name" value={skydo.account_name} />
                <Row label="Bank" value={skydo.bank_name} />
                <Row label="Account type" value={skydo.account_type} />
                <Row label="Account number" value={skydo.account_number} copy="account number" />
                <Row label="Routing number (ABA)" value={skydo.routing_number} copy="routing number" />
                <Row label="SWIFT (wire)" value={skydo.swift} copy="SWIFT code" />
              </dl>
            </div>
          ) : null}
          {!link && !skydo && !paypal ? (
            <div className="pay-way pay-way--primary">
              <h3 className="pay-way__title">We'll send you a payment link</h3>
              <p className="pay-way__lead">
                Within a working day we email a secure link to pay {total} by card or US bank. Questions?{" "}
                <a className="dash-link" href="mailto:hello@zinwe.io">
                  hello@zinwe.io
                </a>
              </p>
            </div>
          ) : null}
          {paypal ? (
            <div className="pay-way">
              <h3 className="pay-way__title">PayPal</h3>
              <a className="btn btn--ghost dash-btn-sm" href={paypal} target="_blank" rel="noopener noreferrer">
                Pay with PayPal <span aria-hidden="true">↗</span>
              </a>
            </div>
          ) : null}
        </div>
      ) : hasUpi || hasBank ? (
        <div className="pay-ways">
          {hasUpi ? (
            <div className="pay-way">
              <h3 className="pay-way__title">UPI</h3>
              {i.upi_qr_svg ? (
                <figure className="pay-qr">
                  {/* Our own server-made SVG (segno): the UPI link with the exact amount. */}
                  <span className="pay-qr__img" dangerouslySetInnerHTML={{ __html: i.upi_qr_svg }} />
                  <figcaption>Scan with any UPI app. {total} is filled in.</figcaption>
                </figure>
              ) : null}
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

      {i.note ? <p className="dash-note">{i.note}</p> : null}
    </section>
  );
}
