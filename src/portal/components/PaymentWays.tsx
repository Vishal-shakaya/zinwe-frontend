import { useRef, type KeyboardEvent, type ReactElement, type ReactNode } from "react";
import { CopyButton } from "../../dashboard/components/CopyButton";
import { DashIcon, type DashIconName } from "../../dashboard/components/DashIcon";
import type { PaymentInstructions } from "../../lib/api";
import { cx } from "../../lib/cx";
import { safeHttpsUrl, type PayWay } from "../payWays";

const WAYS: ReadonlyArray<{ key: PayWay; label: string; hint: string; icon: DashIconName }> = [
  { key: "upi", label: "UPI", hint: "Any UPI app", icon: "phone" },
  { key: "bank", label: "Bank transfer", hint: "NEFT, IMPS or RTGS", icon: "building" },
  { key: "intl", label: "International", hint: "Card or US bank", icon: "globe" },
];

/** "Current" -> "Current account"; values that already say "account" are kept. */
function accountTypeLabel(value: string): string {
  const v = value.trim();
  if (!v) return "";
  return /account/i.test(v) ? v : `${v} account`;
}

function Row({ label, value, copy }: { label: string; value?: string; copy?: string }): ReactElement | null {
  if (!value) return null;
  return (
    <div className="pay-row">
      <dt>{label}</dt>
      <dd>
        <span className={copy ? "pay-row__value pay-row__value--mono" : "pay-row__value"}>{value}</span>
        {copy ? <CopyButton text={value} what={copy} iconOnly /> : null}
      </dd>
    </div>
  );
}

function NotSetUp({ what }: { what: string }): ReactElement {
  return (
    <p className="ways__empty">
      {what} details aren't on this page yet. Pick another way, or email{" "}
      <a className="dash-link" href="mailto:hello@zinwe.io">
        hello@zinwe.io
      </a>{" "}
      and we'll send them.
    </p>
  );
}

/** The details of one way to pay: UPI (QR + ID), bank account, or Skydo / US account. */
export function PayWayDetails({
  instructions,
  total,
  way,
}: {
  instructions: PaymentInstructions;
  /** The formatted amount due, e.g. "₹971". */
  total: string;
  way: PayWay;
}): ReactElement {
  const i = instructions;
  const payee = i.payee_name || "SKYTECHNO";
  const link = safeHttpsUrl(i.payment_link);
  const paypal = safeHttpsUrl(i.paypal_url);
  const skydo = i.skydo ?? null;

  let panel: ReactNode;
  if (way === "upi") {
    panel = i.upi_id ? (
      <div className="ways__split">
        {i.upi_qr_svg ? (
          <figure className="pay-qr">
            {/* Our own server-made SVG (segno): the UPI link with the exact amount. */}
            <span className="pay-qr__img" dangerouslySetInnerHTML={{ __html: i.upi_qr_svg }} />
            <figcaption>Scan with any UPI app. {total} is filled in.</figcaption>
          </figure>
        ) : null}
        <dl className="pay-rows">
          <Row label="UPI ID" value={i.upi_id} copy="UPI ID" />
          <Row label="Payee" value={payee} />
          <Row label="Amount" value={total} />
        </dl>
      </div>
    ) : (
      <NotSetUp what="UPI" />
    );
  } else if (way === "bank") {
    panel =
      i.account_number || i.ifsc || i.bank_name ? (
        <dl className="pay-rows pay-rows--grid">
          <Row label="Account name" value={payee} />
          <Row label="Bank" value={i.bank_name} />
          <Row label="Account number" value={i.account_number} copy="account number" />
          <Row label="IFSC" value={i.ifsc} copy="IFSC code" />
          <Row label="Account type" value={accountTypeLabel(i.account_type ?? "")} />
          <Row label="Amount" value={total} />
        </dl>
      ) : (
        <NotSetUp what="Bank" />
      );
  } else {
    panel =
      link || skydo || paypal ? (
        <div className="ways__intl">
          {link ? (
            <div className="ways__cta">
              <div>
                <p className="ways__cta-title">Pay online through Skydo</p>
                <p className="ways__cta-text">
                  Card or US bank transfer, from anywhere. Pay {total} and keep the receipt Skydo shows you.
                </p>
              </div>
              <a className="btn btn--primary dash-btn-sm" href={link} target="_blank" rel="noopener noreferrer">
                Open Skydo <span aria-hidden="true">↗</span>
                <span className="dash-sr"> (opens in a new tab)</span>
              </a>
            </div>
          ) : null}
          {skydo ? (
            <>
              <p className="ways__sub">Or send an ACH or wire transfer to our US account</p>
              <dl className="pay-rows pay-rows--grid">
                <Row label="Account name" value={skydo.account_name} />
                <Row label="Bank" value={skydo.bank_name} />
                <Row label="Account number" value={skydo.account_number} copy="account number" />
                <Row label="Routing number (ABA)" value={skydo.routing_number} copy="routing number" />
                <Row label="SWIFT (wire)" value={skydo.swift} copy="SWIFT code" />
                <Row label="Account type" value={skydo.account_type} />
              </dl>
            </>
          ) : null}
          {paypal ? (
            <a className="btn btn--ghost dash-btn-sm ways__paypal" href={paypal} target="_blank" rel="noopener noreferrer">
              Pay with PayPal <span aria-hidden="true">↗</span>
            </a>
          ) : null}
        </div>
      ) : (
        <NotSetUp what="International payment" />
      );
  }
  return <>{panel}</>;
}

