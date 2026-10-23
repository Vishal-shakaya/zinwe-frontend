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
 * Company form, then the plan page (Choose plan → Payment confirmation → Activation). The header has the logo and
 * "Back to dashboard" once the company is saved (so choosing or paying never blocks it — the only dashboard link
 * on these pages). A new owner who can't use the dashboard yet also sees their account with Log out (their only
 * way out); an owner upgrading from the dashboard doesn't (2026-10-23: the account and Log out live there).
 */
export default function OnboardingLayout(): ReactElement {
  const { user, onboarding, signOut } = useAuth();
  const { pathname } = useLocation();
  const [leaving, setLeaving] = useState(false);
  const inApp = Boolean(onboarding && canUseApp(onboarding.step));
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
    <div className="onb" data-clarity-mask="true">
      <AnnouncementBar />
      {/* One way back (left, beside the logo); before the dashboard opens, the account on the right with Log out. */}
      <header className="onb__top">
        <div className="onb__lead">
          <Brand ariaLabel="Zinwe home" height={24} />
          {inApp ? (
            <Link className="onb__back onb__back--top" to="/app">
              <DashIcon name="back" />
              <span>
                <span className="onb__back-long">Back to </span>dashboard
              </span>
            </Link>
          ) : null}
        </div>
        {inApp ? null : (
          <div className="onb__who">
            {user ? (
              <span className="onb__acct" title={user.email}>
                <span className="onb__avatar" aria-hidden="true">
                  {(user.full_name || user.email).trim().charAt(0).toUpperCase()}
                </span>
                <span className="onb__email">{user.email}</span>
              </span>
            ) : null}
            <button
              type="button"
              className="btn btn--ghost dash-btn-sm onb__out"
              disabled={leaving}
              aria-label={leaving ? "Logging out" : "Log out"}
              onClick={() => {
                setLeaving(true);
                void signOut();
              }}
            >
              <DashIcon name="logout" />
              <span className="onb__out-label">{leaving ? "Logging out…" : "Log out"}</span>
            </button>
          </div>
        )}
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
