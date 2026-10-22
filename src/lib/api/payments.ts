/** Online payment (Razorpay Standard Checkout), z_payments. The manual ways to pay stay in billing.ts. */
import { authedRequest } from "./http";
import type { Payment } from "./types";

/** POST payments/razorpay/order/: what Razorpay's checkout needs. `key_id` is public; secrets stay on the server. */
export interface OnlineOrder {
  key_id: string;
  order_id: string;
  /** In paise. */
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill: { name: string; email: string; contact: string };
}

/**
 * POST payments/razorpay/verify/:
 * - "paid": the plan is updated and the invoice issued (`payment` is the approved payment);
 * - "confirming": Razorpay couldn't be asked just now. The money is safe, and the plan updates within the hour;
 * - "review": paid, but the plan changed meanwhile, so the team applies it by hand.
 */
export interface OnlineResult {
  status: "paid" | "confirming" | "review";
  payment?: Payment | null;
  detail?: string;
}

/** 503 with `fallback: true` = online payment is off or Razorpay is down: use UPI / bank transfer. */
export function createOnlineOrder(upgradePlan?: string): Promise<OnlineOrder> {
  return authedRequest<OnlineOrder>("/api/payments/razorpay/order/", {
    method: "POST",
    body: { accept_terms: true, ...(upgradePlan ? { upgrade_plan: upgradePlan } : {}) },
  });
}

export function verifyOnlinePayment(body: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<OnlineResult> {
  return authedRequest<OnlineResult>("/api/payments/razorpay/verify/", { method: "POST", body });
}
