import { useEffect, useRef, useState, type ReactElement } from "react";
import { CopyButton } from "../../dashboard/components/CopyButton";
import { DashIcon } from "../../dashboard/components/DashIcon";
import { getUpiQr, type Payment, type PaymentInstructions, type PaymentMethod, type Quote } from "../../lib/api";
import { formatDate, formatMoney } from "../../lib/format";
import { defaultWay, intlReady, methodForWay, payWayOptions, type PayWay } from "../payWays";
import { OnlinePay } from "./OnlinePay";
import { PayWayDetails } from "./PaymentWays";
import { PlanSteps } from "./PlanSteps";
import { QuoteShare } from "./QuoteShare";
import { ReceiptForm } from "./ReceiptForm";
import { RejectedBanner } from "./RejectedBanner";
import { trackEvent } from "../../lib/analytics";

type Screen = "methods" | "details" | "receipt" | "done";

const TITLES: Record<Exclude<Screen, "details">, string> = {
  methods: "Choose how to pay",
  receipt: "Upload the receipt",
  done: "Receipt sent",
};

const PAID_TITLE = { paid: "Payment received", pending: "Payment received" } as const;

function periodLabel(months: number): string {
  return months === 12 ? "1 year" : months === 1 ? "1 month" : `${months} months`;
}

export interface CheckoutModalProps {
  /** What's being bought: amounts for the plan and period. */
  quote: Quote;
  instructions: PaymentInstructions;
  /** e.g. "Up to 10 PCs". */
  devices?: string;
  /** What to write as the payment reference (the company name). */
  reference?: string;
  /** An upgrade from the current plan: the plan code the payment is for. */
  upgradePlan?: string;
  /** An offer from the Zinwe team (its id; `quote` is its price): paid online only, straight to Razorpay. */
  offer?: number;
  /** An upgrade's period: the new plan runs until `until`, with the paid days left on the old one added. */
  period?: { until: string; carriedDays: number } | null;
  /** The last payment wasn't accepted: say why, before the owner pays again. */
  rejected?: Payment | null;
  /** Offer "email / download / copy link" for the quote (a subscription waiting for payment). */
  shareQuote?: boolean;
  ownerEmail: string;
  onClose: () => void;
  /** After the receipt is accepted: update the account (the modal then shows "Receipt sent"). */
  onSubmitted: (payment: Payment) => void | Promise<void>;
  /** "Go to your dashboard" on the last screen. */
  onDone: () => void;
}

