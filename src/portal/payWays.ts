/** Ways to pay on the payment page and the public quote (see components/PaymentWays.tsx). */
import type { PaymentInstructions, PaymentMethod } from "../lib/api";

/** The three ways to pay, as tabs. */
export type PayWay = "upi" | "bank" | "intl";

/** India opens on UPI; customers billed in USD open on International. */
export function defaultWay(instructions: PaymentInstructions): PayWay {
  return instructions.region === "INTL" ? "intl" : "upi";
}

/** What the receipt is recorded as, for the way the owner had open. */
export function methodForWay(way: PayWay, instructions: PaymentInstructions): PaymentMethod {
  if (way === "upi") return "upi";
  if (way === "bank") return "bank_transfer";
  const skydo = Boolean(safeHttpsUrl(instructions.payment_link) || instructions.skydo);
  return !skydo && safeHttpsUrl(instructions.paypal_url) ? "paypal" : "skydo";
}

/** Only https links are opened; anything else (typo, javascript:) hides the option. */
export function safeHttpsUrl(value: string | undefined): string | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  try {
    const url = new URL(v);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}
