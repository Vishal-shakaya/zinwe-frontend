/**
 * Razorpay Standard Checkout in the browser: load checkout.js once (only when someone pays online, never on page
 * load), open it for an order, and turn its callbacks into one result.
 * https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/
 */
import type { OnlineOrder } from "../lib/api/payments";

const SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";
const LOAD_TIMEOUT_MS = 15_000;

interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open(): void;
  on(event: "payment.failed", handler: (response: { error?: { description?: string } }) => void): void;
}

type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

let loading: Promise<RazorpayConstructor> | null = null;

/** checkout.js, loaded once. Rejects when it can't be loaded (offline, blocked by an extension or firewall). */
export function loadCheckout(): Promise<RazorpayConstructor> {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (loading) return loading;
  loading = new Promise<RazorpayConstructor>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT;
    script.async = true;
    const timer = window.setTimeout(() => fail(), LOAD_TIMEOUT_MS);
    const fail = () => {
      window.clearTimeout(timer);
      script.remove();
      loading = null; // a later try may work
      reject(new Error("checkout.js didn't load"));
    };
    script.onload = () => {
      window.clearTimeout(timer);
      if (window.Razorpay) resolve(window.Razorpay);
      else fail();
    };
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return loading;
}

export type CheckoutOutcome =
  | { kind: "paid"; response: RazorpaySuccess }
  | { kind: "dismissed" }
  | { kind: "failed"; reason: string };

/**
 * Open the checkout for `order` and wait. "failed" is a declined attempt (the customer can try again in the same
 * window); it settles only when they close it, so a retry that succeeds still counts.
 */
export async function openCheckout(order: OnlineOrder, brandColour = "#fd6d02"): Promise<CheckoutOutcome> {
  const Razorpay = await loadCheckout();
  return new Promise<CheckoutOutcome>((resolve) => {
    let lastFailure = "";
    const instance = new Razorpay({
      key: order.key_id,
      order_id: order.order_id,
      amount: order.amount,
      currency: order.currency,
      name: order.name,
      description: order.description,
      prefill: order.prefill,
      theme: { color: brandColour },
      handler: (response: RazorpaySuccess) => resolve({ kind: "paid", response }),
      modal: {
        // Esc / ×: they may have tried and failed first.
        ondismiss: () => resolve(lastFailure ? { kind: "failed", reason: lastFailure } : { kind: "dismissed" }),
        confirm_close: true,
      },
    });
    instance.on("payment.failed", (response) => {
      lastFailure = response.error?.description || "The payment didn't go through.";
    });
    instance.open();
  });
}
