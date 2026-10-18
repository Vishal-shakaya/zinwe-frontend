import { useRef, useState, type FormEvent, type ReactElement } from "react";
import { useAuth } from "../../auth/authContext";
import { usePageMeta } from "../../hooks/usePageMeta";
import { changePassword, forgotPassword, resendOtp, resetPassword, type ChangePasswordField } from "../../lib/api";
import { codeError, compactErrors, focusFirstInvalid, newPasswordError, type FieldErrorMap } from "../../lib/validation";
import { FormAlert, FormStatus } from "../../portal/components/FormAlert";
import { OtpInput } from "../../portal/components/OtpInput";
import { PasswordField } from "../../portal/components/PasswordField";
import { ResendButton } from "../../portal/components/ResendButton";
import { apiFieldErrors, apiFormError, failureMessage } from "../../portal/failure";
import { otpDigits } from "../../portal/otp";
import { useCountdown } from "../../portal/useCountdown";
import { DashIcon } from "../components/DashIcon";

type Stage = "change" | "start" | "code" | "done";

const CHANGE_FIELDS: readonly ChangePasswordField[] = ["current_password", "new_password"];

/**
 * Profile → Password. The usual path is current + new password. If the owner
 * has forgotten the current one, they confirm with a 6-digit email code
 * instead. Either way the session is swapped for a fresh one and every other
 * device is signed out.
 */
