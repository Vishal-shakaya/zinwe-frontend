import type { ReactElement, ReactNode } from "react";
import { CopyButton } from "../../dashboard/components/CopyButton";
import type { Quote } from "../../lib/api";
import { formatMoney } from "../../lib/format";

/** "1 month" / "1 year". */
function periodLabel(months: number): string {
  return months === 12 ? "1 year" : months === 1 ? "1 month" : `${months} months`;
}

/**
 * The order as a payment slip (like a bank challan): who to pay and what for above the tear line,
 * the total and the reference to quote below it. Beside the payment steps (onboarding) and on the
 * public quote page.
 */
export function OrderSummary({
  quote,
  devices,
  action,
  payee,
  reference,
  children,
}: {
  quote: Quote;
  /** e.g. "Up to 10 PCs". */
  devices?: string;
  /** e.g. a "Change" link beside the plan. */
  action?: ReactNode;
  /** "Pay to SKYTECHNO". */
  payee?: string;
  /** What to write as the payment reference (the company name), with a copy button. */
  reference?: string;
  /** Under the total, e.g. the share-this-quote row. */
  children?: ReactNode;
}): ReactElement {
  const money = (amount: string) => formatMoney(amount, quote.currency);
  const discount = Number(quote.discount_amount) > 0;
  return (
    <section className="slip" aria-labelledby="slip-title">
      <div className="slip__top">
        <p className="slip__eyebrow" id="slip-title">
          {payee ? `Pay to ${payee}` : "Your order"}
        </p>
        <div className="slip__plan">
          <div>
            <p className="slip__name">Zinwe {quote.plan_name}</p>
            <p className="slip__meta">
              {periodLabel(quote.months)}
              {devices ? ` · ${devices}` : ""}
            </p>
          </div>
          {action ?? null}
        </div>

        <dl className="slip__lines">
          <div>
            <dt>Plan price</dt>
            <dd>{money(quote.list_amount)}</dd>
          </div>
          {discount ? (
            <div className="slip__minus">
              <dt>Launch discount</dt>
              <dd>− {money(quote.discount_amount)}</dd>
            </div>
          ) : null}
          {quote.taxes.map((tax) => (
            <div key={tax.label}>
              <dt>
                {tax.label} {tax.rate}%
              </dt>
              <dd>{money(tax.amount)}</dd>
            </div>
          ))}
          {quote.export ? (
            <div>
              <dt>Tax</dt>
              <dd>None</dd>
            </div>
          ) : null}
        </dl>
      </div>

      <div className="slip__tear" aria-hidden="true" />

      <div className="slip__bottom">
        <p className="slip__total">
          <span>Total to pay</span>
          <b>{money(quote.total)}</b>
        </p>
        {reference ? (
          <div className="slip__ref">
            <div>
              <span>Payment reference</span>
              <b>{reference}</b>
            </div>
            <CopyButton text={reference} what="payment reference" iconOnly />
          </div>
        ) : null}
        <p className="slip__note">
          {quote.export
            ? "No tax is added (sold from India as an export)."
            : quote.taxes.length
              ? `Includes GST for ${quote.place_of_supply || "India"}.`
              : quote.note || "No GST is added."}{" "}
          The invoice is emailed once your payment is confirmed.
        </p>
        {children ?? null}
      </div>
    </section>
  );
}
