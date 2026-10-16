import { useEffect, useRef, useState, type ReactElement } from "react";
import { CopyButton } from "../../dashboard/components/CopyButton";
import { DashIcon, type DashIconName } from "../../dashboard/components/DashIcon";
import type { Payment, PaymentInstructions, Quote } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import { defaultWay, methodForWay, type PayWay } from "../payWays";
import { PayWayDetails } from "./PaymentWays";
import { PlanSteps } from "./PlanSteps";
import { QuoteShare } from "./QuoteShare";
import { ReceiptForm } from "./ReceiptForm";

type Screen = "methods" | "details" | "receipt" | "done";

const METHODS: ReadonlyArray<{ key: PayWay; label: string; hint: string; icon: DashIconName }> = [
  { key: "upi", label: "UPI", hint: "Google Pay, PhonePe, Paytm or any UPI app", icon: "phone" },
  { key: "bank", label: "Bank transfer", hint: "NEFT, IMPS or RTGS to our current account", icon: "building" },
  { key: "intl", label: "International", hint: "Card or US bank, through Skydo", icon: "globe" },
];

const TITLES: Record<Exclude<Screen, "details">, string> = {
  methods: "Choose how to pay",
  receipt: "Upload the receipt",
  done: "Receipt sent",
};

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
  /** Offer "email / download / copy link" for the quote (a subscription waiting for payment). */
  shareQuote?: boolean;
  ownerEmail: string;
  onClose: () => void;
  /** After the receipt is accepted: update the account (the modal then shows "Receipt sent"). */
  onSubmitted: (payment: Payment) => void | Promise<void>;
  /** "Go to your dashboard" on the last screen. */
  onDone: () => void;
}

/**
 * Checkout, Razorpay-style: what you're paying for on the left (dark), the steps on the right:
 * choose a way to pay → its details → upload the receipt → sent. Built on the native <dialog> (focus
 * trap, Esc, inert page); a full-screen sheet on phones. Render it only while open: it starts fresh.
 */
export function CheckoutModal({
  quote,
  instructions,
  devices,
  reference,
  upgradePlan,
  shareQuote = false,
  ownerEmail,
  onClose,
  onSubmitted,
  onDone,
}: CheckoutModalProps): ReactElement {
  const ref = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [screen, setScreen] = useState<Screen>("methods");
  const [way, setWay] = useState<PayWay>(() => defaultWay(instructions));
  const money = (amount: string) => formatMoney(amount, quote.currency);
  const total = money(quote.total);
  const discount = Number(quote.discount_amount) > 0;
  const payee = instructions.payee_name || "SKYTECHNO";
  const method = METHODS.find((m) => m.key === way) ?? METHODS[0];

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    // Start on the heading, not the first button (the browser would focus the reference's copy button).
    dialog?.querySelector<HTMLElement>(".checkout__title")?.focus();
  }, []);

  // A new screen starts at its top, with focus on its heading (screen readers hear where they are).
  const go = (next: Screen) => {
    setScreen(next);
    window.requestAnimationFrame(() => {
      bodyRef.current?.scrollTo({ top: 0 });
      bodyRef.current?.querySelector<HTMLElement>(".checkout__title")?.focus();
    });
  };

  const back = screen === "details" ? "methods" : screen === "receipt" ? "details" : null;

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
            {upgradePlan ? <span className="checkout__tag">Upgrade</span> : null}
          </p>
          <p className="checkout__meta">
            {periodLabel(quote.months)}
            {devices ? ` · ${devices}` : ""}
          </p>
          <p className="checkout__total">{total}</p>

          <dl className="checkout__lines">
            <div>
              <dt>Plan price</dt>
              <dd>{money(quote.list_amount)}</dd>
            </div>
            {discount ? (
              <div className="checkout__minus">
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
                <dt>GST (export)</dt>
                <dd>{money("0")}</dd>
              </div>
            ) : null}
          </dl>

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
            Goes straight to {payee}'s bank account. The invoice is emailed once we confirm it.
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
              {screen === "details" ? method.label : TITLES[screen]}
            </h2>
            <button type="button" className="checkout__icon-btn checkout__x" onClick={onClose} aria-label="Close">
              <DashIcon name="close" />
            </button>
          </header>

          <div className="checkout__body" ref={bodyRef} key={screen}>
            {screen === "methods" ? (
              <>
                <ul className="checkout__methods">
                  {METHODS.map((m) => (
                    <li key={m.key}>
                      <button
                        type="button"
                        className="checkout__method"
                        onClick={() => {
                          setWay(m.key);
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
                        {m.key === defaultWay(instructions) ? (
                          <span className="checkout__pill">Suggested</span>
                        ) : null}
                        <DashIcon name="arrow" />
                      </button>
                    </li>
                  ))}
                </ul>
                <button type="button" className="dash-link checkout__skip" onClick={() => go("receipt")}>
                  Already paid? Upload the receipt
                </button>
                {shareQuote ? <QuoteShare ownerEmail={ownerEmail} variant="slip" /> : null}
              </>
            ) : screen === "details" ? (
              <>
                <div className="checkout__details">
                  <PayWayDetails instructions={instructions} total={total} way={way} />
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
                <p>
                  We're checking your payment of <b>{total}</b>. Zinwe {quote.plan_name} switches on as soon as it's
                  confirmed, usually within one working day, and we'll email <b>{ownerEmail}</b>.
                </p>
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
