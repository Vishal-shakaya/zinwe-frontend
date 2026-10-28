import { useCallback, useRef, useState, type FormEvent, type ReactElement } from "react";
import { useAuth } from "../../auth/authContext";
import { usePageMeta } from "../../hooks/usePageMeta";
import { changePassword, errorMessage, forgotPassword, resendOtp, resetPassword, type ChangePasswordField } from "../../lib/api";
import { codeError, compactErrors, focusFirstInvalid, newPasswordError, type FieldErrorMap } from "../../lib/validation";
import { FormAlert, FormStatus } from "../../portal/components/FormAlert";
import { OtpInput } from "../../portal/components/OtpInput";
import { PasswordField } from "../../portal/components/PasswordField";
import { ResendButton } from "../../portal/components/ResendButton";
import { apiFieldErrors, apiFormError, failureMessage } from "../../portal/failure";
import { otpDigits } from "../../portal/otp";
import { useCountdown } from "../../portal/useCountdown";
import { listSessions } from "../fixtures/settings";
import { ErrorBlock, Sk, Spinner } from "../ui/States";
import { ZIcon } from "../ui/ZIcon";
import { useResource } from "../useResource";

type Stage = "change" | "start" | "code" | "done";

const CHANGE_FIELDS: readonly ChangePasswordField[] = ["current_password", "new_password"];

/**
 * Settings → Account & sign-in (board DashSettings #tab=account). The usual path is current + new password. If the owner
 * has forgotten the current one, they confirm with a 6-digit email code
 * instead. Either way the session is swapped for a fresh one and every other
 * device is signed out.
 */
export default function PasswordPage(): ReactElement {
  usePageMeta({ title: "Account & sign-in — Settings", description: "Change the password you sign in with." });
  const { account } = useAuth();
  const email = account?.user.email ?? "";

  const [stage, setStage] = useState<Stage>("change");
  const [resendIn, setResendIn] = useState(60);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadSessions = useCallback((signal: AbortSignal) => listSessions(signal), []);
  const sessions = useResource(loadSessions);

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
    <>
      {stage === "done" ? (
        <div className="zp-ok" role="status">
          Password changed. Other devices are signed out.
        </div>
      ) : null}
      <section className="z-card zp-card narrow" aria-labelledby="pw-title" style={{ gap: 14 }}>
        <h2 id="pw-title">Change your password</h2>
        <span className="zp-body">
          {stage === "start" || stage === "code" ? (
            <>
              We'll confirm it's you with a 6-digit code sent to <b>{email}</b>.
            </>
          ) : (
            "Changing it signs you out on every other device."
          )}
        </span>

        {stage === "done" ? (
          <div>
            <button type="button" className="z-btn sm" onClick={() => setStage("change")}>
              Change it again
            </button>
          </div>
        ) : stage === "change" ? (
          <ChangeForm onDone={() => setStage("done")} onForgot={() => setStage("start")} />
        ) : stage === "code" ? (
          <CodeForm email={email} resendIn={resendIn} onDone={() => setStage("done")} onCancel={() => setStage("change")} />
        ) : (
          <>
            <FormAlert message={error} />
            <div className="zp-save" style={{ justifyContent: "flex-start" }}>
              <button type="button" className="z-btn pri" onClick={() => void sendCode()} disabled={pending || !email}>
                {pending ? <Spinner size={16} tone="on-orange" /> : <ZIcon name="lock" size={16} />}
                {pending ? "Sending code…" : "Email me a code"}
              </button>
              <button type="button" className="z-btn" onClick={() => setStage("change")} disabled={pending}>
                Back
              </button>
            </div>
          </>
        )}
      </section>

      <section className="z-card zp-card narrow" aria-labelledby="sess-title" style={{ gap: 10 }}>
        <h2 id="sess-title">Where you're signed in</h2>
        {sessions.data === undefined ? (
          sessions.error ? (
            <ErrorBlock message={errorMessage(sessions.error)} onRetry={sessions.reload} />
          ) : (
            <div className="zp-sess" role="status" aria-busy="true">
              <span className="z-sr">Loading where you're signed in…</span>
              <span style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                <Sk w="40%" h={12} />
                <Sk w="30%" h={10} />
              </span>
            </div>
          )
        ) : (
          sessions.data.map((x) => (
            <div key={x.id} className="zp-sess">
              <span>
                <b>{x.device}</b>
                <br />
                <span className="zp-k">{x.where}</span>
              </span>
              {x.current ? <span className="z-pill blue">This device</span> : null}
            </div>
          ))
        )}
        <span className="zp-k">To sign out every other device, change your password above.</span>
      </section>
    </>
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
    <form className="zp-pwform" onSubmit={onSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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

      <div className="zp-save" style={{ justifyContent: "flex-start" }}>
        <button type="submit" className={`z-btn pri${pending ? " is-busy" : ""}`} disabled={pending}>
          {pending ? <Spinner size={16} tone="on-orange" /> : null}
          {pending ? "Saving…" : "Save new password"}
        </button>
        <button type="button" className="zp-linkbtn" onClick={onForgot} disabled={pending} style={{ fontSize: 14 }}>
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
    <form className="zp-pwform" onSubmit={onSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p className="zp-k" style={{ margin: 0 }}>The code works for 10 minutes.</p>
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

      <div className="zp-save" style={{ justifyContent: "flex-start" }}>
        <button type="submit" className={`z-btn pri${pending ? " is-busy" : ""}`} disabled={pending}>
          {pending ? <Spinner size={16} tone="on-orange" /> : null}
          {pending ? "Saving…" : "Save new password"}
        </button>
        <button type="button" className="z-btn" onClick={onCancel} disabled={pending}>
          Back
        </button>
        <ResendButton seconds={cooldown.seconds} pending={resending} onResend={() => void onResend()} />
      </div>
    </form>
  );
}
