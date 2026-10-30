import { useEffect, useState, type ReactElement } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { trackEvent } from "../../lib/analytics";
import { getSocialConfig, socialSignIn, type SocialConfig } from "../../lib/api";
import { failureMessage } from "../failure";
import { rememberSignIn } from "../lastLogin";
import { requestGoogleCode, startLinkedIn } from "../social";

/**
 * "Continue with LinkedIn" / "Continue with Google" (AuthFlow board, FR-38). The buttons light up when the server
 * says the provider is set up (GET /api/auth/social/); otherwise they stay drawn but disabled, "Coming soon".
 * Both end in the normal AuthResponse, so the onboarding guard takes it from there.
 */
export function SocialSignIn(): ReactElement {
  const { signIn } = useAuth();
  const location = useLocation();
  const [config, setConfig] = useState<SocialConfig | null>(null);
  const [busy, setBusy] = useState<"google" | "linkedin" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void getSocialConfig().then((value) => {
      if (live) setConfig(value);
    });
    return () => {
      live = false;
    };
  }, []);

  const google = config?.google.enabled ?? false;
  const linkedin = config?.linkedin.enabled ?? false;
  const anyOn = google || linkedin;
  const from = location.pathname.startsWith("/signup") ? "/signup" : "/login";

  const onGoogle = async () => {
    if (!config || busy) return;
    setError(null);
    setBusy("google");
    const outcome = await requestGoogleCode(config.google.client_id);
    if (!outcome.ok) {
      setBusy(null);
      if (outcome.reason === "failed") setError("Google sign-in didn't open. Try again, or use your work email below.");
      return;
    }
    const result = await socialSignIn("google", outcome.code);
    if (result.ok) {
      trackEvent(result.data.created ? "sign_up" : "login", { method: "google" });
      rememberSignIn(result.data.user.email);
      signIn(result.data);
      return; // The guard redirects by onboarding step.
    }
    setBusy(null);
    setError(failureMessage(result));
  };

  const onLinkedIn = () => {
    if (!config || busy) return;
    setBusy("linkedin");
    startLinkedIn(config.linkedin, from);
  };

  return (
    <div className="zau-social">
      <button
        type="button"
        className="zau-btn li full"
        disabled={!linkedin || busy !== null}
        aria-busy={busy === "linkedin"}
        aria-describedby="zau-social-note"
        onClick={onLinkedIn}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <rect width="24" height="24" rx="4" fill="#0A66C2" />
          <circle cx="7.5" cy="7.2" r="1.5" fill="#fff" />
          <path
            d="M7.5 10.5V17M11.5 17v-6.5M11.5 13.6c0-1.9 1.2-3.1 2.8-3.1s2.7 1.1 2.7 3.1V17"
            stroke="#fff"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
        {busy === "linkedin" ? "Opening LinkedIn…" : "Continue with LinkedIn"}
        {config && !linkedin ? <span className="zau-soon">Coming soon</span> : null}
      </button>
      <button
        type="button"
        className="zau-btn full"
        disabled={!google || busy !== null}
        aria-busy={busy === "google"}
        aria-describedby="zau-social-note"
        onClick={() => void onGoogle()}
      >
        <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
          <path
            fill="#EA4335"
            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
          />
          <path
            fill="#4285F4"
            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
          />
          <path
            fill="#FBBC05"
            d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
          />
          <path
            fill="#34A853"
            d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
          />
        </svg>
        {busy === "google" ? "Waiting for Google…" : "Continue with Google"}
        {config && !google ? <span className="zau-soon">Coming soon</span> : null}
      </button>
      {error ? (
        <p className="zau-err" role="alert">
          {error}
        </p>
      ) : null}
      <span className="zau-social__note" id="zau-social-note">
        {anyOn ? (
          <>
            By continuing you agree to our <Link to="/legal#terms">Terms</Link> and{" "}
            <Link to="/legal#privacy">Privacy Policy</Link>.
          </>
        ) : config ? (
          "LinkedIn and Google sign-in are coming soon. For now, use your work email below."
        ) : null}
      </span>
    </div>
  );
}

/** The "or" divider between the social buttons and the email form. */
export function OrDivider(): ReactElement {
  return (
    <div className="zau-ordiv" aria-hidden="true">
      or
    </div>
  );
}
