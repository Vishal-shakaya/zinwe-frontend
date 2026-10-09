import { useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { DashIcon } from "../../dashboard/components/DashIcon";
import { FormStatus } from "../components/FormAlert";
import { NETWORK_COPY } from "../failure";
import { PaymentDetails } from "../components/PaymentDetails";

/** Step `payment_review`: the payment is with the team; the dashboard is already open. */
export function UnderReview(): ReactElement {
  const { account, refresh } = useAuth();
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const subscription = account?.subscription;
  const payment = subscription?.latest_payment ?? null;

  const onCheck = async () => {
    setChecking(true);
    setStatus(null);
    const loaded = await refresh();
    setChecking(false);
    // Still here = still under review (the guard moves on once it's active).
    setStatus(loaded ? "Still being checked. We'll email you as soon as it's done." : NETWORK_COPY);
  };

  return (
    <section className="onb__card review" aria-labelledby="review-title">
      <span className="review__mark" aria-hidden="true">
        <DashIcon name="clock" />
      </span>
      <div className="onb__head onb__head--center">
        <h1 className="onb__title" id="review-title">
          Payment under review
        </h1>
        <p className="onb__lede">
          Thanks! We're matching your payment{subscription ? ` for ${subscription.plan.name}` : ""} with our bank
          statement. This usually takes less than one working day. We'll email{" "}
          <b>{account?.user.email ?? "you"}</b> when your plan is active.
        </p>
      </div>

      {payment ? <PaymentDetails payment={payment} /> : null}

      <p className="dash-note review__note">You can start setting up now: add your PCs and choose your rules.</p>

      <FormStatus message={status} />

      <div className="onb__actions onb__actions--center">
        <Link className="btn btn--primary" to="/app">
          Go to your dashboard <span className="arr">→</span>
        </Link>
        <button type="button" className="btn btn--ghost" onClick={() => void onCheck()} disabled={checking}>
          {checking ? "Checking…" : "Check status"}
        </button>
      </div>
    </section>
  );
}
