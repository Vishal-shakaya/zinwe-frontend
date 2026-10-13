import { useCallback, type ReactElement } from "react";
import { Link, useParams } from "react-router-dom";
import { usePageMeta } from "../../hooks/usePageMeta";
import { errorMessage, getInvoice } from "../../lib/api";
import { formatDate, formatInr } from "../../lib/format";
import { DashIcon } from "../components/DashIcon";
import { ErrorState, LoadingState } from "../components/States";
import { useResource } from "../useResource";

/**
 * One invoice for a confirmed payment, laid out like a paper invoice. "Print or
 * save as PDF" uses the browser's print dialog; the print stylesheet hides the
 * dashboard around it.
 */
export default function InvoicePage(): ReactElement {
  const { id } = useParams();
  const paymentId = Number(id);
  usePageMeta({ title: "Invoice — Zinwe", description: "Your Zinwe invoice." });
  const load = useCallback((signal: AbortSignal) => getInvoice(paymentId, signal), [paymentId]);
  const invoice = useResource(load);

  return (
    <>
      <div className="inv-bar">
        <Link className="dash-link" to="/app/settings/billing">
          ← Back to billing
        </Link>
        {invoice.data ? (
          <button type="button" className="btn btn--primary dash-btn-sm" onClick={() => window.print()}>
            <DashIcon name="card" />
            Print or save as PDF
          </button>
        ) : null}
      </div>

      {invoice.data === undefined ? (
        <section className="dash-card">
          {invoice.error ? (
            <ErrorState title="We couldn't load this invoice" message={errorMessage(invoice.error)} onRetry={invoice.reload} retrying={invoice.pending} />
          ) : (
            <LoadingState label="Loading invoice…" rows={4} />
          )}
        </section>
      ) : (
        <article className="inv" aria-label={`Invoice ${invoice.data.number}`}>
          <header className="inv__head">
            <div>
              <p className="inv__brand">
                <span>Z</span>inwe
              </p>
              <p className="inv__seller">
                <b>{invoice.data.seller.name}</b>
                <br />
                {invoice.data.seller.address}
                <br />
                {invoice.data.seller.email}
                {invoice.data.seller.gstin ? (
                  <>
                    <br />
                    GSTIN {invoice.data.seller.gstin}
                  </>
                ) : null}
              </p>
            </div>
            <div className="inv__meta">
              <h1>Invoice</h1>
              <dl>
                <dt>Number</dt>
                <dd>{invoice.data.number}</dd>
                <dt>Issued</dt>
                <dd>{formatDate(invoice.data.issued_on)}</dd>
                <dt>Status</dt>
                <dd>
                  <span className="inv__paid">Paid</span>
                </dd>
              </dl>
            </div>
          </header>

          <section className="inv__to">
            <small>Billed to</small>
            <b>{invoice.data.customer.name}</b>
            {invoice.data.customer.contact ? <span>{invoice.data.customer.contact}</span> : null}
            <span>{invoice.data.customer.email}</span>
            {invoice.data.customer.address ? <span>{invoice.data.customer.address}</span> : null}
            {invoice.data.customer.gstin ? <span>GSTIN {invoice.data.customer.gstin}</span> : null}
          </section>

          <table className="inv__lines">
            <thead>
              <tr>
                <th>Description</th>
                <th>Period</th>
                <th className="inv__num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.data.lines.map((line, i) => (
                <tr key={i}>
                  <td>{line.description}</td>
                  <td>
                    {line.period_from && line.period_until
                      ? `${formatDate(line.period_from)} – ${formatDate(line.period_until)}`
                      : "—"}
                  </td>
                  <td className="inv__num">{formatInr(line.amount_inr)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>Total paid</td>
                <td className="inv__num">{formatInr(invoice.data.total_inr)}</td>
              </tr>
            </tfoot>
          </table>

          <footer className="inv__foot">
            <p>
              Paid on {formatDate(invoice.data.paid_on)} by {invoice.data.payment.method}
              {invoice.data.payment.reference ? ` · Reference ${invoice.data.payment.reference}` : ""}
              {invoice.data.payment.payer ? ` · ${invoice.data.payment.payer}` : ""}
            </p>
            {invoice.data.note ? <p>{invoice.data.note}</p> : null}
            <p>Questions about this invoice? Email {invoice.data.seller.email}.</p>
          </footer>
        </article>
      )}
    </>
  );
}
