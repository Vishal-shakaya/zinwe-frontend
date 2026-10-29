import { useEffect, useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { usePageMeta } from "../../hooks/usePageMeta";
import { trackEvent } from "../../lib/analytics";
import { socialSignIn } from "../../lib/api";
import { AuthShell } from "../components/AuthShell";
import { failureMessage } from "../failure";
import { rememberSignIn } from "../lastLogin";
import { linkedinRedirectUri, takeLinkedInState } from "../social";

// A code works once, and React may render or run effects twice in development: read the return trip once per
// URL and remember which codes were already sent.
const used = new Set<string>();
const trips = new Map<string, Trip>();

interface Trip {
  code: string;
  back: string;
  error: string | null;
}

function readTrip(search: string): Trip {
  const cached = trips.get(search);
  if (cached) return cached;
  const params = new URLSearchParams(search);
  const saved = takeLinkedInState();
  const back = saved?.from || "/login";
  const code = params.get("code") ?? "";
  const cancelled = ["user_cancelled_login", "user_cancelled_authorize"].includes(params.get("error") ?? "");
  let error: string | null = null;
  if (params.get("error")) {
    error = cancelled
      ? "You cancelled the LinkedIn sign-in. No problem: try again, or use your work email."
      : "LinkedIn didn't sign you in. Try again, or use your work email.";
  } else if (!code || !saved || saved.state !== params.get("state")) {
    error = "This sign-in link has expired. Start again from the sign-in page.";
  }
  const trip = { code: error ? "" : code, back, error };
  trips.set(search, trip);
  return trip;
}

/**
 * /auth/linkedin/callback (FR-38): LinkedIn sends the person back here with `code` + `state` (or `error` when they
 * cancelled). On success the token is stored and the guard moves them on by onboarding step.
 */
export default function LinkedInCallbackPage(): ReactElement {
  usePageMeta({ title: "Signing in with LinkedIn · Zinwe", description: "", noindex: true });
  const { signIn } = useAuth();
  const [trip] = useState(() => readTrip(window.location.search));
  const [sendError, setSendError] = useState<string | null>(null);
  const error = trip.error ?? sendError;
  const back = trip.back;

  useEffect(() => {
    const code = trip.code;
    if (!code || used.has(code)) return;
    used.add(code);
    void socialSignIn("linkedin", code, linkedinRedirectUri()).then((result) => {
      if (result.ok) {
        trackEvent(result.data.created ? "sign_up" : "login", { method: "linkedin" });
        rememberSignIn(result.data.user.email);
        signIn(result.data);
        return;
      }
      setSendError(failureMessage(result));
    });
  }, [signIn, trip.code]);

  return (
    <AuthShell>
      {error ? (
        <div className="zau-form">
          <h1 className="zau-title">We couldn't sign you in</h1>
          <p className="zau-err" role="alert">
            {error}
          </p>
          <Link className="zau-btn full" to={back}>
            Back to {back === "/signup" ? "sign up" : "log in"}
          </Link>
        </div>
      ) : (
        <div className="zau-form" role="status" aria-live="polite">
          <h1 className="zau-title">Signing you in with LinkedIn…</h1>
          <span className="zau-spin" aria-hidden="true" />
        </div>
      )}
    </AuthShell>
  );
}
