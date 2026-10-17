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

/** Billed in US dollars (outside India): UPI and the Indian bank account can't take dollars. */
export function paysInUsd(instructions: PaymentInstructions, currency?: string): boolean {
  if (currency) return currency === "USD";
  return instructions.currency === "USD" || instructions.region === "INTL";
}

/** A Skydo link, the Skydo US account or PayPal is set up. */
export function intlReady(instructions: PaymentInstructions): boolean {
  return Boolean(safeHttpsUrl(instructions.payment_link) || instructions.skydo || safeHttpsUrl(instructions.paypal_url));
}

export interface WayOption {
  key: PayWay;
  label: string;
  /** One line under the label (checkout list). */
  hint: string;
  /** Shorter, for the tabs. */
  short: string;
  icon: "phone" | "building" | "globe";
  /** e.g. "India only": a way that doesn't suit this customer, kept as a last resort. */
  tag?: string;
}

/**
 * The ways to pay, in the order this customer should see them (2026-10-17): India = UPI, bank, then
 * International last ("only if you're paying from outside India"); US dollars = Skydo first, and the
 * India-only ways left out (or tagged "India only" when nothing international is set up yet).
 */
export function payWayOptions(instructions: PaymentInstructions, currency?: string): WayOption[] {
  if (paysInUsd(instructions, currency)) {
    const intl: WayOption = {
      key: "intl",
      label: "Card or US bank",
      hint: "Pay online through Skydo, from anywhere",
      short: "Through Skydo",
      icon: "globe",
    };
    if (intlReady(instructions)) return [intl];
    return [
      intl,
      { key: "upi", label: "UPI", hint: "Only from an Indian bank account, in rupees", short: "India only", icon: "phone", tag: "India only" },
      { key: "bank", label: "Bank transfer", hint: "Only from an Indian bank account, in rupees", short: "India only", icon: "building", tag: "India only" },
    ];
  }
  return [
    { key: "upi", label: "UPI", hint: "Google Pay, PhonePe, Paytm or any UPI app", short: "Any UPI app", icon: "phone" },
    { key: "bank", label: "Bank transfer", hint: "NEFT, IMPS or RTGS to our current account", short: "NEFT, IMPS or RTGS", icon: "building" },
    {
      key: "intl",
      label: "International",
      hint: "Only if you're paying from outside India: card or US bank, through Skydo",
      short: "From outside India",
      icon: "globe",
    },
  ];
}

/** A `upi://pay?...` link from the server (anything else is ignored). */
export function safeUpiUri(value: string | undefined): string | null {
  const v = (value ?? "").trim();
  return /^upi:\/\/pay\?/i.test(v) ? v : null;
}

/** A phone or tablet, where a upi:// link opens the UPI app (a desktop has nothing to open it). */
export function isTouchDevice(): boolean {
  try {
    return window.matchMedia("(pointer: coarse)").matches;
  } catch {
    return false;
  }
}
