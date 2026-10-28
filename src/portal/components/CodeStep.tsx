import { useRef, useState, type FormEvent, type ReactElement, type ReactNode } from "react";
import { useAuth } from "../../auth/authContext";
import { resendOtp, type AuthResponse, type CodeField, type OtpPurpose, type SubmitResult } from "../../lib/api";
import { codeError } from "../../lib/validation";
import { failureMessage } from "../failure";
import { rememberSignIn } from "../lastLogin";
import { useCountdown } from "../useCountdown";
import { FormAlert, FormStatus } from "./FormAlert";
import { otpDigits } from "../otp";
import { OtpInput } from "./OtpInput";
import { trackEvent } from "../../lib/analytics";

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
  /** Right after the code is accepted (before the guard redirects). */
  onSignedIn?: () => void;
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
  onSignedIn,
}: CodeStepProps): ReactElement {
  const { signIn } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resending, setResending] = useState(false);
  // Once a new code is sent, the older one stops working: say which email to use.
  const [resent, setResent] = useState(false);
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
      trackEvent(purpose === "signup" ? "sign_up" : "login", { method: "email_code" });
      rememberSignIn(result.data.user.email || email);
      onSignedIn?.();
      signIn(result.data);
      return; // Stays "pending" while the guard redirects.
    }
    setPending(false);
    const message =
      result.kind === "validation" ? (result.fieldErrors.code?.[0] ?? failureMessage(result)) : failureMessage(result);
    setError(
      result.kind === "validation" && result.fieldErrors.code && resent
        ? `${message} Use the code from the newest email: older codes stop working once a new one is sent.`
        : message,
    );
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
      setResent(true);
      setStatus(`We've sent a new code to ${email}. Use the code from the newest email.`);
    } else {
      if (result.kind === "rate_limited") cooldown.start(result.retryAfter ?? 60);
      setError(failureMessage(result));
    }
  };

  const waiting = cooldown.seconds > 0;

  return (
    <form className="zau-form" onSubmit={onSubmit} noValidate>
      <span className="zau-mailmark" aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16v12H4z" />
          <path d="m4 7 8 6 8-6" />
        </svg>
      </span>
      <div className="zau-head">
        <h1 className="zau-title sm">{title}</h1>
        <p className="zau-lede">
          {purpose === "login" ? (
            // We don't say whether an account exists (same answer for every email).
            <>
              If there's a Zinwe account for <b className="zau-email">{email}</b>, we've sent it a 6-digit code. It
              works for 10 minutes.
            </>
          ) : (
            <>
              We sent a 6-digit code to <b className="zau-email">{email}</b>. It works for 10 minutes.
            </>
          )}
        </p>
      </div>
      {notice ? (
        <p className="zau-note" role="status">
          {notice}
        </p>
      ) : null}

      <div className="zau-field">
        <OtpInput
          idPrefix={`otp-${purpose}`}
          label="Code"
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
      </div>

      <FormAlert message={error} id={`otp-${purpose}-error`} />
      <FormStatus message={status} />

      <button type="submit" className="zau-btn pri full" disabled={pending}>
        {pending ? <span className="zau-spin" aria-hidden="true" /> : null}
        {pending ? "Checking…" : submitLabel}
      </button>

      <p className="zau-resend">
        {resent ? "Use the code from the newest email." : "No email after a minute? Check spam, or"}{" "}
        <button type="button" className="zau-link" onClick={() => void onResend()} disabled={waiting || resending}>
          {resending ? (
            "Sending…"
          ) : waiting ? (
            <>
              Send a new code in <span className="zau-clock">{clock(cooldown.seconds)}</span>
            </>
          ) : (
            "Send a new code"
          )}
        </button>{" "}
        ·{" "}
        <button type="button" className="zau-link" onClick={onBack}>
          Change email
        </button>
      </p>
    </form>
  );
}

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
