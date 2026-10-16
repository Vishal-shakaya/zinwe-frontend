import type { ReactElement } from "react";
import type { Quote } from "../../lib/api";
import { formatMoney } from "../../lib/format";

/** "1 month" / "12 months (billed yearly)". */
function cycleLabel(quote: Pick<Quote, "months">): string {
  return quote.months === 12 ? "1 year (12 months)" : quote.months === 1 ? "1 month" : `${quote.months} months`;
}

/**
 * Exactly what to pay, line by line, before any payment details: plan and period, list price,
 * discount, tax (CGST + SGST, IGST, or none for an export) and one big total. The same numbers are
 * prefilled in the payment form and printed on the invoice.
 */
export function QuoteSummary({ quote, title = "Amount to pay" }: { quote: Quote; title?: string }): ReactElement {
  const money = (amount: string) => formatMoney(amount, quote.currency);
  const discount = Number(quote.discount_amount) > 0;
  return (
    <section className="dash-card quote" aria-labelledby="quote-title">
      <div className="quote__head">
        <div>
          <p className="sub-kicker">{title}</p>
          <h2 className="dash-card__title" id="quote-title">
            Zinwe {quote.plan_name} · {cycleLabel(quote)}
          </h2>
        </div>
        <p className="quote__total" aria-label={`Total to pay ${money(quote.total)}`}>
          <b>{money(quote.total)}</b>
          <small>{quote.currency === "USD" ? "US dollars" : "Indian rupees"}</small>
        </p>
      </div>

      <table className="quote__lines">
        <tbody>
          {discount ? (
            <>
              <tr>
                <th scope="row">Plan price</th>
                <td>{money(quote.list_amount)}</td>
              </tr>
              <tr className="quote__minus">
                <th scope="row">Launch discount</th>
                <td>− {money(quote.discount_amount)}</td>
              </tr>
            </>
          ) : null}
          <tr>
            <th scope="row">{quote.taxes.length ? "Taxable value" : "Subtotal"}</th>
            <td>{money(quote.amount)}</td>
          </tr>
          {quote.taxes.map((tax) => (
            <tr key={tax.label}>
              <th scope="row">
                {tax.label} @ {tax.rate}%
              </th>
              <td>{money(tax.amount)}</td>
            </tr>
          ))}
          {quote.export ? (
            <tr>
              <th scope="row">GST</th>
              <td>{money("0")}</td>
            </tr>
          ) : null}
          <tr className="quote__sum">
            <th scope="row">Total to pay</th>
            <td>{money(quote.total)}</td>
          </tr>
        </tbody>
      </table>

      <p className="dash-note quote__note">
        {quote.export
          ? "No Indian GST: this is an export of services. Your bank or card may show a small conversion fee."
          : quote.taxes.length
            ? `GST for ${quote.place_of_supply || "India"}. Add your GSTIN in Company settings to claim input credit.`
            : quote.note || ""}{" "}
        A GST invoice is ready to download once we confirm the payment.
      </p>
    </section>
  );
}
