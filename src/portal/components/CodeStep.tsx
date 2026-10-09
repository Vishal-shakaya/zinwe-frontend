import { useRef, useState, type FormEvent, type ReactElement, type ReactNode } from "react";
import { useAuth } from "../../auth/authContext";
import { resendOtp, type AuthResponse, type CodeField, type OtpPurpose, type SubmitResult } from "../../lib/api";
import { codeError } from "../../lib/validation";
import { failureMessage } from "../failure";
import { useCountdown } from "../useCountdown";
import { FormAlert, FormStatus } from "./FormAlert";
import { otpDigits } from "../otp";
import { OtpInput } from "./OtpInput";
import { ResendButton } from "./ResendButton";

interface CodeStepProps {
  email: string;
  purpose: OtpPurpose;
  verify: (email: string, code: string) => Promise<SubmitResult<AuthResponse, CodeField>>;
  /** Seconds before the first resend is allowed (from the request that sent the code). */
  resendIn: number;
  title: string;
  /** Extra notice above the boxes (e.g. "Verify your email to continue."). */
  notice?: ReactNode;
  submitLabel: string;
  /** Back to the email form, keeping what was typed. */
  onBack: () => void;
}

/**
 * "Enter the code we emailed you": six boxes, auto-submit when complete,
 * resend with a cooldown. A successful verify signs the owner in; the route
 * guard then sends them on by onboarding step.
 */
export function CodeStep({
  email,
  purpose,
  verify,
  resendIn,
  title,
  notice,
  submitLabel,
  onBack,
}: CodeStepProps): ReactElement {
  const { signIn } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resending, setResending] = useState(false);
  const cooldown = useCountdown(resendIn);
  const inFlight = useRef(false);

  const submit = async (value: string) => {
    if (inFlight.current) return;
    const digits = otpDigits(value);
    const invalid = codeError(digits);
    setStatus(null);
    if (invalid) {
      setError(invalid);
      return;
    }
    inFlight.current = true;
    setPending(true);
    setError(null);
    const result = await verify(email, digits);
    inFlight.current = false;
    if (result.ok) {
      signIn(result.data);
      return; // Stays "pending" while the guard redirects.
    }
    setPending(false);
    setError(result.kind === "validation" ? (result.fieldErrors.code?.[0] ?? failureMessage(result)) : failureMessage(result));
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submit(code);
  };

  const onResend = async () => {
    setResending(true);
    setError(null);
    setStatus(null);
    const result = await resendOtp(email, purpose);
    setResending(false);
    if (result.ok) {
      cooldown.start(result.data.resend_in || 60);
      setStatus(`We've sent a new code to ${email}.`);
    } else {
      if (result.kind === "rate_limited") cooldown.start(result.retryAfter ?? 60);
      setError(failureMessage(result));
    }
  };

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <div>
        <h1 className="auth__title">{title}</h1>
        <p className="auth__lede">
          We've sent a 6-digit code to <b className="auth__email">{email}</b>. It works for 10 minutes.
        </p>
      </div>
      {notice ? <p className="dash-banner dash-banner--info">{notice}</p> : null}

      <OtpInput
        idPrefix={`otp-${purpose}`}
        label="Enter the code"
        value={code}
        onChange={(next) => {
          setCode(next);
          if (error) setError(null);
        }}
        onComplete={(full) => void submit(full)}
        invalid={Boolean(error)}
        errorId={error ? `otp-${purpose}-error` : undefined}
        disabled={pending}
        autoFocus
      />

      <FormAlert message={error} id={`otp-${purpose}-error`} />
      <FormStatus message={status} />

      <button type="submit" className="btn btn--primary btn--block" disabled={pending}>
        {pending ? "Checking…" : submitLabel}
      </button>

      <div className="auth-row">
        <ResendButton seconds={cooldown.seconds} pending={resending} onResend={() => void onResend()} />
        <button type="button" className="dash-link auth-row__end" onClick={onBack}>
          Use a different email
        </button>
      </div>
      <p className="auth__fine">Can't find it? Check your spam folder, or resend the code.</p>
    </form>
  );
}