/**
 * Every way to pay, one tab each (2026-10-16: all three for every customer; the region only picks
 * the first tab). Controlled: the parent keeps `way` so the receipt is recorded against it.
 */
export function PaymentWays({
  instructions,
  total,
  way,
  onWay,
  idPrefix = "ways",
  showNote = true,
}: {
  instructions: PaymentInstructions;
  /** The formatted amount due, e.g. "₹971". */
  total: string;
  way: PayWay;
  onWay: (way: PayWay) => void;
  idPrefix?: string;
  /** The "use your company name as the reference" line; off where the payment slip shows the reference. */
  showNote?: boolean;
}): ReactElement {
  const i = instructions;
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const at = WAYS.findIndex((w) => w.key === way);
    const next =
      event.key === "ArrowRight" ? (at + 1) % WAYS.length
      : event.key === "ArrowLeft" ? (at - 1 + WAYS.length) % WAYS.length
      : event.key === "Home" ? 0
      : event.key === "End" ? WAYS.length - 1
      : -1;
    if (next < 0) return;
    event.preventDefault();
    onWay(WAYS[next].key);
    tabs.current[next]?.focus();
  };

  return (
    <div className="ways">
      <div className="ways__tabs" role="tablist" aria-label="Ways to pay" onKeyDown={onKey}>
        {WAYS.map((w, n) => {
          const on = w.key === way;
          return (
            <button
              key={w.key}
              ref={(el) => {
                tabs.current[n] = el;
              }}
              type="button"
              role="tab"
              id={`${idPrefix}-tab-${w.key}`}
              aria-selected={on}
              aria-controls={`${idPrefix}-panel`}
              tabIndex={on ? 0 : -1}
              className={cx("ways__tab", on && "is-on")}
              onClick={() => onWay(w.key)}
            >
              <DashIcon name={w.icon} />
              <span className="ways__tab-text">
                <b>{w.label}</b>
                <small>{w.hint}</small>
              </span>
            </button>
          );
        })}
      </div>
      <div
        key={way}
        className="ways__panel"
        role="tabpanel"
        id={`${idPrefix}-panel`}
        aria-labelledby={`${idPrefix}-tab-${way}`}
        tabIndex={0}
      >
        <PayWayDetails instructions={instructions} total={total} way={way} />
      </div>
      {showNote && i.note ? <p className="dash-note ways__note">{i.note}</p> : null}
    </div>
  );
}
