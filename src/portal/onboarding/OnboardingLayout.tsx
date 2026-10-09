import { Suspense, useEffect, useState, type ReactElement } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { Brand } from "../../components/ui/Brand";
import { ONBOARDING_STEPS } from "../../content/portal";
import { cx } from "../../lib/cx";
import "../../styles/dashboard.css";
import "../../styles/portal.css";

/** Company → Plan → Activate, with a progress bar and a log-out button. */
export default function OnboardingLayout(): ReactElement {
  const { user, signOut } = useAuth();
  const { pathname } = useLocation();
  const [leaving, setLeaving] = useState(false);
  const current = ONBOARDING_STEPS.findIndex((s) => pathname.endsWith(`/${s.key}`));

  useEffect(() => window.scrollTo(0, 0), [pathname]);

  return (
    <div className="onb">
      <header className="onb__top">
        <Brand ariaLabel="Zinwe home" />
        <div className="onb__who">
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
        <ol className="onb__steps" aria-label="Setup progress">
          {ONBOARDING_STEPS.map((step, i) => (
            <li
              key={step.key}
              className={cx("onb__step", i < current && "is-done", i === current && "is-on")}
              aria-current={i === current ? "step" : undefined}
            >
              <span className="onb__num" aria-hidden="true">
                {i < current ? "✓" : i + 1}
              </span>
              <span>{step.label}</span>
            </li>
          ))}
        </ol>
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
