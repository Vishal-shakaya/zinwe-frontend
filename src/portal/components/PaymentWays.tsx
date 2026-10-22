import { useRef, useState, type KeyboardEvent, type ReactElement, type ReactNode } from "react";
import { CopyButton } from "../../dashboard/components/CopyButton";
import { DashIcon } from "../../dashboard/components/DashIcon";
import { errorMessage, getUpiQr, type PaymentInstructions, type UpiQr } from "../../lib/api";
import { cx } from "../../lib/cx";
import { isTouchDevice, payWayOptions, safeHttpsUrl, safeUpiUri, type PayWay } from "../payWays";

/** "Current" -> "Current account"; values that already say "account" are kept. */
function accountTypeLabel(value: string): string {
  const v = value.trim();
  if (!v) return "";
  return /account/i.test(v) ? v : `${v} account`;
}

function Row({
  label,
  value,
  copy,
  hint,
}: {
  label: string;
  value?: string;
  copy?: string;
  /** A short line under the value, e.g. where to type it. */
  hint?: string;
}): ReactElement | null {
  if (!value) return null;
  return (
    <div className={cx("pay-row", hint && "pay-row--hinted")}>
      <dt>{label}</dt>
      <dd>
        <span className={copy ? "pay-row__value pay-row__value--mono" : "pay-row__value"}>{value}</span>
        {copy ? <CopyButton text={value} what={copy} iconOnly /> : null}
        {hint ? <small className="pay-row__hint">{hint}</small> : null}
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

/** Fetches the UPI QR for this payment from the server (what's due, an upgrade, or a shared quote). */
export type LoadUpiQr = () => Promise<UpiQr>;

type QrState = { kind: "idle" } | { kind: "loading" } | { kind: "ready"; qr: UpiQr } | { kind: "error"; message: string };

/**
 * FR-06: the UPI QR only once the payer asks for it. The server makes it from its own UPI ID with the exact
 * amount; it's shown as an image (never as markup), with the payee and UPI ID to check in the app before paying.
 */
function UpiQrOnRequest({ loadQr, total }: { loadQr: LoadUpiQr; total: string }): ReactElement {
  const [state, setState] = useState<QrState>({ kind: "idle" });
  const show = async () => {
    setState({ kind: "loading" });
    try {
      setState({ kind: "ready", qr: await loadQr() });
    } catch (err) {
      setState({ kind: "error", message: errorMessage(err) });
    }
  };
  if (state.kind === "ready") {
    const { qr } = state;
    return (
      <figure className="pay-qr">
        <img
          className="pay-qr__img"
          src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr.svg)}`}
          alt={`UPI QR code: pay ${total} to ${qr.payee_name}`}
        />
        <figcaption>
          Scan with any UPI app. {total} is filled in. Before you pay, check the app shows{" "}
          <b>{qr.payee_name}</b> ({qr.upi_id}).
        </figcaption>
      </figure>
    );
  }
  return (
    <div className="pay-qr pay-qr--ask">
      <button type="button" className="btn btn--ghost dash-btn-sm" onClick={() => void show()} disabled={state.kind === "loading"}>
        <DashIcon name="qr" />
        {state.kind === "loading" ? "Making the QR code…" : "Show QR code"}
      </button>
      <small>Made by Zinwe for {total}, when you ask for it.</small>
      {state.kind === "error" ? (
        <small className="pay-qr__error" role="alert">
          {state.message} Use the UPI ID instead.
        </small>
      ) : null}
    </div>
  );
}

/** The details of one way to pay: UPI (app button on phones, QR on request + ID), bank account, or Skydo / US account. */
export function PayWayDetails({
  instructions,
  total,
  way,
  reference,
  loadQr = () => getUpiQr(),
}: {
  instructions: PaymentInstructions;
  /** The formatted amount due, e.g. "₹971". */
  total: string;
  way: PayWay;
  /** What to write in the UPI note / bank remarks (the company name), so the payment can be matched. */
  reference?: string;
  /** Where the QR comes from; default: what's due on the signed-in owner's plan. */
  loadQr?: LoadUpiQr;
}): ReactElement {
  const i = instructions;
  const payee = i.payee_name || "SKYTECHNO";
  const link = safeHttpsUrl(i.payment_link);
  const paypal = safeHttpsUrl(i.paypal_url);
  const skydo = i.skydo ?? null;
  // Phones: one tap opens GPay / PhonePe with the amount and note filled in (a QR can't be scanned by the same phone).
  const upiApp = isTouchDevice() ? safeUpiUri(i.upi_uri) : null;

  let panel: ReactNode;
  if (way === "upi") {
    panel = i.upi_id ? (
      <>
        {upiApp ? (
          <a className="btn btn--primary btn--block pay-upi-app" href={upiApp}>
            Pay {total} in a UPI app
          </a>
        ) : null}
        <div className="ways__split">
          {/* A QR needs an amount in rupees: the server's UPI link is there only for an INR payment. */}
          {i.upi_uri ? <UpiQrOnRequest loadQr={loadQr} total={total} /> : null}
          <dl className="pay-rows">
            <Row label="UPI ID" value={i.upi_id} copy="UPI ID" />
            <Row label="Payee" value={payee} />
            <Row label="Amount" value={total} />
            <Row
              label="Payment note"
              value={reference}
              copy="payment note"
              hint="Type this in the UPI app's note (or 'Add a message'), so we can match your payment."
            />
          </dl>
        </div>
      </>
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
          <Row
            label="Remarks"
            value={reference}
            copy="remarks"
            hint="Add this in the transfer's remarks (or 'purpose') field, so we can match your payment."
          />
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
              <p className="ways__sub">{link ? "Or send" : "Send"} an ACH or wire transfer to our US account</p>
              <dl className="pay-rows pay-rows--grid">
                <Row label="Account name" value={skydo.account_name} />
                <Row label="Bank" value={skydo.bank_name} />
                <Row label="Account number" value={skydo.account_number} copy="account number" />
                <Row label="Routing number (ABA)" value={skydo.routing_number} copy="routing number" />
                <Row label="SWIFT (wire)" value={skydo.swift} copy="SWIFT code" />
                <Row label="Account type" value={skydo.account_type} />
                <Row label="Amount" value={total} />
                <Row label="Memo" value={reference} copy="memo" hint="Add this as the transfer's memo, so we can match it." />
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
 * Every way to pay that suits this customer, one tab each, in their order (payWays.payWayOptions):
 * India = UPI, bank, International last; US dollars = Skydo (India-only ways left out). Controlled: the
 * parent keeps `way` so the receipt is recorded against it.
 */
export function PaymentWays({
  instructions,
  total,
  way,
  onWay,
  idPrefix = "ways",
  showNote = true,
  reference,
  currency,
  loadQr,
}: {
  instructions: PaymentInstructions;
  /** The formatted amount due, e.g. "₹971". */
  total: string;
  way: PayWay;
  onWay: (way: PayWay) => void;
  idPrefix?: string;
  /** The server's "use your company name as the reference" line; off where the payment slip shows the reference. */
  showNote?: boolean;
  /** The UPI note / bank remarks to use (the company name). */
  reference?: string;
  /** The quote's currency, when known (decides the order and which ways show). */
  currency?: string;
  /** Where the UPI QR comes from (see PayWayDetails). */
  loadQr?: LoadUpiQr;
}): ReactElement {
  const i = instructions;
  const ways = payWayOptions(instructions, currency);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const current = ways.some((w) => w.key === way) ? way : ways[0].key;

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const at = ways.findIndex((w) => w.key === current);
    const next =
      event.key === "ArrowRight" ? (at + 1) % ways.length
      : event.key === "ArrowLeft" ? (at - 1 + ways.length) % ways.length
      : event.key === "Home" ? 0
      : event.key === "End" ? ways.length - 1
      : -1;
    if (next < 0) return;
    event.preventDefault();
    onWay(ways[next].key);
    tabs.current[next]?.focus();
  };

  return (
    <div className="ways">
      {ways.length > 1 ? (
        <div className="ways__tabs" role="tablist" aria-label="Ways to pay" onKeyDown={onKey}>
          {ways.map((w, n) => {
            const on = w.key === current;
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
                  <small>{w.short}</small>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
      <div
        key={current}
        className="ways__panel"
        role={ways.length > 1 ? "tabpanel" : undefined}
        id={`${idPrefix}-panel`}
        aria-labelledby={ways.length > 1 ? `${idPrefix}-tab-${current}` : undefined}
        tabIndex={ways.length > 1 ? 0 : undefined}
      >
        <PayWayDetails instructions={instructions} total={total} way={current} reference={reference} loadQr={loadQr} />
      </div>
      {showNote && i.note ? <p className="dash-note ways__note">{i.note}</p> : null}
    </div>
  );
}
