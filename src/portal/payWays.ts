/** Ways to pay on the payment page and the public quote (see components/PaymentWays.tsx). */
import type { PaymentInstructions, PaymentMethod } from "../lib/api";

/**
 * The ways to pay (2026-10-23): online (Razorpay) is THE way, for rupees (UPI apps, cards, netbanking, wallets) and
 * US dollars (cards from abroad); one manual way stays beside it for customers whose accounts team pays by transfer
 * (India: bank transfer; abroad: Skydo, ACH or wire). Every manual way comes back when Razorpay is off or fails.
 */
export type PayWay = "online" | "upi" | "bank" | "intl";

/**
 * Online payment (Razorpay) is offered: a signed-in page that can create orders, and the server sent a key for this
 * customer's currency (it leaves it out when Razorpay is off or doesn't take the currency).
 */
export function onlineReady(instructions: PaymentInstructions, allowOnline = false): boolean {
  return allowOnline && Boolean(instructions.online?.key_id);
}

/** Online when it's offered; else UPI in India, Skydo for customers billed in US dollars. */
export function defaultWay(instructions: PaymentInstructions, allowOnline = false): PayWay {
  if (onlineReady(instructions, allowOnline)) return "online";
  return instructions.region === "INTL" ? "intl" : "upi";
}

/** What the receipt is recorded as, for the way the owner had open. */
export function methodForWay(way: PayWay, instructions: PaymentInstructions): PaymentMethod {
  if (way === "online") return "razorpay";
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
  icon: "phone" | "building" | "globe" | "card";
  /** e.g. "India only": a way that doesn't suit this customer, kept as a last resort. */
  tag?: string;
}

/**
 * The ways to pay, in the order this customer should see them:
 * - online offered: Pay online first, then the one manual way that suits them (India: bank transfer; US dollars:
 *   Skydo). Manual UPI is left out: the online way already takes every UPI app, at once and without a receipt;
 * - online not offered (off, or a page that can't create orders): every manual way (`manualWayOptions`).
 */
export function payWayOptions(instructions: PaymentInstructions, currency?: string, allowOnline = false): WayOption[] {
  const manual = manualWayOptions(instructions, currency);
  if (!onlineReady(instructions, allowOnline)) return manual;
  const usd = paysInUsd(instructions, currency);
  const online: WayOption = usd
    ? {
        key: "online",
        label: "Pay by card",
        hint: "Visa, Mastercard and most international cards. Your plan updates at once",
        short: "Instant",
        icon: "card",
      }
    : {
        key: "online",
        label: "Pay online",
        hint: "UPI apps, cards, netbanking or wallets. Your plan updates at once",
        short: "Instant",
        icon: "card",
      };
  const other = usd
    ? manual.filter((w) => w.key === "intl" && intlReady(instructions))
    : manual.filter((w) => w.key === "bank");
  return [online, ...other.map((w) => ({ ...w, ...OTHER_WAY[w.key] }))];
}

/** The manual way beside online payment: named for who it's for, and that it takes a receipt. */
const OTHER_WAY: Partial<Record<PayWay, Pick<WayOption, "label" | "hint" | "short">>> = {
  bank: { label: "Bank transfer", hint: "NEFT, IMPS or RTGS, then upload the receipt", short: "NEFT, IMPS or RTGS" },
  intl: { label: "International transfer", hint: "Bank transfer through Skydo, then upload the receipt", short: "Through Skydo" },
};

/** The link to the manual way, under the online button, e.g. "Pay by bank transfer instead". */
export function otherWayLink(way: PayWay): string {
  return way === "intl" ? "Pay by international bank transfer through Skydo" : "Pay by bank transfer instead";
}

/** UPI, bank transfer and Skydo: paid outside Zinwe, then the receipt is uploaded. Never depend on Razorpay. */
export function manualWayOptions(instructions: PaymentInstructions, currency?: string): WayOption[] {
  if (paysInUsd(instructions, currency)) {
    const intl: WayOption = {
      key: "intl",
      label: "International card or transfer",
      hint: "Through Skydo, from anywhere",
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
      hint: "Only if you're paying from outside India: card or bank transfer, through Skydo",
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
