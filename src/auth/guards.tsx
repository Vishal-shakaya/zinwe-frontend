import type { ReactElement } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { OnboardingStep } from "../lib/api";
import { useAuth } from "./authContext";
import { canUseApp, stepPath } from "./steps";

/** Where the login page sends the owner back to after signing in. */
export interface LoginRedirectState {
  from?: string;
}

function BootScreen(): ReactElement {
  const { loadFailed, retryLoad, signOut } = useAuth();
  if (!loadFailed) {
    return (
      <div className="dash-boot" role="status" aria-live="polite">
        Loading your account…
      </div>
    );
  }
  return (
    <div className="dash-boot" role="alert">
      <div className="boot-error">
        <p>We couldn't load your account. Check your internet connection and try again.</p>
        <div className="boot-error__actions">
          <button type="button" className="btn btn--ink" onClick={retryLoad}>
            Try again
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => void signOut()}>
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}

/** Signed-out visitors go to /login; while GET me/ loads, a short boot screen shows. */
export function RequireAuth(): ReactElement {
  const { token, account } = useAuth();
  const location = useLocation();

  if (!token) {
    const state: LoginRedirectState = { from: `${location.pathname}${location.search}` };
    return <Navigate to="/login" replace state={state} />;
  }
  if (!account) return <BootScreen />;
  return <Outlet />;
}

/** Renders the child routes only at the listed onboarding steps; otherwise routes by step. */
export function StepGate({ allow }: { allow: readonly OnboardingStep[] }): ReactElement {
  const { onboarding } = useAuth();
  if (!onboarding) return <BootScreen />;
  if (!allow.includes(onboarding.step)) return <Navigate to={stepPath(onboarding.step)} replace />;
  return <Outlet />;
}

/** Only send the owner back to a dashboard path (never an open redirect). */
function safeFrom(state: unknown): string | null {
  const from = (state as LoginRedirectState | null)?.from;
  return typeof from === "string" && from.startsWith("/app") ? from : null;
}

/**
 * /login, /signup and /forgot-password: a signed-in owner is sent on by step
 * (or back to the dashboard page they came from, when their step allows it).
 * Signing in on these pages therefore redirects by itself.
 */
export function PublicOnly(): ReactElement {
  const { token, account, loadFailed } = useAuth();
  const location = useLocation();

  if (token && account) {
    const step = account.onboarding.step;
    const from = safeFrom(location.state);
    return <Navigate to={from && canUseApp(step) ? from : stepPath(step)} replace />;
  }
  if (token && !loadFailed) return <BootScreen />;
  return <Outlet />;
}
