import { useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { FormStatus } from "../components/FormAlert";
import { NETWORK_COPY } from "../failure";
import { PaymentDetails } from "../components/PaymentDetails";

/** Step `payment_review` (AuthFlow board "review"): the payment is with the team; the dashboard is already open. */
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
    <section className="zau-card zau-review" aria-labelledby="review-title">
      <span className="zau-review__mark" aria-hidden="true">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" />
        </svg>
      </span>
      <h1 className="zau-h1" id="review-title">
        Payment being checked
      </h1>
      <p className="zau-lede">
        We're matching your payment{subscription ? ` for ${subscription.plan.name}` : ""} with our bank statement. We
        check it within one working day and email <b className="zau-email">{account?.user.email ?? "you"}</b>. You can
        start setting up now; nothing will ask you to pay again meanwhile.
      </p>

      {payment ? (
        <div className="zau-review__pay">
          <PaymentDetails payment={payment} />
        </div>
      ) : null}

      <div className="zau-review__next">
        <b>Next: add your first person</b>
        <span>They get an invite with their Member ID and the download link. Takes about 5 minutes per PC.</span>
      </div>

      <FormStatus message={status} />

      <div className="zau-review__acts">
        <Link className="zau-btn pri" to="/app/team#add=1">
          Add a person
        </Link>
        <Link className="zau-btn" to="/app">
          Go to dashboard
        </Link>
        <button type="button" className="zau-btn" onClick={() => void onCheck()} disabled={checking}>
          {checking ? <span className="zau-spin" aria-hidden="true" /> : null}
          {checking ? "Checking…" : "Check status"}
        </button>
      </div>
    </section>
  );
}
