import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { canUseApp } from "../../auth/steps";
import { Smoke } from "../../components/ui/Smoke";
import { ErrorState } from "../../dashboard/components/States";
import { usePageMeta } from "../../hooks/usePageMeta";
import { errorMessage, type Plan } from "../../lib/api";
import { cx } from "../../lib/cx";
import { PlanCards, PlanCardsLoading } from "../components/PlanCards";
import { planCtaLabel } from "../plan";
import { usePlans } from "../usePlans";
import "../../styles/dashboard.css";
import "../../styles/portal.css";

/** Public /plans (marketing layout). Signed-out CTAs go to /signup?plan=<code>. */
export default function PlansPage(): ReactElement {
  usePageMeta({
    title: "Plans and pricing — Zinwe",
    description: "Start free, or try the Businesses plan free for your first 3 months. Simple pricing in rupees.",
  });
  const { token, onboarding } = useAuth();
  const plans = usePlans();

  const ctaFor = (plan: Plan, highlighted: boolean): ReactElement => {
    const className = cx("btn btn--block", highlighted ? "btn--primary" : "btn--ghost");
    if (token) {
      const inApp = onboarding ? canUseApp(onboarding.step) : false;
      return (
        <Link className={className} to={inApp ? "/app/billing" : "/onboarding/plan"}>
          {inApp ? "See your plan" : planCtaLabel(plan)}
        </Link>
      );
    }
    return (
      <Link className={className} to={`/signup?plan=${encodeURIComponent(plan.code)}`}>
        {planCtaLabel(plan)}
        <span className="arr">→</span>
      </Link>
    );
  };

  return (
    <>
      <section className="page-hero zin-host plans-hero">
        <Smoke />
        <div className="wrap">
          <p className="eyebrow">Plans</p>
          <h1 className="h-display">Simple plans. Start free.</h1>
          <p className="lede">Every plan has plain-English alerts and a setup you can finish in an afternoon.</p>
        </div>
      </section>

      <section className="sec--tight plans-sec">
        <div className="wrap">
          {plans.data ? (
            <PlanCards plans={plans.data} renderAction={ctaFor} />
          ) : plans.error ? (
            <div className="dash-card">
              <ErrorState
                title="We couldn't load the plans"
                message={errorMessage(plans.error)}
                onRetry={plans.reload}
                retrying={plans.pending}
              />
            </div>
          ) : (
            <PlanCardsLoading />
          )}
          <p className="plans-note">
            Prices in Indian rupees. Pay by UPI or bank transfer, or PayPal from outside India. Questions?{" "}
            <Link to="/contact">Talk to us</Link>
          </p>
        </div>
      </section>
    </>
  );
}
