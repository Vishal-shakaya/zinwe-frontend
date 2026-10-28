import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { downloadInvoicePdf, errorMessage, getInvoice } from "../../lib/api";
import { formatDate, formatMoney } from "../../lib/format";
import { ErrorBlock, Sk, Spinner } from "../ui/States";
import { useResource } from "../useResource";

/**
 * Settings → Plan & billing → Invoice (board: the tax invoice under Payments; full screen on a phone). The same
 * frozen invoice as /app/invoice/:id (which stays for printing and email links), with Download PDF.
 */
export function InvoiceCard({ paymentId, onClose }: { paymentId: number; onClose: () => void }): ReactElement {
  const load = useCallback((signal: AbortSignal) => getInvoice(paymentId, signal), [paymentId]);
  const invoice = useResource(load);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const card = useRef<HTMLElement>(null);
  const d = invoice.data;
  const money = (amount: string | undefined) => formatMoney(amount ?? "0", d?.currency);

  // Bring it into view (on a phone it is a full-screen sheet); Escape closes it.
  useEffect(() => {
    card.current?.scrollIntoView({ block: "nearest" });
    card.current?.focus({ preventScroll: true });
  }, [paymentId]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const download = async () => {
    setBusy(true);
    setError(null);
    try {
      await downloadInvoicePdf(paymentId, d?.number);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section ref={card} tabIndex={-1} className="z-card zp-inv" aria-label="Tax invoice">
      {d === undefined ? (
        invoice.error ? (
          <ErrorBlock title="We couldn't load this invoice" message={errorMessage(invoice.error)} onRetry={invoice.reload} />
        ) : (
          <div role="status" aria-busy="true" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <span className="z-sr">Loading the invoice…</span>
            <Sk w="30%" h={20} />
            <Sk w="60%" h={12} />
            <Sk h={12} />
            <Sk h={12} />
            <Sk w="40%" h={16} />
          </div>
        )
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <b style={{ fontSize: 20 }}>Zinwe</b>
              <br />
              <span className="zp-k">
                {[d.seller.name, d.seller.address, d.seller.gstin ? `GSTIN ${d.seller.gstin}` : ""].filter(Boolean).join(" · ")}
              </span>
            </div>
            <div style={{ textAlign: "right" }}>
              <b style={{ fontSize: 18 }}>{d.title ?? "Tax invoice"}</b>
              <br />
              <span className="z-mono" style={{ fontSize: 13 }}>
                {d.number}
              </span>
              <br />
              <span className="zp-k">Issued {formatDate(d.issued_on)}</span>
            </div>
          </div>
          <div>
            <span className="zp-k">BILLED TO</span>
            <br />
            <b>{d.customer.name}</b>
            <br />
            <span className="zp-body">
              {[d.customer.contact, d.customer.address].filter(Boolean).join(" · ")}
              {d.customer.gstin ? ` · GSTIN ${d.customer.gstin}` : ""}
            </span>
          </div>
          <table>
            <tbody>
              {d.lines.map((line, i) => (
                <tr key={i}>
                  <td>
                    {line.description}
                    {line.period_from && line.period_until
                      ? ` (${formatDate(line.period_from)} – ${formatDate(line.period_until)})`
                      : ""}
                    {line.sac ? ` · SAC ${line.sac}` : ""}
                  </td>
                  <td className="z-num">{money(line.amount ?? line.amount_inr)}</td>
                </tr>
              ))}
              {(d.taxes ?? []).map((tax) => (
                <tr key={tax.label} className="tax">
                  <td>
                    {tax.label} {tax.rate}%{d.place_of_supply ? ` (${d.place_of_supply})` : ""}
                  </td>
                  <td className="z-num">{money(tax.amount)}</td>
                </tr>
              ))}
              {d.export ? (
                <tr className="tax">
                  <td>GST (export of services)</td>
                  <td className="z-num">{money("0")}</td>
                </tr>
              ) : null}
              <tr className="tot">
                <td>
                  <b>Total paid</b>
                </td>
                <td className="z-num">
                  <b>{money(d.total ?? d.total_inr)}</b>
                </td>
              </tr>
            </tbody>
          </table>
          {error ? (
            <span className="zp-err" role="alert">
              {error}
            </span>
          ) : null}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <button type="button" className="z-btn sm" onClick={onClose}>
              Close
            </button>
            <Link className="z-btn sm" to={`/app/invoice/${paymentId}`}>
              Print view
            </Link>
            <button type="button" className={`z-btn sm dark${busy ? " is-busy" : ""}`} onClick={() => void download()} disabled={busy}>
              {busy ? <Spinner size={16} tone="on-dark" /> : null}
              {busy ? "Downloading…" : "Download PDF"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
