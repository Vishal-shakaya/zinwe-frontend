import { useRef, useState, type FormEvent, type ReactElement } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import type { LoginRedirectState } from "../../auth/ProtectedRoute";
import { Field } from "../../components/forms/Field";
import { usePageMeta } from "../../hooks/usePageMeta";
import { login, type LoginField } from "../../lib/api";
import { compactErrors, emailError, requiredError, type FieldErrorMap } from "../../lib/validation";
import "../../styles/dashboard.css";

/** Only send the owner back to a dashboard path (never an open redirect). */
function safeFrom(state: unknown): string {
  const from = (state as LoginRedirectState | null)?.from;
  return typeof from === "string" && from.startsWith("/app") ? from : "/app";
}

export default function LoginPage(): ReactElement {
  usePageMeta({
    title: "Log in — Zinwe",
    description: "Log in to see your PCs, set USB rules and check recent activity.",
  });

  const { token, signIn, sessionExpired } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const target = safeFrom(location.state);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrorMap<LoginField>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Already logged in (e.g. opened /login from a bookmark).
  if (token && !submitting) return <Navigate to={target} replace />;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const clientErrors = compactErrors<LoginField>({
      email: emailError(email),
      password: requiredError(password),
    });
    setErrors(clientErrors);
    setFormError(null);
    if (clientErrors.email) return emailRef.current?.focus();
    if (clientErrors.password) return passwordRef.current?.focus();

    setSubmitting(true);
    const result = await login({ email: email.trim(), password });
    if (result.ok) {
      signIn(result.data.token, result.data.user);
      navigate(target, { replace: true });
      return;
    }

    setSubmitting(false);
    if (result.kind === "validation") {
      setErrors({
        email: result.fieldErrors.email?.[0],
        password: result.fieldErrors.password?.[0],
      });
      setFormError(result.formError ?? null);
      if (result.fieldErrors.email) emailRef.current?.focus();
      else passwordRef.current?.select();
    } else if (result.kind === "rate_limited") {
      setFormError("Too many attempts. Wait a few minutes, then try again.");
    } else {
      setFormError("Couldn't reach Zinwe. Check your internet connection and try again.");
    }
  };

  return (
    <div className="dash-login">
      <div className="dash-login__top">
        <Link className="brand" to="/" aria-label="Zinwe home">
          zinwe<span className="brand__dot"></span>
        </Link>
        <Link className="dash-link" to="/">
          ← Back to site
        </Link>
      </div>

      <main className="dash-login__main">
        <div className="dash-login__card">
          <h1 className="dash-login__title">Log in</h1>
          <p className="dash-login__lede">See your PCs, set USB rules and check what happened today.</p>

          {sessionExpired ? (
            <p className="dash-banner dash-banner--info" role="status">
              You've been logged out. Log in again to carry on.
            </p>
          ) : null}

          <form className="dash-login__form" onSubmit={onSubmit} noValidate>
            <Field error={errors.email}>
              <label htmlFor="login-email">Work email</label>
              <input
                ref={emailRef}
                id="login-email"
                name="email"
                type="email"
                autoComplete="username"
                inputMode="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={errors.email ? true : undefined}
              />
            </Field>

            <Field error={errors.password}>
              <label htmlFor="login-password">Password</label>
              <div className="dash-pw">
                <input
                  ref={passwordRef}
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={errors.password ? true : undefined}
                />
                <button
                  type="button"
                  className="dash-pw__toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-pressed={showPassword}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </Field>

            {formError ? (
              <p className="form__err" role="alert">
                {formError}
              </p>
            ) : null}

            <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
              {submitting ? "Logging in…" : "Log in"}
              {submitting ? null : <span className="arr">→</span>}
            </button>
          </form>

          <p className="dash-login__fine">
            Forgot your password? Email <a href="mailto:hello@zinwe.io">hello@zinwe.io</a> and we'll reset it.
          </p>
        </div>

        <p className="dash-login__alt">
          New to Zinwe? <Link to="/early-access">Get 3 months free</Link>
        </p>
      </main>
    </div>
  );
}
