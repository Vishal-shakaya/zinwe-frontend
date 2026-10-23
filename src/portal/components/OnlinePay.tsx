import { useState, type ReactElement } from "react";
import { TermsCheckbox } from "../../components/legal/TermsCheckbox";
import { PAYMENT_TERMS } from "../../content/legal";
import { DashIcon } from "../../dashboard/components/DashIcon";
import { ApiError, errorMessage, type Payment } from "../../lib/api";
import { createOnlineOrder, verifyOnlinePayment, type OnlineResult } from "../../lib/api/payments";
import { trackEvent } from "../../lib/analytics";
import { openCheckout } from "../razorpay";
import { FormAlert } from "./FormAlert";

type Stage = "idle" | "starting" | "open" | "confirming";

/**
 * "Pay online" (Razorpay): UPI apps, cards, netbanking or wallets, confirmed at once. If anything goes wrong on
 * our side or Razorpay's (switched off, down, script blocked), `onFallback` takes the owner to UPI / bank transfer
 * + receipt, which never depend on Razorpay. A declined card just shows why and lets them try again.
 */
export function OnlinePay({
  total,
  upgradePlan,
  offer,
  otherWays = "UPI or bank transfer",
  currency = "INR",
  onPaid,
  onPending,
  onFallback,
  onUnavailable,
  onFailed,
  onWindow,
}: {
  /** e.g. "₹1,146". */
  total: string;
  upgradePlan?: string;
  /** An offer from the Zinwe team (its id): priced and checked again on the server. */
  offer?: number;
  /** The manual ways `onFallback` leads to, e.g. "UPI or bank transfer" or "a US bank transfer through Skydo". */
  otherWays?: string;
  /** "USD": cards from abroad only (no UPI, netbanking or wallets). */
  currency?: string;
  /** The plan is updated: `payment` is the approved payment (status "verified"). */
  onPaid: (payment: Payment | null) => void | Promise<void>;
  /** Money taken, plan not updated yet ("confirming" / "review"): show `detail`, nothing more to do. */
  onPending: (result: OnlineResult) => void | Promise<void>;
  /** Pay another way (UPI / bank transfer + receipt). Omitted (an offer, online only): no other way. */
  onFallback?: () => void;
  /**
   * Online payment can't be used right now (off, Razorpay down or refusing us, the window blocked), with why. Given,
   * the parent takes the customer to the manual ways itself (instead of this panel's "pay another way" link).
   */
  onUnavailable?: (reason: string) => void;
  /** A payment didn't go through (declined, or the order was refused): the parent can point to the other ways. */
  onFailed?: () => void;
  /**
   * Razorpay's window opens (true) / closes (false). A native modal <dialog> is drawn above everything, so a
   * checkout dialog must step aside while Razorpay's window is open, or the customer can't reach it.
   */
  onWindow?: (open: boolean) => void;
}): ReactElement {
  const [accepted, setAccepted] = useState(false);
  const [termsError, setTermsError] = useState<string | undefined>();
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  const pay = async () => {
    if (!accepted) {
      setTermsError("Please accept the payment terms to continue.");
      return;
    }
    setError(null);
    setStage("starting");
    let order;
    try {
      order = await createOnlineOrder(upgradePlan, offer);
    } catch (err) {
      setStage("idle");
      // 503 (off / Razorpay down) or a network failure: offer the manual ways.
      if (!(err instanceof ApiError) || err.status === 503 || err.status === 0) {
        if (onUnavailable) {
          onUnavailable("Online payment isn't available right now.");
          return;
        }
        setOffline(true);
        setError(
          onFallback
            ? `Online payment isn't available right now. You can pay by ${otherWays} instead.`
            : "Online payment isn't available right now. Please try again in a few minutes.",
        );
      } else {
        setError(errorMessage(err));
        onFailed?.();
      }
      return;
    }
    trackEvent("add_payment_info", { payment_type: "razorpay" });
    setStage("open");
    let outcome;
    try {
      onWindow?.(true);
      outcome = await openCheckout(order);
    } catch {
      setStage("idle");
      if (onUnavailable) {
        onUnavailable("The secure payment window couldn't load (a blocker or a slow connection can stop it).");
        return;
      }
      setOffline(true);
      setError("The secure payment window couldn't load (a blocker or a slow connection can stop it).");
      return;
    } finally {
      onWindow?.(false);
    }
    if (outcome.kind === "dismissed") {
      setStage("idle");
      return;
    }
    if (outcome.kind === "failed") {
      setStage("idle");
      setError(`${outcome.reason} Nothing was charged. Try again, or pay another way.`);
      onFailed?.();
      return;
    }
    setStage("confirming");
    try {
      const result = await verifyOnlinePayment(outcome.response);
      if (result.status === "paid") {
        trackEvent("purchase", { payment_type: "razorpay" });
        await onPaid(result.payment ?? null);
      } else {
        await onPending(result);
      }
    } catch (err) {
      // We couldn't hear back: the money may be taken. Never ask them to pay again; the server finishes it.
      await onPending({
        status: "confirming",
        detail: `We're confirming your payment (${errorMessage(err)}). If Razorpay took it, your plan updates within the hour and we'll email you. Please don't pay again.`,
      });
    }
  };

  const busy = stage !== "idle";
  return (
    <div className="online-pay">
      <ul className="online-pay__ways" aria-label="You can pay with">
        {(currency === "USD"
          ? ["Visa", "Mastercard", "Most international cards"]
          : ["UPI apps", "Cards", "Netbanking", "Wallets"]
        ).map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
      <p className="online-pay__lede">
        Pay {total} in Razorpay's secure window. Your plan updates as soon as it's paid, and the invoice comes by
        email. No receipt to upload.
      </p>
      <TermsCheckbox
        id="online-terms"
        checked={accepted}
        onChange={(value) => {
          setAccepted(value);
          if (value) setTermsError(undefined);
        }}
        docs={[PAYMENT_TERMS]}
        dialogTitle="Payment terms"
        lead="I agree to Zinwe's"
        error={termsError}
        disabled={busy}
      />
      <FormAlert message={error} />
      <button type="button" className="btn btn--primary btn--block online-pay__go" onClick={() => void pay()} disabled={busy}>
        <DashIcon name="lock" />
        {stage === "starting"
          ? "Opening the secure window…"
          : stage === "open"
            ? "Finish paying in the Razorpay window…"
            : stage === "confirming"
              ? "Confirming your payment…"
              : `Pay ${total} securely`}
      </button>
      {onFallback && (offline || error) ? (
        <button type="button" className="dash-link online-pay__alt" onClick={onFallback}>
          Pay by {otherWays} instead
        </button>
      ) : null}
      <p className="online-pay__note">Payments are processed by Razorpay. Zinwe never sees your card or bank details.</p>
    </div>
  );
}
