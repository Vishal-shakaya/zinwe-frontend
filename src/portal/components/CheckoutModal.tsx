import { useEffect, useRef, useState, type ReactElement } from "react";
import { LegalDialog } from "../../components/legal/LegalDialog";
import { Brand } from "../../components/ui/Brand";
import { PAYMENT_TERMS } from "../../content/legal";
import { DashIcon } from "../../dashboard/components/DashIcon";
import {
  errorMessage,
  getCheckoutPreview,
  getUpiQr,
  type BillingCycle,
  type Payment,
  type PaymentInstructions,
  type PaymentMethod,
  type Quote,
  type UpgradeQuote,
} from "../../lib/api";
import { trackEvent } from "../../lib/analytics";
import { cx } from "../../lib/cx";
import { formatDate, formatMoney } from "../../lib/format";
import { manualWayOptions, methodForWay, onlineReady, type PayWay } from "../payWays";
import { useOnlinePayment } from "../useOnlinePayment";
import { CycleToggle } from "./CycleToggle";
import { AcceptedBrands, TrustRow } from "./PaymentBrands";
import { PayWayDetails } from "./PaymentWays";
import { PlanSteps } from "./PlanSteps";
import { QuoteShare } from "./QuoteShare";
import { ReceiptForm } from "./ReceiptForm";
import { RejectedBanner } from "./RejectedBanner";

type Screen = "pay" | "manual" | "receipt" | "done";

/** How long a manual payment takes to switch the plan on (staff check the receipt). */
const MANUAL_HOURS = 24;

export interface CheckoutModalProps {
  /** What to show before the server's price for the chosen cycle arrives (the plan card's quote). */
  initialQuote?: Quote;
  /** The cycle to open on (the plan page's switch); default: the subscription's own. */
  initialCycle?: BillingCycle;
  instructions: PaymentInstructions;
  /** e.g. "Up to 10 PCs". */
  devices?: string;
  /** What to write as the payment reference (the company name). */
  reference?: string;
  /** An upgrade from the current plan: the plan code the payment is for. */
  upgradePlan?: string;
  /** Paying again for the same plan (the Billing page's Renew). */
  renewal?: boolean;
  /** An offer from the Zinwe team: its id and price. Paid online only, for one cycle of the owner's own. */
  offer?: { id: number; quote: Quote };
  /** The last payment wasn't accepted: say why, before the owner pays again. */
  rejected?: Payment | null;
  /** Offer "email / download / copy link" for the quote (a subscription waiting for payment). */
  shareQuote?: boolean;
  ownerEmail: string;
  onClose: () => void;
  /** After a payment is accepted (online) or sent for checking (receipt): update the account. */
  onSubmitted: (payment: Payment) => void | Promise<void>;
  /** "Go to your dashboard" on the last screen. */
  onDone: () => void;
}

/** The total tax rate: 18 for CGST 9% + SGST 9%, or IGST 18%. */
function taxRate(quote: Quote): string {
  const rate = quote.taxes.reduce((sum, tax) => sum + Number(tax.rate), 0);
  return Number.isInteger(rate) ? String(rate) : rate.toFixed(2).replace(/0+$/, "");
}

/** The price lines (plan price, discount, tax). Shown in the summary; on phones inside "Price details". */
function PriceLines({ quote, className, offer }: { quote: Quote; className: string; offer?: boolean }): ReactElement {
  const money = (amount: string) => formatMoney(amount, quote.currency);
  const yearly = quote.billing_cycle === "yearly";
  return (
    <dl className={className}>
      <div>
        <dt>{yearly ? "Plan price, 12 months" : "Plan price"}</dt>
        <dd>{money(quote.list_amount)}</dd>
      </div>
      {Number(quote.discount_amount) > 0 ? (
        <div className="checkout__minus">
          <dt>{offer ? "Your offer" : yearly ? "Discount, billed yearly" : "Launch discount"}</dt>
          <dd>− {money(quote.discount_amount)}</dd>
        </div>
      ) : null}
      {quote.taxes.length ? (
        <>
          {/* Tax, its type (GST) and the rate; the CGST + SGST split under it when there is one. */}
          <div className="checkout__tax">
            <dt>
              Tax <span className="checkout__tax-type">GST</span> {taxRate(quote)}%
            </dt>
            <dd>{money(quote.tax_total)}</dd>
          </div>
          {quote.taxes.length > 1
            ? quote.taxes.map((tax) => (
                <div key={tax.label} className="checkout__tax-part">
                  <dt>
                    {tax.label} {tax.rate}%
                  </dt>
                  <dd>{money(tax.amount)}</dd>
                </div>
              ))
            : null}
        </>
      ) : null}
      {quote.export ? (
        <div>
          <dt>Tax</dt>
          <dd>None (international)</dd>
        </div>
      ) : null}
    </dl>
  );
}

