import { useRef, useState, type FormEvent, type ReactElement } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { Field } from "../../components/forms/Field";
import { usePageMeta } from "../../hooks/usePageMeta";
import { forgotPassword, resendOtp, resetPassword } from "../../lib/api";
import { codeError, emailError, newPasswordError } from "../../lib/validation";
import { AuthShell } from "../components/AuthShell";
import { FormAlert, FormStatus } from "../components/FormAlert";
import { OtpInput } from "../components/OtpInput";
import { otpDigits } from "../otp";
import { PasswordField } from "../components/PasswordField";
import { ResendButton } from "../components/ResendButton";
import { failureMessage } from "../failure";
import { useCountdown } from "../useCountdown";
import { rememberSignIn } from "../lastLogin";

function emailFromState(state: unknown): string {
  const email = (state as { email?: unknown } | null)?.email;
  return typeof email === "string" ? email : "";
}

export default function ForgotPasswordPage(): ReactElement {
  usePageMeta({ title: "Reset your password — Zinwe", description: "Reset your Zinwe password with a code sent to your email." });

  const location = useLocation();
  // From the reset-code email (`?email=…&step=code`, e.g. a reset the Zinwe team sent): open on the code step.
  const [params] = useSearchParams();
  const linkEmail = (params.get("email") ?? "").trim();
  const [email, setEmail] = useState(() => emailFromState(location.state) || linkEmail);
  const [sentTo, setSentTo] = useState<string | null>(() =>
    params.get("step") === "code" && !emailError(linkEmail) ? linkEmail : null,
  );
  const [resendIn, setResendIn] = useState(60);

  return (
    <AuthShell
      footer={
        <>
          Remembered it? <Link to="/login">Log in</Link>
        </>
      }
    >
      {sentTo ? (
        <ResetForm
          email={sentTo}
          resendIn={resendIn}
          onBack={() => setSentTo(null)}
        />
      ) : (
        <RequestForm
          email={email}
          onEmailChange={setEmail}
          onSent={(seconds) => {
            setResendIn(seconds);
            setSentTo(email.trim());
          }}
        />
      )}
    </AuthShell>
  );
}

function RequestForm({
  email,
  onEmailChange,
  onSent,
}: {
  email: string;
  onEmailChange: (email: string) => void;
  onSent: (resendIn: number) => void;
}): ReactElement {
  const [error, setError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const invalid = emailError(email);
    setError(invalid);
    setFormError(null);
    if (invalid) return ref.current?.focus();
    setPending(true);
    const result = await forgotPassword(email.trim());
    setPending(false);
    if (result.ok) return onSent(result.data.resend_in || 60);
    if (result.kind === "validation" && result.fieldErrors.email) setError(result.fieldErrors.email[0]);
    else setFormError(failureMessage(result));
  };

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <div>
        <h1 className="auth__title">Reset your password</h1>
        <p className="auth__lede">Enter your work email and we'll send you a code to set a new password.</p>
      </div>
      <Field error={error}>
        <label htmlFor="fp-email">Work email</label>
        <input
          ref={ref}
          id="fp-email"
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
      <FormAlert message={formError} />
      <button type="submit" className="btn btn--primary btn--block" disabled={pending}>
        {pending ? "Sending code…" : "Send reset code"}
        {pending ? null : <span className="arr">→</span>}
      </button>
    </form>
  );
}

function ResetForm({ email, resendIn, onBack }: { email: string; resendIn: number; onBack: () => void }): ReactElement {
  const { signIn } = useAuth();
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ code?: string; new_password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resending, setResending] = useState(false);
  const cooldown = useCountdown(resendIn);
  const passwordRef = useRef<HTMLInputElement>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const digits = otpDigits(code);
    const next = { code: codeError(digits), new_password: newPasswordError(password) };
    setErrors(next);
    setFormError(null);
    setStatus(null);
    if (next.code) return document.getElementById("fp-code")?.focus();
    if (next.new_password) return passwordRef.current?.focus();

    setPending(true);
    const result = await resetPassword(email, digits, password);
    if (result.ok) {
      rememberSignIn(result.data.user.email || email);
      signIn(result.data);
      return; // The guard redirects by onboarding step.
    }
    setPending(false);
    if (result.kind === "validation") {
      setErrors({ code: result.fieldErrors.code?.[0], new_password: result.fieldErrors.new_password?.join(" ") });
      setFormError(result.formError ?? (result.fieldErrors.email?.[0] || null));
    } else {
      setFormError(failureMessage(result));
    }
  };

  const onResend = async () => {
    setResending(true);
    setFormError(null);
    setStatus(null);
    const result = await resendOtp(email, "password_reset");
    setResending(false);
    if (result.ok) {
      cooldown.start(result.data.resend_in || 60);
      setStatus(`We've sent a new code to ${email}.`);
    } else {
      if (result.kind === "rate_limited") cooldown.start(result.retryAfter ?? 60);
      setFormError(failureMessage(result));
    }
  };

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <div>
        <h1 className="auth__title">Set a new password</h1>
        <p className="auth__lede">
          If an account exists for <b className="auth__email">{email}</b>, we've sent it a 6-digit code. It works for
          10 minutes.
        </p>
      </div>

      <div className="auth-stack">
        <OtpInput
          idPrefix="fp-code"
          label="Reset code"
          value={code}
          onChange={(next) => {
            setCode(next);
            if (errors.code) setErrors((e) => ({ ...e, code: undefined }));
          }}
          onComplete={() => passwordRef.current?.focus()}
          invalid={Boolean(errors.code)}
          errorId={errors.code ? "fp-code-error" : undefined}
          disabled={pending}
          autoFocus
        />
        {errors.code ? (
          <p className="field__err auth-err" id="fp-code-error" role="alert">
            {errors.code}
          </p>
        ) : null}
      </div>

      <PasswordField
        id="fp-password"
        label="New password"
        value={password}
        onChange={setPassword}
        error={errors.new_password}
        autoComplete="new-password"
        inputRef={passwordRef}
        disabled={pending}
      />

      <FormAlert message={formError} />
      <FormStatus message={status} />

      <button type="submit" className="btn btn--primary btn--block" disabled={pending}>
        {pending ? "Saving…" : "Save password and log in"}
      </button>

      <div className="auth-row">
        <ResendButton seconds={cooldown.seconds} pending={resending} onResend={() => void onResend()} />
        <button type="button" className="dash-link auth-row__end" onClick={onBack}>
          Use a different email
        </button>
      </div>
    </form>
  );
}
