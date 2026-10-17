import { useEffect, useRef, useState, type KeyboardEvent, type ReactElement } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { usePageMeta } from "../../hooks/usePageMeta";
import { loginOtpVerify, signupVerify } from "../../lib/api";
import { cx } from "../../lib/cx";
import { AuthShell } from "../components/AuthShell";
import { CodeStep } from "../components/CodeStep";
import { EmailCodeForm, PasswordLoginForm } from "../components/LoginForms";
import { forgetSignedInHere, lastEmail, signedInHere } from "../lastLogin";

type Tab = "password" | "code";

const TABS: ReadonlyArray<{ key: Tab; label: string }> = [
  { key: "password", label: "Password" },
  { key: "code", label: "Email code" },
];

/** A code was emailed: for a passwordless login, or to verify a new account. */
type CodeState = { email: string; resendIn: number; purpose: "login" | "signup"; notice?: string };

function emailFromState(state: unknown): string {
  const email = (state as { email?: unknown } | null)?.email;
  return typeof email === "string" ? email : "";
}

/** Sent here by the sign-in guard from a dashboard page (`{from}`): the session just ended or was never there. */
function fromGuard(state: unknown): boolean {
  return typeof (state as { from?: unknown } | null)?.from === "string";
}

export default function LoginPage(): ReactElement {
  usePageMeta({
    title: "Log in — Zinwe",
    description: "Log in to see your PCs, set USB rules and check recent activity.",
  });

  const { sessionExpired } = useAuth();
  const location = useLocation();
  const [tab, setTab] = useState<Tab>("password");
  // Shared by both tabs, so switching never loses what was typed.
  // Filled in with the last email used on this browser.
  const [email, setEmail] = useState(() => emailFromState(location.state) || lastEmail());
  // "You're logged out": the owner signed in in this tab (or comes from a dashboard page on a browser they've used).
  const [loggedOut] = useState(
    () => !sessionExpired && (signedInHere() || (fromGuard(location.state) && lastEmail() !== "")),
  );
  useEffect(() => {
    forgetSignedInHere();
  }, []);
  const [codeState, setCodeState] = useState<CodeState | null>(null);
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ password: null, code: null });

  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next: Tab = tab === "password" ? "code" : "password";
    setTab(next);
    tabRefs.current[next]?.focus();
  };

  if (codeState) {
    const isLogin = codeState.purpose === "login";
    return (
      <AuthShell>
        <CodeStep
          email={codeState.email}
          purpose={codeState.purpose}
          verify={isLogin ? loginOtpVerify : signupVerify}
          resendIn={codeState.resendIn}
          title={isLogin ? "Check your email" : "Verify your email"}
          notice={codeState.notice}
          submitLabel={isLogin ? "Log in" : "Verify and continue"}
          onBack={() => setCodeState(null)}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      footer={
        <>
          New to Zinwe? <Link to="/signup">Create an account</Link>
        </>
      }
    >
      <div className="auth-form">
        <div>
          <h1 className="auth__title">Log in</h1>
          <p className="auth__lede">See your PCs, set USB rules and check what happened today.</p>
        </div>

        {sessionExpired ? (
          <p className="dash-banner dash-banner--info" role="status">
            You've been logged out. Log in again to carry on.
          </p>
        ) : loggedOut ? (
          <p className="dash-banner dash-banner--ok" role="status">
            You're logged out. See you soon.
          </p>
        ) : null}

        <div className="auth-tabs" role="tablist" aria-label="How to log in">
          {TABS.map((t) => (
            <button
              key={t.key}
              ref={(el) => {
                tabRefs.current[t.key] = el;
              }}
              type="button"
              role="tab"
              id={`login-tab-${t.key}`}
              aria-selected={tab === t.key}
              aria-controls={`login-panel-${t.key}`}
              tabIndex={tab === t.key ? 0 : -1}
              className={cx("auth-tabs__tab", tab === t.key && "is-on")}
              onClick={() => setTab(t.key)}
              onKeyDown={onTabKey}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`login-panel-${tab}`} aria-labelledby={`login-tab-${tab}`}>
          {tab === "password" ? (
            <PasswordLoginForm
              email={email}
              onEmailChange={setEmail}
              onUnverified={(detail) => setCodeState({ email: email.trim(), resendIn: 60, purpose: "signup", notice: detail })}
            />
          ) : (
            <EmailCodeForm
              email={email}
              onEmailChange={setEmail}
              onSent={(resendIn) => setCodeState({ email: email.trim(), resendIn, purpose: "login" })}
            />
          )}
        </div>
      </div>
    </AuthShell>
  );
}
