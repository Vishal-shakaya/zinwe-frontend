import { Suspense, useEffect, useState, type ReactElement } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { canUseApp } from "../../auth/steps";
import { AnnouncementBar } from "../../components/ui/AnnouncementBar";
import { Brand } from "../../components/ui/Brand";
import { useAuthFonts } from "../v13/authFonts";
import "../../styles/dashboard.css";
import "../../styles/portal.css";
import "../../styles/dash13.css";
import "../../styles/dash13/auth.css";

const STEPS = ["Account", "Company", "Plan", "Payment"] as const;

/**
 * Onboarding (AuthFlow board, v1.3): a white header with the logo, the Account → Company → Plan → Payment stepper
 * and, once the dashboard is open, "Skip to dashboard" (new owners) or "Back to dashboard" (upgrades). A new owner
 * who can't use the dashboard yet (company step) sees their account with Log out instead: their only way out.
 */
export default function OnboardingLayout(): ReactElement {
  useAuthFonts();
  const { user, onboarding, signOut } = useAuth();
  const { pathname } = useLocation();
  const [leaving, setLeaving] = useState(false);
  const step = onboarding?.step;
  const inApp = Boolean(step && canUseApp(step));
  // Account is done by the time anyone is here; the company form is step 1, the plan page step 2, a payment
  // waiting or being checked step 3 (4 = everything done).
  const stepIdx = pathname.endsWith("/company")
    ? 1
    : step === "payment_review"
      ? 4
      : step === "payment"
        ? 3
        : 2;

  // Block body on purpose: an effect must return nothing or a cleanup function. A concise
  // `() => window.scrollTo(0, 0)` returns scrollTo's result, and browser extensions that
  // patch scrollTo make that a non-function -> "destroy is not a function" on navigation.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="za zau zau-onb" data-clarity-mask="true">
      <AnnouncementBar />
      <header className="zau-onb__top">
        <div className="zau-onb__bar">
          <Brand to={inApp ? "/app" : "/"} ariaLabel={inApp ? "Zinwe, back to your dashboard" : "Zinwe home"} height={26} className="zau-brand zau-brand--sm" />
          <ol className="zau-stepper" aria-label="Setup steps">
            {STEPS.map((label, i) => {
              const done = i < stepIdx;
              const cur = i === stepIdx;
              return (
                <li key={label} className={done ? "done" : cur ? "cur" : undefined} aria-current={cur ? "step" : undefined}>
                  <span className="zau-stepper__dot" aria-hidden="true">
                    {done ? "✓" : i + 1}
                  </span>
                  {label}
                  {done ? <span className="z-sr"> (done)</span> : null}
                </li>
              );
            })}
          </ol>
          {inApp ? (
            <Link className="zau-onb__skip" to="/app">
              {step === "complete" ? "Back to dashboard" : "Skip to dashboard"}
            </Link>
          ) : (
            <div className="zau-onb__who">
              {user ? (
                <span className="zau-onb__acct" title={user.email}>
                  <span className="zau-onb__avatar" aria-hidden="true">
                    {(user.full_name || user.email).trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="zau-onb__email">{user.email}</span>
                </span>
              ) : null}
              <button
                type="button"
                className="zau-btn sm"
                disabled={leaving}
                onClick={() => {
                  setLeaving(true);
                  void signOut();
                }}
              >
                {leaving ? "Logging out…" : "Log out"}
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="zau-onb__main" id="onb-main">
        <Suspense
          fallback={
            <div className="zau-boot" role="status" aria-live="polite">
              <span className="zau-spin" aria-hidden="true" />
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
