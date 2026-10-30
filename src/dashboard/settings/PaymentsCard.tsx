import { Fragment, type ReactElement } from "react";
import type { Payment } from "../../lib/api";
import { formatDate, formatMoney } from "../../lib/format";
import { ReceiptLink } from "../../portal/components/PaymentDetails";
import { EmptyBlock, ErrorBlock, SkRows } from "../ui/States";

const STATUS: Record<Payment["status"], { label: string; tone: string }> = {
  verified: { label: "Paid", tone: "green" },
  submitted: { label: "Being checked", tone: "amber" },
  rejected: { label: "Not accepted", tone: "red" },
};

function what(p: Payment): string {
  const plan = p.upgrade_plan_name ?? p.plan_name;
  const kind = p.upgrade_plan_name ? "Upgrade" : p.is_renewal ? "Renewal" : "New plan";
  return `${plan} · ${kind}`;
}

function period(p: Payment): string {
  if (p.covers_from && p.covers_until) return `${formatDate(p.covers_from)} – ${formatDate(p.covers_until)}`;
  return p.status === "submitted" ? "Starts once confirmed" : "—";
}

function Status({ p }: { p: Payment }): ReactElement {
  const s = STATUS[p.status];
  return <span className={`z-pill ${s.tone}`}>{s.label}</span>;
}

/** Invoice (confirmed payments) or the receipt the owner uploaded. */
function Doc({ p, onInvoice }: { p: Payment; onInvoice: (id: number) => void }): ReactElement | null {
  if (p.status === "verified") {
    return (
      <button type="button" className="z-btn sm" onClick={() => onInvoice(p.id)} aria-label={`Invoice for ${formatDate(p.paid_on)}`}>
        Invoice
      </button>
    );
  }
  return <ReceiptLink payment={p} />;
}

/**
 * Settings → Plan & billing → Payments (board DashSettings): every payment the owner made, newest first.
 * Desktop: a table; phone: one card per payment. A refused payment says why.
 */
export function PaymentsCard({
  payments,
  error,
  onRetry,
  gst,
  onInvoice,
}: {
  payments: Payment[] | undefined;
  error: string | null;
  onRetry: () => void;
  /** GST is added to this owner's payments. */
  gst: boolean;
  onInvoice: (id: number) => void;
}): ReactElement {
  return (
    <section className="z-card" style={{ overflow: "hidden" }} aria-labelledby="pay-h">
      <div style={{ padding: "14px 16px" }}>
        <h2 id="pay-h">Payments</h2>
        <span className="zp-k">
          {gst ? "Every payment is the plan price + 18% GST. Open Invoice for the tax invoice." : "Open Invoice for the tax invoice."}
        </span>
      </div>
      {payments === undefined ? (
        error ? (
          <ErrorBlock title="We couldn't load your payments" message={error} onRetry={onRetry} />
        ) : (
          <SkRows label="Loading your payments…" rows={3} avatar={false} />
        )
      ) : payments.length === 0 ? (
        <EmptyBlock icon="payment" title="No payments yet">
          Your payments and invoices show here once you pay for a plan.
        </EmptyBlock>
      ) : (
        <>
          {/* Phone: one card per payment (label: value), never a sideways-scrolling table. */}
          <div className="zp-paycards" role="list" aria-label="Payments">
            {payments.map((p) => (
              <div key={p.id} role="listitem" className="zp-paycard">
                <div className="zp-paycard__row" style={{ alignItems: "baseline" }}>
                  <b>{formatDate(p.paid_on)}</b>
                  <b className="z-num">{formatMoney(p.amount_inr, p.currency)}</b>
                </div>
                <span style={{ fontSize: 13, color: "#404040" }}>
                  {what(p)} · {period(p)}
                </span>
                {p.status === "rejected" && p.rejection_reason ? (
                  <span className="zp-err">Why it wasn't accepted: {p.rejection_reason}</span>
                ) : null}
                <div className="zp-paycard__row">
                  <Status p={p} />
                  <Doc p={p} onInvoice={onInvoice} />
                </div>
              </div>
            ))}
          </div>
          <div className="zp-paytbl">
            <table className="zp-tbl">
              <thead>
                <tr>
                  <th>Paid on</th>
                  <th>For</th>
                  <th>Period</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                  <th>Status</th>
                  <th>
                    <span className="z-sr">Invoice or receipt</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <Fragment key={p.id}>
                    <tr>
                      <td>{formatDate(p.paid_on)}</td>
                      <td>
                        {p.upgrade_plan_name ?? p.plan_name}
                        <small>{p.upgrade_plan_name ? "Upgrade" : p.is_renewal ? "Renewal" : "New plan"}</small>
                      </td>
                      <td>{period(p)}</td>
                      <td className="z-num" style={{ textAlign: "right", fontWeight: 600 }}>
                        {formatMoney(p.amount_inr, p.currency)}
                      </td>
                      <td>
                        <Status p={p} />
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <Doc p={p} onInvoice={onInvoice} />
                      </td>
                    </tr>
                    {p.status === "rejected" && p.rejection_reason ? (
                      <tr className="why">
                        <td colSpan={6}>Why it wasn't accepted: {p.rejection_reason}</td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
