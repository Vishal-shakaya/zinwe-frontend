import { useState, type ReactElement } from "react";
import type { Payment, PaymentInstructions } from "../../lib/api";
import { defaultWay, methodForWay, type PayWay } from "../payWays";
import { PaymentWays } from "./PaymentWays";
import { ReceiptForm } from "./ReceiptForm";

/**
 * The whole "pay" step in one card: 1. pay by UPI, bank transfer or internationally (tabs),
 * 2. upload the receipt. Used by onboarding, Billing (renewals) and Upgrade.
 */
export function PayPanel({
  instructions,
  total,
  onSubmitted,
  upgradePlan,
  hideNote = false,
}: {
  instructions: PaymentInstructions;
  /** The formatted amount due, e.g. "₹1,145.78". */
  total: string;
  onSubmitted: (payment: Payment) => void | Promise<void>;
  upgradePlan?: string;
  /** Leave out the payment-reference line (the page shows the reference elsewhere). */
  hideNote?: boolean;
}): ReactElement {
  const [way, setWay] = useState<PayWay>(() => defaultWay(instructions));
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
            <p className="pay-section__sub">Use any one of these. Every option goes to SKYTECHNO, the company behind Zinwe.</p>
          </div>
        </div>
        <PaymentWays instructions={instructions} total={total} way={way} onWay={setWay} showNote={!hideNote} />
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