export default function PasswordPage(): ReactElement {
  usePageMeta({ title: "Password — Profile", description: "Change the password you sign in with." });
  const { account } = useAuth();
  const email = account?.user.email ?? "";

  const [stage, setStage] = useState<Stage>("change");
  const [resendIn, setResendIn] = useState(60);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async () => {
    setPending(true);
    setError(null);
    const result = await forgotPassword(email);
    setPending(false);
    if (result.ok) {
      setResendIn(result.data.resend_in || 60);
      setStage("code");
    } else {
      setError(failureMessage(result));
    }
  };

  return (
    <section className="dash-card pw-card" aria-labelledby="pw-title">
      <div className="dash-card__head">
        <h2 className="dash-card__title" id="pw-title">
          Change your password
        </h2>
        <p className="dash-card__sub">
          {stage === "start" || stage === "code" ? (
            <>
              We'll confirm it's you with a 6-digit code sent to <b>{email}</b>.
            </>
          ) : (
            <>
              You sign in as <b>{email}</b>. Changing it signs you out on every other device.
            </>
          )}
        </p>
      </div>

      {stage === "done" ? (
        <div className="pw-done">
          <p className="dash-banner dash-banner--ok" role="status">
            <DashIcon name="check" />
            <span>
              <b>Password changed.</b> Use it next time you log in. Any other device signed in to this account has
              been logged out.
            </span>
          </p>
          <div>
            <button type="button" className="btn btn--ghost dash-btn-sm" onClick={() => setStage("change")}>
              Change it again
            </button>
          </div>
        </div>
      ) : stage === "change" ? (
        <ChangeForm onDone={() => setStage("done")} onForgot={() => setStage("start")} />
      ) : stage === "code" ? (
        <CodeForm
          email={email}
          resendIn={resendIn}
          onDone={() => setStage("done")}
          onCancel={() => setStage("change")}
        />
      ) : (
        <>
          <FormAlert message={error} />
          <div className="co-form__foot">
            <button type="button" className="btn btn--primary" onClick={() => void sendCode()} disabled={pending || !email}>
              <DashIcon name="lock" />
              {pending ? "Sending code…" : "Email me a code"}
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setStage("change")} disabled={pending}>
              Back
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function ChangeForm({ onDone, onForgot }: { onDone: () => void; onForgot: () => void }): ReactElement {
  const { signIn } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [errors, setErrors] = useState<FieldErrorMap<ChangePasswordField>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const controls = useRef<Partial<Record<ChangePasswordField, HTMLElement | null>>>({});
  const reg = (field: ChangePasswordField) => (el: HTMLInputElement | null) => {
    controls.current[field] = el;
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const clientErrors = compactErrors<ChangePasswordField>({
      current_password: current ? undefined : "Enter your current password.",
      new_password: newPasswordError(next),
    });
    setErrors(clientErrors);
    setFormError(null);
    if (Object.keys(clientErrors).length > 0) return focusFirstInvalid(CHANGE_FIELDS, clientErrors, controls.current);

    setPending(true);
    try {
      // The old token is revoked by the change — switch this tab to the new one.
      signIn(await changePassword(current, next));
      onDone();
    } catch (error) {
      const fieldErrors = apiFieldErrors(error, CHANGE_FIELDS);
      setErrors(fieldErrors);
      setFormError(apiFormError(error, CHANGE_FIELDS));
      focusFirstInvalid(CHANGE_FIELDS, fieldErrors, controls.current);
      setPending(false);
    }
  };

  return (
    <form className="co-form pw-form" onSubmit={onSubmit} noValidate>
      <PasswordField
        id="pw-current"
        label="Current password"
        value={current}
        onChange={(value) => {
          setCurrent(value);
          if (errors.current_password) setErrors((e) => ({ ...e, current_password: undefined }));
        }}
        error={errors.current_password}
        autoComplete="current-password"
        inputRef={reg("current_password")}
        disabled={pending}
      />
      <PasswordField
        id="pw-new"
        label="New password"
        value={next}
        onChange={(value) => {
          setNext(value);
          if (errors.new_password) setErrors((e) => ({ ...e, new_password: undefined }));
        }}
        error={errors.new_password}
        autoComplete="new-password"
        inputRef={reg("new_password")}
        disabled={pending}
      />

      <FormAlert message={formError} />

      <div className="co-form__foot">
        <button type="submit" className="btn btn--primary" disabled={pending}>
          {pending ? "Saving…" : "Save new password"}
        </button>
        <button type="button" className="dash-link" onClick={onForgot} disabled={pending}>
          Forgot your current password?
        </button>
      </div>
    </form>
  );
}

function CodeForm({
  email,
  resendIn,
  onDone,
  onCancel,
}: {
  email: string;
  resendIn: number;
  onDone: () => void;
  onCancel: () => void;
}): ReactElement {
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
    if (next.code) return document.getElementById("pw-code")?.focus();
    if (next.new_password) return passwordRef.current?.focus();

    setPending(true);
    const result = await resetPassword(email, digits, password);
    setPending(false);
    if (result.ok) {
      // The reset revokes every old token, including this tab's — switch to the new one.
      signIn(result.data);
      onDone();
      return;
    }
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
    <form className="co-form pw-form" onSubmit={onSubmit} noValidate>
      <p className="dash-note">The code works for 10 minutes.</p>
      <div className="auth-stack">
        <OtpInput
          idPrefix="pw-code"
          label="Code from your email"
          value={code}
          onChange={(next) => {
            setCode(next);
            if (errors.code) setErrors((e) => ({ ...e, code: undefined }));
          }}
          onComplete={() => passwordRef.current?.focus()}
          invalid={Boolean(errors.code)}
          errorId={errors.code ? "pw-code-error" : undefined}
          disabled={pending}
          autoFocus
        />
        {errors.code ? (
          <p className="field__err auth-err" id="pw-code-error" role="alert">
            {errors.code}
          </p>
        ) : null}
      </div>

      <PasswordField
        id="pw-new"
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

      <div className="co-form__foot">
        <button type="submit" className="btn btn--primary" disabled={pending}>
          {pending ? "Saving…" : "Save new password"}
        </button>
        <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={pending}>
          Back
        </button>
        <ResendButton seconds={cooldown.seconds} pending={resending} onResend={() => void onResend()} />
      </div>
    </form>
  );
}
