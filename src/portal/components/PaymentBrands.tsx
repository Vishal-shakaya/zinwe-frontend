import type { ReactElement } from "react";
import { DashIcon } from "../../dashboard/components/DashIcon";

/** Brand marks (public/brand/pay): real logos, so customers recognise what they can pay with. */
const LOGOS = {
  upi: { src: "/brand/pay/upi.svg", alt: "UPI" },
  gpay: { src: "/brand/pay/gpay.svg", alt: "Google Pay" },
  phonepe: { src: "/brand/pay/phonepe.svg", alt: "PhonePe" },
  paytm: { src: "/brand/pay/paytm.svg", alt: "Paytm" },
  rupay: { src: "/brand/pay/rupay.svg", alt: "RuPay" },
  visa: { src: "/brand/pay/visa.svg", alt: "Visa" },
  mastercard: { src: "/brand/pay/mastercard.svg", alt: "Mastercard" },
  amex: { src: "/brand/pay/amex.svg", alt: "American Express" },
} as const;

type Logo = keyof typeof LOGOS;

const INDIA: readonly Logo[] = ["upi", "gpay", "phonepe", "paytm", "rupay", "visa", "mastercard", "amex"];
const INTERNATIONAL: readonly Logo[] = ["visa", "mastercard", "amex"];

/**
 * "We accept": the payment brands Razorpay takes for this currency, plus netbanking and wallets in India.
 * `className` places it: the checkout's dark summary (compact) on wide screens, the pay screen on phones.
 */
export function AcceptedBrands({ currency, className }: { currency: string; className?: string }): ReactElement {
  const india = currency !== "USD";
  return (
    <div className={className ? `co-accept ${className}` : "co-accept"}>
      <p className="co-accept__label">We accept</p>
      <ul className="co-accept__logos">
        {(india ? INDIA : INTERNATIONAL).map((key) => (
          <li key={key} className={`co-accept__logo co-accept__logo--${key}`}>
            <img src={LOGOS[key].src} alt={LOGOS[key].alt} loading="lazy" decoding="async" />
          </li>
        ))}
        {india ? (
          <>
            <li className="co-accept__chip">
              <DashIcon name="building" />
              Netbanking
            </li>
            <li className="co-accept__chip">
              <DashIcon name="wallet" />
              Wallets
            </li>
          </>
        ) : (
          <li className="co-accept__chip">
            <DashIcon name="globe" />
            Most international cards
          </li>
        )}
      </ul>
    </div>
  );
}

/** Why it's safe: Razorpay's secure checkout, encryption, PCI DSS, and an invoice for every payment. */
export function TrustRow({ gst }: { gst: boolean }): ReactElement {
  return (
    <ul className="co-trust" aria-label="Secure payment">
      <li className="co-trust__razorpay">
        <span>Secured by</span>
        <img src="/brand/pay/razorpay.svg" alt="Razorpay" loading="lazy" decoding="async" />
      </li>
      <li>
        <DashIcon name="lock" />
        256-bit SSL encryption
      </li>
      <li>
        <DashIcon name="shield" />
        PCI DSS compliant
      </li>
      <li>
        <DashIcon name="file" />
        {gst ? "GST invoice by email" : "Invoice by email"}
      </li>
    </ul>
  );
}