type Previews = Partial<Record<BillingCycle, UpgradeQuote>>;

/**
 * Checkout (2026-10-23): what you're paying for on the left (dark), and two clear ways to pay on the right:
 * - **Pay with Razorpay**, first: UPI apps, cards, netbanking and wallets in India, cards from abroad. One click opens
 *   Razorpay's window; the plan switches on as soon as it's paid.
 * - **Pay manually**: UPI or bank transfer (India) or an international transfer through Skydo, then the receipt;
 *   the plan switches on within 24 hours. Shown with every manual way when Razorpay is off or fails.
 * Monthly or yearly is chosen at the top (the server prices both). Built on the native <dialog> (focus trap, Esc,
 * inert page); a full-screen sheet on phones. Render it only while open: it starts fresh and gives focus back to
 * whatever opened it.
 */
export function CheckoutModal({
  initialQuote,
  initialCycle,
  instructions,
  devices,
  reference,
  upgradePlan,
  renewal = false,
  offer,
  rejected = null,
  shareQuote = false,
  ownerEmail,
  onClose,
  onSubmitted,
  onDone,
}: CheckoutModalProps): ReactElement {
  const ref = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Both cycles are priced up front, so switching is instant and the switch can say what a year saves.
  const [previews, setPreviews] = useState<Previews>({});
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [cycle, setCycle] = useState<BillingCycle>(initialCycle ?? initialQuote?.billing_cycle ?? "monthly");
  useEffect(() => {
    if (offer) return undefined;
    const controller = new AbortController();
    const load = (c: BillingCycle) => getCheckoutPreview({ plan: upgradePlan, cycle: c }, controller.signal);
    void Promise.allSettled([load("monthly"), load("yearly")]).then(([monthly, yearly]) => {
      if (controller.signal.aborted) return;
      const next: Previews = {};
      if (monthly.status === "fulfilled") next.monthly = monthly.value;
      if (yearly.status === "fulfilled") next.yearly = yearly.value;
      setPreviews(next);
      if (!next.monthly && !next.yearly) {
        const failure = monthly.status === "rejected" ? monthly.reason : null;
        setPreviewError(failure ? errorMessage(failure) : "We couldn't price this plan.");
      }
    });
    return () => controller.abort();
  }, [offer, upgradePlan]);

  const preview = offer ? null : (previews[cycle] ?? null);
  const quote: Quote | undefined = offer?.quote ?? preview?.quote ?? (cycle === initialQuote?.billing_cycle ? initialQuote : undefined);
  const priced = Boolean(quote) && (Boolean(offer) || Boolean(preview));
  const currency = quote?.currency ?? initialQuote?.currency ?? instructions.currency ?? "INR";
  const usd = currency === "USD";
  const money = (amount: string | number) => formatMoney(amount, currency);
  const total = quote ? money(quote.total) : "…";
  const canSwitch = !offer && Boolean(previews.monthly && previews.yearly);
  const saving = previews.yearly?.yearly_saving_percent ?? 0;
  const yearlySaved =
    previews.monthly && previews.yearly
      ? Number(previews.monthly.quote.total) * 12 - Number(previews.yearly.quote.total)
      : 0;

  useEffect(() => {
    trackEvent("begin_checkout", { plan: initialQuote?.plan_code ?? upgradePlan ?? "", currency, upgrade: Boolean(upgradePlan) });
    // Once per opening of the modal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const online = onlineReady(instructions, true);
  const manual = manualWayOptions(instructions, currency);
  const [screen, setScreen] = useState<Screen>("pay");
  const [way, setWay] = useState<PayWay>(() => manual[0].key);
  // Why the manual ways are shown (Razorpay unavailable right now).
  const [unavailable, setUnavailable] = useState<string | null>(null);
  // How it ended: paid online (plan on now), paid online but still being applied, or a receipt sent.
  const [paidOnline, setPaidOnline] = useState<"paid" | "pending" | null>(null);
  const [pendingNote, setPendingNote] = useState("");
  // "Already paid?" skips the details, so the receipt screen asks how they paid.
  const [skipped, setSkipped] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const payee = instructions.payee_name || "SKYTECHNO";

  // Whatever opened the checkout gets focus back when it closes (Esc, ×, backdrop or done). Read while rendering,
  // before the dialog takes focus (an effect would see the dialog's own heading on React's second dev run).
  const [opener] = useState(() => (document.activeElement instanceof HTMLElement ? document.activeElement : null));

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
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

  const pay = useOnlinePayment({
    upgradePlan,
    offer: offer?.id,
    cycle,
    onPaid: async (payment) => {
      if (payment) await onSubmitted(payment);
      setPaidOnline("paid");
      go("done");
    },
    onPending: (result) => {
      setPendingNote(result.detail ?? "");
      setPaidOnline("pending");
      go("done");
    },
    // Razorpay off, down or refusing us, or its window blocked: the manual ways, with why (never for an offer).
    onUnavailable: offer
      ? undefined
      : (reason) => {
          setUnavailable(reason);
          go("manual");
        },
    onWindow: (open) => {
      const dialog = ref.current;
      if (!dialog) return;
      if (open && dialog.open) dialog.close();
      else if (!open && !dialog.open) dialog.showModal();
    },
  });
  const busy = pay.stage !== "idle";

  const back: Screen | null = screen === "manual" ? "pay" : screen === "receipt" ? "manual" : null;

  // The choices for "How did you pay?": every manual way that suits the customer.
  const askMethod: ReadonlyArray<{ value: PaymentMethod; label: string }> = manual.map((w) => ({
    value: methodForWay(w.key, instructions),
    label: w.key === "intl" ? "International transfer (Skydo)" : w.label,
  }));

  // The UPI link and QR are for the amount of the chosen cycle.
  const cycleInstructions: PaymentInstructions = { ...instructions, upi_uri: preview?.upi_uri ?? instructions.upi_uri };

  const plan = quote?.plan_name ?? initialQuote?.plan_name ?? "";
  const tag = offer ? "Offer" : upgradePlan ? "Upgrade" : renewal ? "Renewal" : null;
  const cycleWord = quote?.billing_cycle === "yearly" ? "Billed yearly" : "Billed monthly";
  const until = preview?.covers_until ?? null;
  const carried = preview?.carried_days ?? 0;

  const title =
    screen === "pay"
      ? "How would you like to pay?"
      : screen === "manual"
        ? "Pay manually"
        : screen === "receipt"
          ? "Upload the receipt"
          : paidOnline
            ? "Payment received"
            : "Receipt sent";

  const onlineCta =
    pay.stage === "starting"
      ? "Opening the secure window…"
      : pay.stage === "open"
        ? "Finish in the Razorpay window…"
        : pay.stage === "confirming"
          ? "Confirming your payment…"
          : `Pay ${total}`;

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
          {/* The official Zinwe wordmark, light lettering for the dark summary. */}
          <p className="checkout__brand">
            <Brand variant="static" tone="light" height={26} />
          </p>
          <p className="checkout__payee">Pay to {payee}</p>
          <p className="checkout__plan">
            Zinwe {plan}
            {tag ? <span className="checkout__tag">{tag}</span> : null}
          </p>
          <p className="checkout__meta">
            {cycleWord}
            {until ? ` · until ${formatDate(until)}` : ""}
            {devices ? ` · ${devices}` : ""}
          </p>
          {carried > 0 ? (
            <p className="co-carried">
              <DashIcon name="check" />
              Includes {carried} paid day{carried === 1 ? "" : "s"} carried over
            </p>
          ) : null}
          <p className={cx("checkout__total", !priced && "is-loading")}>{total}</p>
          {quote?.billing_cycle === "yearly" && yearlySaved > 0 ? (
            <p className="co-save">
              <DashIcon name="check" />
              You save {money(Math.round(yearlySaved))} a year
            </p>
          ) : null}

          {quote ? (
            <>
              <PriceLines quote={quote} className="checkout__lines" offer={Boolean(offer)} />
              <details className="checkout__price">
                <summary>Price details</summary>
                <PriceLines quote={quote} className="checkout__lines checkout__lines--sheet" offer={Boolean(offer)} />
              </details>
            </>
          ) : null}
          <AcceptedBrands currency={currency} className="co-accept--summary" />
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
              {title}
            </h2>
            <button type="button" className="checkout__icon-btn checkout__x" onClick={onClose} aria-label="Close">
              <DashIcon name="close" />
            </button>
          </header>

          <div className="checkout__body" ref={bodyRef} key={screen}>
            {previewError && !offer && screen !== "done" ? (
              <div className="dash-banner dash-banner--bad" role="alert">
                <DashIcon name="alert" />
                <span>{previewError}</span>
              </div>
            ) : screen === "pay" ? (
              <div className="co-pay">
                {rejected ? <RejectedBanner payment={rejected} next="Pay again below." /> : null}
                {canSwitch ? (
                  <div className="co-cycle">
                    <CycleToggle value={cycle} onChange={setCycle} saving={saving} className="co-cycle__toggle" />
                    <p className="co-cycle__note">
                      {cycle === "yearly"
                        ? `${money(previews.yearly?.quote.total ?? "0")} for 12 months, paid once`
                        : `${money(previews.monthly?.quote.total ?? "0")} a month`}
                    </p>
                  </div>
                ) : null}

                <div className="co-options">
                  <button
                    type="button"
                    className={cx("co-option co-option--online", !online && "is-off")}
                    onClick={() => void pay.pay()}
                    disabled={!online || busy || !priced}
                    aria-describedby="co-online-sub"
                  >
                    <span className="co-option__icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
                        <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
                      </svg>
                    </span>
                    <span className="co-option__body">
                      <span className="co-option__title">
                        Pay with Razorpay
                        {online ? (
                          <span className="co-badge co-badge--live">
                            <i aria-hidden="true" />
                            Instant activation
                          </span>
                        ) : null}
                      </span>
                      <span className="co-option__sub" id="co-online-sub">
                        {online
                          ? usd
                            ? "International cards. Your plan switches on as soon as it's paid."
                            : "UPI, cards, netbanking or wallets. Your plan switches on as soon as it's paid."
                          : "Online payment isn't available right now. Please pay manually."}
                      </span>
                    </span>
                    <span className="co-option__cta">
                      {busy ? <span className="co-spinner" aria-hidden="true" /> : <DashIcon name="lock" />}
                      {onlineCta}
                      {busy ? null : <span aria-hidden="true">→</span>}
                    </span>
                  </button>
                  {pay.error ? (
                    <div className="dash-banner dash-banner--bad co-error" role="alert">
                      <DashIcon name="alert" />
                      <span>{pay.error}</span>
                    </div>
                  ) : null}

                  {offer ? null : (
                    <button
                      type="button"
                      className={cx("co-option co-option--manual", !online && "is-primary")}
                      onClick={() => go("manual")}
                      disabled={busy}
                    >
                      <span className="co-option__icon" aria-hidden="true">
                        <DashIcon name="building" />
                      </span>
                      <span className="co-option__body">
                        <span className="co-option__title">
                          Pay manually
                          <span className="co-badge">
                            <DashIcon name="clock" />
                            Activated within {MANUAL_HOURS} hrs
                          </span>
                        </span>
                        <span className="co-option__sub">
                          {usd
                            ? "International bank transfer through Skydo, then upload the receipt."
                            : "UPI or bank transfer to our account, then upload the receipt."}
                        </span>
                      </span>
                      <span className="co-option__cta co-option__cta--ghost">
                        Continue <span aria-hidden="true">→</span>
                      </span>
                    </button>
                  )}
                </div>

                <AcceptedBrands currency={currency} className="co-accept--inline" />
                <TrustRow gst={Boolean(quote?.taxes.length)} />

                <p className="co-legal">
                  By continuing, you agree to Zinwe's{" "}
                  <button type="button" className="co-legal__link" onClick={() => setTermsOpen(true)}>
                    Payment terms
                  </button>
                  . Online payments are processed by Razorpay; Zinwe never sees your card or bank details.
                </p>
                {!offer && shareQuote ? (
                  <div className="co-foot">
                    <QuoteShare ownerEmail={ownerEmail} variant="slip" />
                  </div>
                ) : null}
              </div>
            ) : screen === "manual" ? (
              <div className="co-manual">
                {unavailable ? (
                  <div className="dash-banner dash-banner--warn" role="status">
                    <DashIcon name="alert" />
                    <span>{unavailable} Pay manually instead: it takes a few minutes more.</span>
                  </div>
                ) : null}
                <ol className="co-howto" aria-label="How it works">
                  <li>
                    <b>1</b> Pay {total}
                  </li>
                  <li>
                    <b>2</b> Upload the receipt
                  </li>
                  <li>
                    <b>3</b> Plan on within {MANUAL_HOURS} hrs
                  </li>
                </ol>
                {manual.length > 1 ? (
                  <div className="co-ways" role="tablist" aria-label="Ways to pay manually">
                    {manual.map((w) => (
                      <button
                        key={w.key}
                        type="button"
                        role="tab"
                        aria-selected={w.key === way}
                        className={cx("co-ways__tab", w.key === way && "is-on")}
                        onClick={() => setWay(w.key)}
                      >
                        <DashIcon name={w.icon} />
                        <span>
                          <b>{w.key === "intl" ? "International" : w.label}</b>
                          <small>{w.key === "intl" ? "Through Skydo" : w.short}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="checkout__details" role={manual.length > 1 ? "tabpanel" : undefined}>
                  <PayWayDetails
                    instructions={cycleInstructions}
                    total={total}
                    way={way}
                    reference={reference}
                    loadQr={() => getUpiQr(upgradePlan, cycle)}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn--primary btn--block co-paid"
                  onClick={() => {
                    setSkipped(false);
                    go("receipt");
                  }}
                >
                  I've paid {total} <span className="arr">→</span>
                </button>
                <p className="checkout__hint">Next, upload the receipt your app shows. Keep this window open while you pay.</p>
                <div className="co-foot">
                  {/* Paid earlier (or another way): straight to the receipt, which asks how they paid. */}
                  <button
                    type="button"
                    className="dash-link"
                    onClick={() => {
                      setSkipped(true);
                      go("receipt");
                    }}
                  >
                    Already paid? Upload the receipt
                  </button>
                </div>
              </div>
            ) : screen === "receipt" ? (
              <ReceiptForm
                bare
                method={methodForWay(way, instructions)}
                askMethod={skipped && askMethod.length > 1 ? askMethod : undefined}
                upgradePlan={upgradePlan}
                billingCycle={offer ? undefined : cycle}
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
                    Payment of <b>{total}</b> received. Zinwe {plan} is on now, and the invoice is on its way to{" "}
                    <b>{ownerEmail}</b>.
                  </p>
                ) : paidOnline === "pending" ? (
                  <p>{pendingNote || `Payment of ${total} received. We're confirming it, and we'll email ${ownerEmail}.`}</p>
                ) : (
                  <p>
                    We're checking your payment of <b>{total}</b>. Zinwe {plan} switches on as soon as it's confirmed,
                    within {MANUAL_HOURS} hours, and we'll email <b>{ownerEmail}</b>.
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
      <LegalDialog open={termsOpen} docs={[PAYMENT_TERMS]} title="Payment terms" onClose={() => setTermsOpen(false)} />
    </dialog>
  );
}
