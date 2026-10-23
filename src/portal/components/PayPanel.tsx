import { useState, type ReactElement } from "react";
import { getUpiQr, type OnlineResult, type Payment, type PaymentInstructions } from "../../lib/api";
import { defaultWay, manualWayOptions, methodForWay, payWayOptions, type PayWay } from "../payWays";
import { DashIcon } from "../../dashboard/components/DashIcon";
import { OnlinePay } from "./OnlinePay";
import { PaymentWays } from "./PaymentWays";
import { ReceiptForm } from "./ReceiptForm";

/**
 * The whole "pay" step in one card: 1. pay online (Razorpay), or by the one manual way beside it (bank transfer;
 * Skydo abroad), as tabs; 2. for a manual way, upload the receipt. When Razorpay is off or fails, every manual way
 * (UPI too) is a tab. Used by Billing (paying again, renewals).
 */
export function PayPanel({
  instructions,
  total,
  onSubmitted,
  upgradePlan,
  hideNote = false,
  reference,
  currency,
}: {
  instructions: PaymentInstructions;
  /** The formatted amount due, e.g. "₹1,145.78". */
  total: string;
  onSubmitted: (payment: Payment) => void | Promise<void>;
  upgradePlan?: string;
  /** Leave out the payment-reference line (the page shows the reference elsewhere). */
  hideNote?: boolean;
  /** The UPI note / bank remarks to use (the company name). */
  reference?: string;
  /** The currency of what's due (decides which ways show, and in what order). */
  currency?: string;
}): ReactElement {
  const [picked, setWay] = useState<PayWay>(() => defaultWay(instructions, true));
  // Paid online but not applied yet ("confirming" / "review"): say so instead of offering to pay again.
  const [pending, setPending] = useState<OnlineResult | null>(null);
  // Razorpay failed here: the manual ways only.
  const [fallback, setFallback] = useState(false);
  // Why: online payment unavailable right now (null = the customer chose another way after a failed payment).
  const [unavailable, setUnavailable] = useState<string | null>(null);
  const toManual = (reason: string | null) => {
    setFallback(true);
    setUnavailable(reason);
    setWay(manualWayOptions(instructions, currency)[0].key);
  };
  const ways = payWayOptions(instructions, currency, !fallback);
  const usd = (currency ?? instructions.currency) === "USD";
  const way = ways.some((w) => w.key === picked) ? picked : ways[0].key;
  const payee = instructions.payee_name || "SKYTECHNO";
  return (
    <section className="dash-card pay-panel" aria-labelledby="pay-panel-title">
      <div className="pay-section">
        <div className="pay-section__head">
          <span className="pay-section__num" aria-hidden="true">
            1
          </span>
          <div>
            <h2 className="pay-section__title" id="pay-panel-title">
              Pay {total}
            </h2>
            <p className="pay-section__sub">
              {ways.length > 1
                ? `Use any one of these. Every option goes to ${payee}, the company behind Zinwe.`
                : `It goes to ${payee}, the company behind Zinwe.`}
            </p>
          </div>
        </div>
        {unavailable ? (
          <div className="dash-banner dash-banner--warn" role="status">
            <DashIcon name="alert" />
            <span>
              {unavailable} Pay one of these ways instead: your plan switches on once we confirm the payment, usually
              within one working day.
            </span>
          </div>
        ) : null}
        <PaymentWays
          instructions={instructions}
          total={total}
          way={way}
          onWay={setWay}
          showNote={!hideNote && !reference}
          reference={reference}
          currency={currency}
          loadQr={() => getUpiQr(upgradePlan)}
          online={
            fallback ? undefined : pending ? (
              <p className="online-pay__pending" role="status">
                {pending.detail}
              </p>
            ) : (
              <OnlinePay
                total={total}
                upgradePlan={upgradePlan}
                onPaid={async (payment) => {
                  if (payment) await onSubmitted(payment);
                }}
                onPending={(result) => setPending(result)}
                currency={usd ? "USD" : "INR"}
                otherWays={usd ? "a US bank transfer through Skydo" : "UPI or bank transfer"}
                onFallback={() => toManual(null)}
                onUnavailable={(reason) => toManual(reason)}
              />
            )
          }
        />
      </div>
      {way === "online" ? null : (
        <>
          <hr className="pay-panel__rule" />
          <ReceiptForm
            step="2"
            method={methodForWay(way, instructions)}
            upgradePlan={upgradePlan}
            onSubmitted={onSubmitted}
          />
        </>
      )}
    </section>
  );
}
