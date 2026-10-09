import { useRef, useState, type FormEvent, type ReactElement, type Ref } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { Field } from "../../components/forms/Field";
import { login, loginOtpRequest, type LoginField } from "../../lib/api";
import { compactErrors, emailError, requiredError, type FieldErrorMap } from "../../lib/validation";
import { failureMessage } from "../failure";
import { FormAlert } from "./FormAlert";
import { PasswordField } from "./PasswordField";

interface EmailProps {
  email: string;
  onEmailChange: (email: string) => void;
}

function EmailField({
  id,
  email,
  onEmailChange,
  error,
  inputRef,
}: EmailProps & { id: string; error?: string; inputRef: Ref<HTMLInputElement> }): ReactElement {
  return (
    <Field error={error}>
      <label htmlFor={id}>Work email</label>
      <input
        ref={inputRef}
        id={id}
        name="email"
        type="email"
        inputMode="email"
        autoComplete="username"
        autoFocus
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
        aria-invalid={error ? true : undefined}
      />
    </Field>
  );
}

/** Email + password. A 403 `email_not_verified` hands over to the code step. */
export function PasswordLoginForm({
  email,
  onEmailChange,
  onUnverified,
}: EmailProps & { onUnverified: (detail: string) => void }): ReactElement {
  const { signIn } = useAuth();
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrorMap<LoginField>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const clientErrors = compactErrors<LoginField>({ email: emailError(email), password: requiredError(password) });
    setErrors(clientErrors);
    setFormError(null);
    if (clientErrors.email) return emailRef.current?.focus();
    if (clientErrors.password) return passwordRef.current?.focus();

    setPending(true);
    const result = await login(email.trim(), password);
    if (result.ok) {
      signIn(result.data);
      return; // The guard redirects by onboarding step.
    }
    setPending(false);
    if (result.kind === "unverified") return onUnverified(result.detail);
    if (result.kind === "validation") {
      setErrors({ email: result.fieldErrors.email?.[0], password: result.fieldErrors.password?.[0] });
      setFormError(result.formError ?? null);
      if (result.fieldErrors.email) emailRef.current?.focus();
      else passwordRef.current?.select();
    } else {
      setFormError(failureMessage(result));
    }
  };

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <EmailField id="login-email" email={email} onEmailChange={onEmailChange} error={errors.email} inputRef={emailRef} />
      <div className="auth-stack">
        <PasswordField
          id="login-password"
          label="Password"
          value={password}
          onChange={setPassword}
          error={errors.password}
          autoComplete="current-password"
          inputRef={passwordRef}
        />
        <Link className="dash-link auth-forgot" to="/forgot-password" state={{ email: email.trim() }}>
          Forgot password?
        </Link>
      </div>
      <FormAlert message={formError} />
      <button type="submit" className="btn btn--primary btn--block" disabled={pending}>
        {pending ? "Logging in…" : "Log in"}
        {pending ? null : <span className="arr">→</span>}
      </button>
    </form>
  );
}

/** Email only: we send a sign-in code (same answer whether or not the account exists). */
export function EmailCodeForm({
  email,
  onEmailChange,
  onSent,
}: EmailProps & { onSent: (resendIn: number) => void }): ReactElement {
  const [error, setError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const invalid = emailError(email);
    setError(invalid);
    setFormError(null);
    if (invalid) return emailRef.current?.focus();

    setPending(true);
    const result = await loginOtpRequest(email.trim());
    setPending(false);
    if (result.ok) return onSent(result.data.resend_in || 60);
    if (result.kind === "validation" && result.fieldErrors.email) {
      setError(result.fieldErrors.email[0]);
      emailRef.current?.focus();
    } else {
      setFormError(failureMessage(result));
    }
  };

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <EmailField id="login-code-email" email={email} onEmailChange={onEmailChange} error={error} inputRef={emailRef} />
      <p className="auth__fine">No password needed. We'll email you a 6-digit code to log in.</p>
      <FormAlert message={formError} />
      <button type="submit" className="btn btn--primary btn--block" disabled={pending}>
        {pending ? "Sending code…" : "Email me a code"}
        {pending ? null : <span className="arr">→</span>}
      </button>
    </form>
  );
}
