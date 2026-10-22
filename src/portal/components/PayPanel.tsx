import { useState, type ReactElement } from "react";
import { getUpiQr, type Payment, type PaymentInstructions } from "../../lib/api";
import { defaultWay, methodForWay, payWayOptions, type PayWay } from "../payWays";
import { PaymentWays } from "./PaymentWays";
import { ReceiptForm } from "./ReceiptForm";

/**
 * The whole "pay" step in one card: 1. pay by UPI, bank transfer or internationally (tabs),
 * 2. upload the receipt. Used by Billing (paying again, renewals).
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
  const [picked, setWay] = useState<PayWay>(() => defaultWay(instructions));
  const ways = payWayOptions(instructions, currency);
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
        <PaymentWays
          instructions={instructions}
          total={total}
          way={way}
          onWay={setWay}
          showNote={!hideNote && !reference}
          reference={reference}
          currency={currency}
          loadQr={() => getUpiQr(upgradePlan)}
        />
      </div>
      <hr className="pay-panel__rule" />
      <ReceiptForm
        step="2"
        method={methodForWay(way, instructions)}
        upgradePlan={upgradePlan}
        onSubmitted={onSubmitted}
      />
    </section>
  );
}
