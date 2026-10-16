import { Suspense, useEffect, useState, type ReactElement } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { canUseApp } from "../../auth/steps";
import { DashIcon } from "../../dashboard/components/DashIcon";
import { AnnouncementBar } from "../../components/ui/AnnouncementBar";
import { Brand } from "../../components/ui/Brand";
import { PlanSteps } from "../components/PlanSteps";
import "../../styles/dashboard.css";
import "../../styles/portal.css";

/**
 * Company form, then the plan page (Choose plan → Payment confirmation → Activation), with a log-out button.
 * Once the company is saved the header also links to the dashboard, so choosing or paying never blocks it.
 */
export default function OnboardingLayout(): ReactElement {
  const { user, onboarding, signOut } = useAuth();
  const { pathname } = useLocation();
  const [leaving, setLeaving] = useState(false);
  // Choose plan → Payment confirmation → Activation, for new owners and upgrades alike. The company form
  // comes before buying a plan, so it has no bar. Payment confirmation happens in the checkout modal (its own
  // bar); a payment being checked is Activation.
  const showSteps = !pathname.endsWith("/company");
  const stepIndex = onboarding?.step === "payment_review" ? 2 : 0;

  // Block body on purpose: an effect must return nothing or a cleanup function. A concise
  // `() => window.scrollTo(0, 0)` returns scrollTo's result, and browser extensions that
  // patch scrollTo make that a non-function -> "destroy is not a function" on navigation.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="onb">
      <AnnouncementBar />
      <header className="onb__top">
        <Brand ariaLabel="Zinwe home" height={24} />
        <div className="onb__who">
          {onboarding && canUseApp(onboarding.step) ? (
            <Link className="btn btn--ghost dash-btn-sm onb__dash" to="/app">
              <DashIcon name="home" />
              Dashboard
            </Link>
          ) : null}
          <span className="onb__email">{user?.email}</span>
          <button
            type="button"
            className="btn btn--ghost dash-btn-sm"
            disabled={leaving}
            onClick={() => {
              setLeaving(true);
              void signOut();
            }}
          >
            {leaving ? "Logging out…" : "Log out"}
          </button>
        </div>
      </header>

      <main className="onb__main" id="onb-main">
        {showSteps ? <PlanSteps current={stepIndex} /> : null}
        <Suspense
          fallback={
            <div className="dash-boot" role="status" aria-live="polite">
              Loading…
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
