import { useEffect, useRef, useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { LegalDialog } from "../../components/legal/LegalDialog";
import { PAYMENT_TERMS } from "../../content/legal";
import { DashIcon } from "../../dashboard/components/DashIcon";
import {
  errorMessage,
  getCheckoutPreview,
  getUpiQr,
  type BillingCycle,
  type Payment,
  type PaymentInstructions,
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
import { PlanDone } from "./PlanDone";
import { QuoteShare } from "./QuoteShare";
import { ReceiptForm } from "./ReceiptForm";
import { RejectedBanner } from "./RejectedBanner";

type Screen = "pay" | "manual" | "done";

/** How long a manual payment takes to switch the plan on (staff check the receipt). */
const MANUAL_HOURS = 24;

export interface CheckoutProps {
  /** The plan's name, shown until the server's price arrives. */
  planName: string;
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
  /** The link above the heading: where this payment started. */
  back: { to: string; label: string; state?: unknown };
  /** The page's screen changed (the header's stepper follows it). */
  onStage: (stage: "pay" | "done") => void;
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

/** The price lines of the order summary: plan price, discount, tax. */
function PriceLines({ quote, offer }: { quote: Quote; offer?: boolean }): ReactElement {
  const money = (amount: string) => formatMoney(amount, quote.currency);
  const yearly = quote.billing_cycle === "yearly";
  return (
    <dl className="zpf-lines">
      <div>
        <dt>{yearly ? "Plan price, 12 months" : "Plan price"}</dt>
        <dd>{money(quote.list_amount)}</dd>
      </div>
      {Number(quote.discount_amount) > 0 ? (
        <div>
          <dt>{offer ? "Your offer" : yearly ? "Discount, billed yearly" : "Launch discount"}</dt>
          <dd>− {money(quote.discount_amount)}</dd>
        </div>
      ) : null}
      {quote.taxes.length ? (
        <>
          <div>
            <dt>GST {taxRate(quote)}%</dt>
            <dd>{money(quote.tax_total)}</dd>
          </div>
          {/* The CGST + SGST split under it, when there is one. */}
          {quote.taxes.length > 1
            ? quote.taxes.map((tax) => (
                <div key={tax.label} className="zpf-lines__part">
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
 * Paying, as a full page (Plans prototype, 1 Nov 2026), the same for registering, upgrading and renewing. Replaced
 * the checkout dialog.
 * - Monthly or yearly, then two clear ways to pay on the left, and the order on the right with the pay button.
 * - **Pay with Razorpay**: UPI apps, cards, netbanking and wallets in India, cards from abroad. The button opens
 *   Razorpay's window; the plan switches on as soon as it's paid.
 * - **Pay manually**: UPI or bank transfer (India) or an international transfer through Skydo, then the receipt on
 *   the same screen; the plan switches on within 24 hours. Razorpay off or failing lands here too, saying why.
 * Render it fresh for each payment (a `key`): it starts on its first screen and keeps its own state through to Done,
 * whatever the account's step becomes once the payment is in.
 */
export function Checkout({
  planName,
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
  back,
  onStage,
  onSubmitted,
  onDone,
}: CheckoutProps): ReactElement {
  const heading = useRef<HTMLHeadingElement>(null);

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
    // Once per opening of the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const online = onlineReady(instructions, true);
  const manual = manualWayOptions(instructions, currency);
  const [screen, setScreen] = useState<Screen>("pay");
  // Which way the summary's button pays: Razorpay when it's on.
  const [choice, setChoice] = useState<"online" | "manual">(online ? "online" : "manual");
  const [way, setWay] = useState<PayWay>(() => manual[0].key);
  // Why the manual ways are shown (Razorpay unavailable right now).
  const [unavailable, setUnavailable] = useState<string | null>(null);
  // How it ended: paid online (plan on now), paid online but still being applied, or a receipt sent.
  const [paidOnline, setPaidOnline] = useState<"paid" | "pending" | null>(null);
  const [pendingNote, setPendingNote] = useState("");
  const [termsOpen, setTermsOpen] = useState(false);
  const payee = instructions.payee_name || "SKYTECHNO";

  // A new screen starts at its top, with focus on its heading (screen readers hear where they are).
  useEffect(() => {
    if (screen === "done") return;
    window.scrollTo(0, 0);
    heading.current?.focus();
  }, [screen]);
  useEffect(() => {
    onStage(screen === "done" ? "done" : "pay");
  }, [screen, onStage]);

  const pay = useOnlinePayment({
    upgradePlan,
    offer: offer?.id,
    cycle,
    onPaid: async (payment) => {
      if (payment) await onSubmitted(payment);
      setPaidOnline("paid");
      setScreen("done");
    },
    onPending: (result) => {
      setPendingNote(result.detail ?? "");
      setPaidOnline("pending");
      setScreen("done");
    },
    // Razorpay off, down or refusing us, or its window blocked: the manual ways, with why (never for an offer).
    onUnavailable: offer
      ? undefined
      : (reason) => {
          setUnavailable(reason);
          setScreen("manual");
        },
  });
  const busy = pay.stage !== "idle";

  // The UPI link and QR are for the amount of the chosen cycle.
  const cycleInstructions: PaymentInstructions = { ...instructions, upi_uri: preview?.upi_uri ?? instructions.upi_uri };

  const plan = quote?.plan_name ?? initialQuote?.plan_name ?? planName;
  const tag = offer ? "Offer" : upgradePlan ? "Upgrade" : renewal ? "Renewal" : null;
  const until = preview?.covers_until ?? null;
  const carried = preview?.carried_days ?? 0;
  const meta = [
    (quote?.billing_cycle ?? cycle) === "yearly" ? "Billed yearly" : "Billed monthly",
    devices,
    until ? `until ${formatDate(until)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const onlineCta =
    pay.stage === "starting"
      ? "Opening the secure window…"
      : pay.stage === "open"
        ? "Finish in the Razorpay window…"
        : pay.stage === "confirming"
          ? "Confirming your payment…"
          : `Pay ${total}`;

  if (screen === "done") {
    if (paidOnline === "paid") {
      return (
        <PlanDone title={`${plan} is on`} onDone={onDone}>
          Payment of <b>{total}</b> received. Zinwe {plan} is on now, and the invoice is on its way to <b>{ownerEmail}</b>.
        </PlanDone>
      );
    }
    if (paidOnline === "pending") {
      return (
        <PlanDone title="We're confirming your payment" onDone={onDone}>
          {pendingNote || `Payment of ${total} received. We're confirming it, and we'll email ${ownerEmail}.`}
        </PlanDone>
      );
    }
    return (
      <PlanDone title="We're checking your payment" onDone={onDone}>
        We're checking your payment of <b>{total}</b>. Zinwe {plan} switches on as soon as it's confirmed, within{" "}
        {MANUAL_HOURS} hours, and we'll email <b>{ownerEmail}</b>.
      </PlanDone>
    );
  }

  const summaryHead = (
    <>
      <div className="zpf-sum__head">
        <h2>Zinwe {plan}</h2>
        {tag ? <span className="zpf-pill is-accent">{tag}</span> : null}
      </div>
      <span className="zpf-k">{meta}</span>
    </>
  );

  if (screen === "manual") {
    return (
      <section className="zpf-page" aria-labelledby="pay-title">
        <div>
          <button type="button" className="zpf-back" onClick={() => setScreen("pay")}>
            Back to ways to pay
          </button>
          <h1 className="zau-h1 zpf-title" id="pay-title" ref={heading} tabIndex={-1}>
            Pay manually
          </h1>
          <p className="zau-lede">
            Pay {total}, upload the receipt, and {plan} switches on within {MANUAL_HOURS} hours.
          </p>
        </div>
        {unavailable ? (
          <div className="dash-banner dash-banner--warn" role="status">
            <DashIcon name="alert" />
            <span>{unavailable} Pay manually instead: it takes a few minutes more.</span>
          </div>
        ) : null}
        <div className="zpf-paygrid zpf-paygrid--manual">
          <div className="zpf-card zpf-manual">
            {manual.length > 1 ? (
              <div className="zpf-tabs" role="tablist" aria-label="Ways to pay manually">
                {manual.map((w) => (
                  <button
                    key={w.key}
                    type="button"
                    role="tab"
                    aria-selected={w.key === way}
                    className={cx("zpf-tab", w.key === way && "is-on")}
                    onClick={() => setWay(w.key)}
                  >
                    {w.key === "intl" ? "International" : w.label}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="zpf-details" role={manual.length > 1 ? "tabpanel" : undefined}>
              <PayWayDetails
                instructions={cycleInstructions}
                total={total}
                way={way}
                reference={reference}
                loadQr={() => getUpiQr(upgradePlan, cycle)}
              />
            </div>
            <div className="zpf-receipt">
              <h2>Upload the receipt</h2>
              <p className="zpf-k">Once you've paid, add the screenshot or PDF your app shows. Keep this page open while you pay.</p>
              <ReceiptForm
                bare
                method={methodForWay(way, instructions)}
                upgradePlan={upgradePlan}
                billingCycle={offer ? undefined : cycle}
                onSubmitted={async (payment) => {
                  await onSubmitted(payment);
                  setScreen("done");
                }}
              />
            </div>
          </div>
          <aside className="zpf-card zpf-sum" aria-label="What you're paying for">
            {summaryHead}
            <div className="zpf-total">
              <span>Total</span>
              <b className="z-num">{total}</b>
            </div>
          </aside>
        </div>
      </section>
    );
  }

  return (
    <section className="zpf-page" aria-labelledby="pay-title">
      <div>
        <Link className="zpf-back" to={back.to} state={back.state}>
          {back.label}
        </Link>
        <h1 className="zau-h1 zpf-title" id="pay-title" ref={heading} tabIndex={-1}>
          {renewal ? "Renew your plan" : upgradePlan ? "Pay for your upgrade" : "Pay for your plan"}
        </h1>
      </div>

      {previewError && !offer ? (
        <div className="dash-banner dash-banner--bad" role="alert">
          <DashIcon name="alert" />
          <span>{previewError}</span>
        </div>
      ) : (
        <div className="zpf-paygrid">
          <div className="zpf-paymain">
            {rejected ? <RejectedBanner payment={rejected} next="Pay again below." /> : null}
            {canSwitch ? (
              <div className="zpf-cycle">
                <CycleToggle value={cycle} onChange={setCycle} saving={saving} />
                <span className="zpf-k z-num">
                  {cycle === "yearly"
                    ? `${money(previews.yearly?.quote.total ?? "0")} for 12 months, paid once`
                    : `${money(previews.monthly?.quote.total ?? "0")} a month`}
                </span>
              </div>
            ) : null}

            <div className="zpf-ways" role="radiogroup" aria-label="How to pay">
              <label className={cx("zpf-way", choice === "online" && "is-on", !online && "is-off")}>
                <input
                  className="z-sr"
                  type="radio"
                  name="pay-way"
                  checked={choice === "online"}
                  disabled={!online || busy}
                  onChange={() => setChoice("online")}
                />
                <span className="zpf-way__radio" aria-hidden="true" />
                <span>
                  <b>
                    Pay with Razorpay {online ? <span className="zpf-pill is-good">On at once</span> : null}
                  </b>
                  <span className="zpf-k">
                    {online
                      ? usd
                        ? "International cards. Your plan switches on as soon as it's paid."
                        : "UPI, cards, netbanking or wallets. Your plan switches on as soon as it's paid."
                      : "Online payment isn't available right now. Please pay manually."}
                  </span>
                </span>
              </label>
              {pay.error ? (
                <div className="dash-banner dash-banner--bad" role="alert">
                  <DashIcon name="alert" />
                  <span>{pay.error}</span>
                </div>
              ) : null}
              {offer ? null : (
                <label className={cx("zpf-way", choice === "manual" && "is-on")}>
                  <input
                    className="z-sr"
                    type="radio"
                    name="pay-way"
                    checked={choice === "manual"}
                    disabled={busy}
                    onChange={() => setChoice("manual")}
                  />
                  <span className="zpf-way__radio" aria-hidden="true" />
                  <span>
                    <b>
                      Pay manually <span className="zpf-pill">On within {MANUAL_HOURS} hours</span>
                    </b>
                    <span className="zpf-k">
                      {usd
                        ? "International bank transfer through Skydo, then upload the receipt."
                        : "UPI or bank transfer to our account, then upload the receipt."}
                    </span>
                  </span>
                </label>
              )}
            </div>
            <p className="zpf-k zpf-legal">
              By continuing, you agree to Zinwe's{" "}
              <button type="button" className="zau-link" onClick={() => setTermsOpen(true)}>
                Payment terms
              </button>
              . Online payments are processed by Razorpay; Zinwe never sees your card or bank details.
            </p>
          </div>

          <aside className="zpf-card zpf-sum" aria-label="What you're paying for">
            {summaryHead}
            {carried > 0 ? (
              <span className="zpf-pill is-good">
                Includes {carried} paid day{carried === 1 ? "" : "s"} carried over
              </span>
            ) : null}
            {quote?.billing_cycle === "yearly" && yearlySaved > 0 ? (
              <span className="zpf-pill is-accent">You save {money(Math.round(yearlySaved))} a year</span>
            ) : null}
            {quote ? <PriceLines quote={quote} offer={Boolean(offer)} /> : null}
            <div className={cx("zpf-total", !priced && "is-loading")}>
              <span>Total</span>
              <b className="z-num">{total}</b>
            </div>
            {choice === "online" ? (
              <button type="button" className="zau-btn pri full" onClick={() => void pay.pay()} disabled={!online || busy || !priced}>
                {busy ? <span className="zau-spin" aria-hidden="true" /> : null}
                {onlineCta}
              </button>
            ) : (
              <button type="button" className="zau-btn pri full" onClick={() => setScreen("manual")} disabled={busy}>
                Continue
              </button>
            )}
            <span className="zpf-k">
              No auto-charge. {quote?.taxes.length ? "You get a GST invoice for every payment." : "You get an invoice for every payment."}
            </span>
            <span className="zpf-k">Pay to {payee}</span>
          </aside>

          <div className="zpf-paymore">
            <AcceptedBrands currency={currency} />
            <TrustRow gst={Boolean(quote?.taxes.length)} />
            {!offer && shareQuote ? <QuoteShare ownerEmail={ownerEmail} variant="slip" /> : null}
          </div>
        </div>
      )}
      <LegalDialog open={termsOpen} docs={[PAYMENT_TERMS]} title="Payment terms" onClose={() => setTermsOpen(false)} />
    </section>
  );
}
