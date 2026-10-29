import { useCallback, useState, type ReactElement } from "react";
import { Link, useParams } from "react-router-dom";
import { usePageMeta } from "../../hooks/usePageMeta";
import { downloadInvoicePdf, errorMessage, getInvoice } from "../../lib/api";
import { formatDate, formatMoney } from "../../lib/format";
import { Busy, ErrorBlock, Spinner } from "../ui/States";
import { ZIcon } from "../ui/ZIcon";
import { useResource } from "../useResource";
import { Brand } from "../../components/ui/Brand";

/**
 * One tax invoice for a confirmed payment (frozen when it was confirmed), laid out like a paper invoice:
 * seller and customer GSTINs, place of supply, the plan line with SAC, discount, CGST/SGST or IGST (or
 * none for an export), the total in words. "Download PDF" gets the same invoice as a file; "Print" uses
 * the browser's print dialog (the print stylesheet hides the dashboard around it).
 */
export default function InvoicePage(): ReactElement {
  const { id } = useParams();
  const paymentId = Number(id);
  usePageMeta({ title: "Invoice — Zinwe", description: "Your Zinwe invoice." });
  const load = useCallback((signal: AbortSignal) => getInvoice(paymentId, signal), [paymentId]);
  const invoice = useResource(load);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const download = async () => {
    setDownloading(true);
    setDownloadError(null);
    try {
      await downloadInvoicePdf(paymentId, invoice.data?.number);
    } catch (e) {
      setDownloadError(errorMessage(e));
    } finally {
      setDownloading(false);
    }
  };
  const d = invoice.data;
  const money = (amount: string | undefined) => formatMoney(amount ?? "0", d?.currency);

  return (
    <>
      <div className="inv-bar">
        <Link className="z-btn sm ghost" to="/app/settings/billing">
          <ZIcon d="m15 6-6 6 6 6" size={16} />
          Plan &amp; billing
        </Link>
        {invoice.data ? (
          <span className="inv-bar__actions">
            <button type="button" className="z-btn sm" onClick={() => window.print()}>
              Print
            </button>
            <button type="button" className={`z-btn sm dark${downloading ? " is-busy" : ""}`} onClick={() => void download()} disabled={downloading}>
              {downloading ? <Spinner size={16} tone="on-dark" /> : <ZIcon name="download" size={16} />}
              {downloading ? "Downloading…" : "Download PDF"}
            </button>
          </span>
        ) : null}
      </div>

      {invoice.data === undefined ? (
        <section className="z-card" style={{ padding: 22 }}>
          {invoice.error ? (
            <ErrorBlock title="We couldn't load this invoice" message={errorMessage(invoice.error)} onRetry={invoice.reload} />
          ) : (
            <Busy label="Loading invoice…" />
          )}
        </section>
      ) : (
        <>
        {downloadError ? (
          <div className="zn-banner warn" role="alert">
            <ZIcon name="alerts" />
            <span>{downloadError}</span>
          </div>
        ) : null}
        <article className="inv" aria-label={`Invoice ${invoice.data.number}`}>
          <header className="inv__head">
            <div>
              <p className="inv__brand">
                <Brand variant="static" height={32} />
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
              <h1>{invoice.data.title ?? "Invoice"}</h1>
              <dl>
                <dt>Number</dt>
                <dd>{invoice.data.number}</dd>
                <dt>Issued</dt>
                <dd>{formatDate(invoice.data.issued_on)}</dd>
                {invoice.data.place_of_supply ? (
                  <>
                    <dt>Place of supply</dt>
                    <dd>{invoice.data.place_of_supply}</dd>
                  </>
                ) : null}
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
                <th>SAC</th>
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
                  <td>{line.sac ?? "—"}</td>
                  <td className="inv__num">{money(line.list_amount ?? line.amount_inr)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {Number(invoice.data.lines[0]?.discount_amount ?? 0) > 0 ? (
                <tr className="inv__sub">
                  <td colSpan={3}>Discount</td>
                  <td className="inv__num">− {money(invoice.data.lines[0]?.discount_amount)}</td>
                </tr>
              ) : null}
              {invoice.data.taxable_amount ? (
                <tr className="inv__sub">
                  <td colSpan={3}>Taxable value</td>
                  <td className="inv__num">{money(invoice.data.taxable_amount)}</td>
                </tr>
              ) : null}
              {(invoice.data.taxes ?? []).map((tax) => (
                <tr key={tax.label} className="inv__sub">
                  <td colSpan={3}>
                    {tax.label} @ {tax.rate}%
                  </td>
                  <td className="inv__num">{money(tax.amount)}</td>
                </tr>
              ))}
              {invoice.data.export ? (
                <tr className="inv__sub">
                  <td colSpan={3}>GST (export of services)</td>
                  <td className="inv__num">{money("0")}</td>
                </tr>
              ) : null}
              <tr>
                <td colSpan={3}>Total paid</td>
                <td className="inv__num">{money(invoice.data.total ?? invoice.data.total_inr)}</td>
              </tr>
            </tfoot>
          </table>

          <footer className="inv__foot">
            <p>
              Paid on {formatDate(invoice.data.paid_on)} by {invoice.data.payment.method}
              {invoice.data.payment.reference ? ` · Reference ${invoice.data.payment.reference}` : ""}
              {invoice.data.payment.payer ? ` · ${invoice.data.payment.payer}` : ""}
            </p>
            {invoice.data.total_in_words ? <p><b>{invoice.data.total_in_words}</b></p> : null}
            {(invoice.data.notes ?? (invoice.data.note ? [invoice.data.note] : [])).map((note) => (
              <p key={note}>{note}</p>
            ))}
            <p>Questions about this invoice? Email {invoice.data.seller.email}.</p>
          </footer>
        </article>
        </>
      )}
    </>
  );
}
