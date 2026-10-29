import { useEffect, useRef, useState, type FormEvent, type ReactElement } from "react";
import { signupSource } from "../../lib/attribution";
import { Link, useSearchParams } from "react-router-dom";
import { cx } from "../../lib/cx";
import { OrDivider, SocialSignIn } from "../v13/SocialSignIn";
import { ZField } from "../v13/ZField";
import { ZPassword } from "../v13/ZPassword";
import { PLAN_INTENT_COPY } from "../../content/portal";
import { usePageMeta } from "../../hooks/usePageMeta";
import { signup, signupVerify, type SignupField } from "../../lib/api";
import { planCodeParam, readPlanIntent, rememberPlanIntent } from "../../lib/planIntent";
import {
  compactErrors,
  emailError,
  focusFirstInvalid,
  newPasswordError,
  requiredError,
  type FieldErrorMap,
} from "../../lib/validation";
import { AuthShell } from "../components/AuthShell";
import { CodeStep } from "../components/CodeStep";
import { FormAlert } from "../components/FormAlert";
import { TermsCheckbox } from "../../components/legal/TermsCheckbox";
import { SIGNUP_DOCS } from "../../content/legal";
import { failureMessage } from "../failure";
import { clearSignupCode, readSignupCode, saveSignupCode } from "../lastLogin";
import { trackEvent } from "../../lib/analytics";

const ORDER: readonly SignupField[] = ["full_name", "email", "password", "accept_terms"];

export default function SignupPage(): ReactElement {
  usePageMeta({
    title: "Create your account — Zinwe",
    description: "Create a Zinwe account to protect your team's PCs. Start free forever for up to 3 PCs.",
  });

  const [params] = useSearchParams();
  const planParam = planCodeParam(params.get("plan"));
  const planCode = planParam ?? readPlanIntent();
  useEffect(() => {
    rememberPlanIntent(planParam);
  }, [planParam]);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<FieldErrorMap<SignupField>>({});
  // Typing in a field clears its old message (it comes back on the next submit if still wrong).
  const clearError = (field: SignupField) => setErrors((e) => (e[field] ? { ...e, [field]: undefined } : e));
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // The code step survives a reload (phones reload the tab after a trip to the email app).
  const [codeSent, setCodeSentState] = useState<{ email: string; resendIn: number } | null>(readSignupCode);
  const setCodeSent = (next: { email: string; resendIn: number } | null) => {
    if (next) saveSignupCode(next.email, next.resendIn);
    else clearSignupCode();
    setCodeSentState(next);
  };
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const termsRef = useRef<HTMLInputElement>(null);

  const focusErrors = (next: FieldErrorMap<SignupField>) =>
    focusFirstInvalid(ORDER, next, {
      full_name: nameRef.current,
      email: emailRef.current,
      password: passwordRef.current,
      accept_terms: termsRef.current,
    });

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const clientErrors = compactErrors<SignupField>({
      full_name: requiredError(fullName),
      email: emailError(email),
      password: newPasswordError(password),
      accept_terms: accepted ? undefined : "Please accept the Terms and Conditions and Privacy Policy to continue.",
    });
    setErrors(clientErrors);
    setFormError(null);
    if (Object.keys(clientErrors).length > 0) return focusErrors(clientErrors);

    setPending(true);
    const result = await signup({
      full_name: fullName.trim(),
      email: email.trim(),
      password,
      accept_terms: accepted,
      source: signupSource(),
    });
    setPending(false);
    if (result.ok) {
      trackEvent("signup_started");
      setCodeSent({ email: result.data.email || email.trim(), resendIn: result.data.resend_in });
      return;
    }
    if (result.kind === "validation") {
      const next = compactErrors<SignupField>({
        full_name: result.fieldErrors.full_name?.[0],
        email: result.fieldErrors.email?.[0],
        password: result.fieldErrors.password?.join(" "),
        accept_terms: result.fieldErrors.accept_terms?.[0],
      });
      setErrors(next);
      setFormError(result.formError ?? null);
      focusErrors(next);
    } else {
      setFormError(failureMessage(result));
    }
  };

  const emailTaken = errors.email?.toLowerCase().includes("already exists");

  return (
    <AuthShell
      footer={
        codeSent ? null : (
          <>
            Already have an account? <Link to="/login">Log in</Link>
          </>
        )
      }
    >
      {codeSent ? (
        <CodeStep
          email={codeSent.email}
          purpose="signup"
          verify={signupVerify}
          resendIn={codeSent.resendIn}
          title="Check your email"
          submitLabel="Verify and continue"
          onBack={() => {
            if (!email) setEmail(codeSent.email);
            setCodeSent(null);
          }}
          onSignedIn={clearSignupCode}
        />
      ) : (
        <form className="zau-form" onSubmit={onSubmit} noValidate>
          <div className="zau-head">
            <h1 className="zau-title">Create your account</h1>
            <p className="zau-lede">Free forever for up to 3 PCs. No card needed.</p>
          </div>
          {planCode && PLAN_INTENT_COPY[planCode] ? (
            <p className="zau-note" role="status">
              {PLAN_INTENT_COPY[planCode]}
            </p>
          ) : null}

          <SocialSignIn />
          <OrDivider />

          <ZField error={errors.full_name} errorId="su-name-error">
            <label className="zau-lab" htmlFor="su-name">
              Your name
            </label>
            <input
              ref={nameRef}
              id="su-name"
              name="name"
              className={cx("zau-inp", errors.full_name && "err")}
              autoComplete="name"
              autoFocus
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                clearError("full_name");
              }}
              aria-invalid={errors.full_name ? true : undefined}
              aria-describedby={errors.full_name ? "su-name-error" : undefined}
            />
          </ZField>

          <ZField error={errors.email} errorId="su-email-error">
            <label className="zau-lab" htmlFor="su-email">
              Work email
            </label>
            <input
              ref={emailRef}
              id="su-email"
              name="email"
              type="email"
              inputMode="email"
              className={cx("zau-inp", errors.email && "err")}
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearError("email");
              }}
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? "su-email-error" : undefined}
            />
            {emailTaken ? (
              <span className="zau-hint">
                <Link to="/login" state={{ email: email.trim() }}>
                  Log in instead
                </Link>{" "}
                or <Link to="/forgot-password">reset your password</Link>.
              </span>
            ) : null}
          </ZField>

          <ZPassword
            id="su-password"
            label="Password"
            value={password}
            onChange={(value) => {
              setPassword(value);
              clearError("password");
            }}
            error={errors.password}
            autoComplete="new-password"
            inputRef={passwordRef}
            meter
          />

          <div className="zau-terms">
            <TermsCheckbox
              id="su-terms"
              checked={accepted}
              onChange={(value) => {
                setAccepted(value);
                if (value && errors.accept_terms) setErrors((e) => ({ ...e, accept_terms: undefined }));
              }}
              docs={SIGNUP_DOCS}
              dialogTitle="Before you create your account"
              lead="I agree to the"
              error={errors.accept_terms}
              inputRef={termsRef}
              disabled={pending}
            />
          </div>

          <FormAlert message={formError} />

          <button type="submit" className="zau-btn pri full" disabled={pending}>
            {pending ? <span className="zau-spin" aria-hidden="true" /> : null}
            {pending ? "Creating your account…" : "Create account"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