/** The price lines (plan price, discount, tax). Shown in the summary; on phones inside "Price details". */
function PriceLines({ quote, className, offer }: { quote: Quote; className: string; offer?: boolean }): ReactElement {
  const money = (amount: string) => formatMoney(amount, quote.currency);
  return (
    <dl className={className}>
      <div>
        <dt>Plan price</dt>
        <dd>{money(quote.list_amount)}</dd>
      </div>
      {Number(quote.discount_amount) > 0 ? (
        <div className="checkout__minus">
          <dt>{offer ? "Your offer" : "Launch discount"}</dt>
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
  );
}

/**
 * Checkout, Razorpay-style: what you're paying for on the left (dark), the steps on the right:
 * choose a way to pay → its details → upload the receipt → sent. Built on the native <dialog> (focus
 * trap, Esc, inert page); a full-screen sheet on phones. Render it only while open: it starts fresh,
 * and gives focus back to whatever opened it when it closes.
 */
export function CheckoutModal({
  quote,
  instructions,
  devices,
  reference,
  upgradePlan,
  offer,
  period = null,
  rejected = null,
  shareQuote = false,
  ownerEmail,
  onClose,
  onSubmitted,
  onDone,
}: CheckoutModalProps): ReactElement {
  const ref = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  // Funnel step (GA4 recommended name): the owner opened checkout for a plan.
  useEffect(() => {
    trackEvent("begin_checkout", { plan: quote.plan_code, currency: quote.currency, upgrade: Boolean(upgradePlan) });
    // Once per opening of the modal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // "Pay online" (Razorpay) first when it's on; the manual ways (and the receipt) always stay as the fallback.
  // An offer is paid online only: straight to "Pay online", no other way.
  const allWays = payWayOptions(instructions, quote.currency, true);
  const ways = offer ? allWays.filter((w) => w.key === "online") : allWays;
  const [screen, setScreen] = useState<Screen>(offer && ways.length ? "details" : "methods");
  const [way, setWay] = useState<PayWay>(() => {
    if (offer) return "online";
    const first = defaultWay(instructions, true);
    return ways.some((w) => w.key === first) ? first : ways[0].key;
  });
  // How it ended: paid online (plan on now), paid online but still being applied, or a receipt sent.
  const [paidOnline, setPaidOnline] = useState<"paid" | "pending" | null>(null);
  const [pendingNote, setPendingNote] = useState("");
  // "Already paid?" skips choosing a way, so the receipt screen asks how they paid.
  const [skipped, setSkipped] = useState(false);
  const money = (amount: string) => formatMoney(amount, quote.currency);
  const total = money(quote.total);
  const payee = instructions.payee_name || "SKYTECHNO";
  const usd = quote.currency === "USD";
  const method = ways.find((m) => m.key === way) ?? ways[0];
  const suggested = ways[0].key;

  // Whatever opened the checkout gets focus back when it closes (Esc, ×, backdrop or done). Read while rendering,
  // before the dialog takes focus (an effect would see the dialog's own heading on React's second dev run).
  const [opener] = useState(() => (document.activeElement instanceof HTMLElement ? document.activeElement : null));

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    // Start on the heading, not the first button (the browser would focus the reference's copy button).
    dialog?.querySelector<HTMLElement>(".checkout__title")?.focus();
    return () => {
      if (opener && opener !== document.body && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, [opener]);

  // A new screen starts at its top, with focus on its heading (screen readers hear where they are).
  const go = (next: Screen) => {
    setScreen(next);
    window.requestAnimationFrame(() => {
      bodyRef.current?.scrollTo({ top: 0 });
      ref.current?.querySelector<HTMLElement>(".checkout__title")?.focus();
    });
  };

  const back =
    screen === "details" ? (offer ? null : "methods") : screen === "receipt" ? (skipped ? "methods" : "details") : null;

  // The choices for "How did you pay?" (only the ways this customer was offered).
  const askMethod: ReadonlyArray<{ value: PaymentMethod; label: string }> = ways.filter((w) => w.key !== "online").map((w) => ({
    value: methodForWay(w.key, instructions),
    label: w.key === "intl" ? (usd ? "Card or US bank (Skydo)" : "From outside India (Skydo)") : w.label,
  }));

  const secure = usd && intlReady(instructions)
    ? `Paid through Skydo to ${payee}. The invoice is emailed once we confirm the payment.`
    : ways.some((w) => w.key === "online")
      ? `Pay online through Razorpay, or straight to ${payee}'s bank account. The invoice is emailed either way.`
      : `Goes straight to ${payee}'s bank account. The invoice is emailed once we confirm it.`;

  return (
    <dialog
      ref={ref}
      className="checkout"
      aria-labelledby="checkout-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="checkout__panel">
        <aside className="checkout__summary" aria-label="What you're paying for">
          <p className="checkout__brand" aria-hidden="true">
            <b>Z</b>inwe
          </p>
          <p className="checkout__payee">Pay to {payee}</p>
          <p className="checkout__plan">
            Zinwe {quote.plan_name}
            {upgradePlan ? <span className="checkout__tag">{offer ? "Offer" : "Upgrade"}</span> : null}
          </p>
          <p className="checkout__meta">
            {period
              ? `Until ${formatDate(period.until)}${
                  period.carriedDays > 0
                    ? ` · includes ${period.carriedDays} paid day${period.carriedDays === 1 ? "" : "s"} carried over`
                    : ""
                }`
              : periodLabel(quote.months)}
            {devices ? ` · ${devices}` : ""}
          </p>
          <p className="checkout__total">{total}</p>

          <PriceLines quote={quote} className="checkout__lines" offer={Boolean(offer)} />
          <details className="checkout__price">
            <summary>Price details</summary>
            <PriceLines quote={quote} className="checkout__lines checkout__lines--sheet" offer={Boolean(offer)} />
          </details>

          {reference ? (
            <div className="checkout__ref">
              <div>
                <span>Payment reference</span>
                <b>{reference}</b>
              </div>
              <CopyButton text={reference} what="payment reference" iconOnly />
            </div>
          ) : null}

          <p className="checkout__secure">
            <DashIcon name="lock" />
            {secure}
          </p>
        </aside>

        <section className="checkout__main">
          <PlanSteps current={screen === "done" ? 2 : 1} className="checkout__steps" />
          <header className="checkout__head">
            {back ? (
              <button type="button" className="checkout__icon-btn" onClick={() => go(back)} aria-label="Back">
                <DashIcon name="back" />
              </button>
            ) : null}
            <h2 className="checkout__title" id="checkout-title" tabIndex={-1}>
              {screen === "details" ? method.label : screen === "done" && paidOnline ? PAID_TITLE[paidOnline] : TITLES[screen]}
            </h2>
            <button type="button" className="checkout__icon-btn checkout__x" onClick={onClose} aria-label="Close">
              <DashIcon name="close" />
            </button>
          </header>

          <div className="checkout__body" ref={bodyRef} key={screen}>
            {screen === "methods" ? (
              <>
                {rejected ? (
                  <RejectedBanner payment={rejected} next="Pay again below and send the new receipt." />
                ) : null}
                <ul className="checkout__methods">
                  {ways.map((m) => (
                    <li key={m.key}>
                      <button
                        type="button"
                        className="checkout__method"
                        onClick={() => {
                          setWay(m.key);
                          setSkipped(false);
                          go("details");
                        }}
                      >
                        <span className="checkout__method-icon" aria-hidden="true">
                          <DashIcon name={m.icon} />
                        </span>
                        <span className="checkout__method-text">
                          <b>{m.label}</b>
                          <small>{m.hint}</small>
                        </span>
                        {m.tag ? (
                          <span className="checkout__pill checkout__pill--plain">{m.tag}</span>
                        ) : m.key === suggested && ways.length > 1 ? (
                          <span className="checkout__pill">Suggested</span>
                        ) : null}
                        <DashIcon name="arrow" />
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="dash-link checkout__skip"
                  onClick={() => {
                    setSkipped(true);
                    go("receipt");
                  }}
                >
                  Already paid? Upload the receipt
                </button>
                {shareQuote ? <QuoteShare ownerEmail={ownerEmail} variant="slip" /> : null}
              </>
            ) : screen === "details" && way === "online" ? (
              <div className="checkout__details">
                <OnlinePay
                  total={total}
                  upgradePlan={upgradePlan}
                  offer={offer}
                  onPaid={async (payment) => {
                    if (payment) await onSubmitted(payment);
                    setPaidOnline("paid");
                    go("done");
                  }}
                  onPending={(result) => {
                    setPendingNote(result.detail ?? "");
                    setPaidOnline("pending");
                    go("done");
                  }}
                  onFallback={offer ? undefined : () => setWay("upi")}
                  onWindow={(open) => {
                    const dialog = ref.current;
                    if (!dialog) return;
                    if (open && dialog.open) dialog.close();
                    else if (!open && !dialog.open) dialog.showModal();
                  }}
                />
              </div>
            ) : screen === "details" ? (
              <>
                <div className="checkout__details">
                  <PayWayDetails
                    instructions={instructions}
                    total={total}
                    way={way}
                    reference={reference}
                    loadQr={() => getUpiQr(upgradePlan)}
                  />
                </div>
                <button type="button" className="btn btn--primary btn--block" onClick={() => go("receipt")}>
                  I've paid {total} <span className="arr">→</span>
                </button>
                <p className="checkout__hint">Next, upload the receipt your app shows. Keep this window open while you pay.</p>
              </>
            ) : screen === "receipt" ? (
              <ReceiptForm
                bare
                method={methodForWay(way, instructions)}
                askMethod={skipped && askMethod.length > 1 ? askMethod : undefined}
                upgradePlan={upgradePlan}
                onSubmitted={async (payment) => {
                  await onSubmitted(payment);
                  go("done");
                }}
              />
            ) : (
              <div className="checkout__done">
                <span className="checkout__done-mark" aria-hidden="true">
                  <DashIcon name="check" />
                </span>
                {paidOnline === "paid" ? (
                  <p>
                    Payment of <b>{total}</b> received. Zinwe {quote.plan_name} is on now, and the invoice is on its way
                    to <b>{ownerEmail}</b>.
                  </p>
                ) : paidOnline === "pending" ? (
                  <p>{pendingNote || `Payment of ${total} received. We're confirming it, and we'll email ${ownerEmail}.`}</p>
                ) : (
                  <p>
                    We're checking your payment of <b>{total}</b>. Zinwe {quote.plan_name} switches on as soon as it's
                    confirmed, usually within one working day, and we'll email <b>{ownerEmail}</b>.
                  </p>
                )}
                <button type="button" className="btn btn--primary btn--block" onClick={onDone}>
                  Go to your dashboard <span className="arr">→</span>
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </dialog>
  );
}
