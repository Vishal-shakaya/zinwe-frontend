import { useEffect, useRef, useState, type FormEvent, type ReactElement } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Field } from "../../components/forms/Field";
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
import { PasswordField } from "../components/PasswordField";
import { TermsCheckbox } from "../../components/legal/TermsCheckbox";
import { SIGNUP_DOCS } from "../../content/legal";
import { failureMessage } from "../failure";

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
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [codeSent, setCodeSent] = useState<{ email: string; resendIn: number } | null>(null);
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
    const result = await signup({ full_name: fullName.trim(), email: email.trim(), password, accept_terms: accepted });
    setPending(false);
    if (result.ok) {
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
        <>
          Already have an account? <Link to="/login">Log in</Link>
        </>
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
          onBack={() => setCodeSent(null)}
        />
      ) : (
        <form className="auth-form" onSubmit={onSubmit} noValidate>
          <div>
            <h1 className="auth__title">Create your account</h1>
            <p className="auth__lede">Set up Zinwe for your business in a few minutes.</p>
          </div>
          {planCode && PLAN_INTENT_COPY[planCode] ? (
            <p className="dash-banner dash-banner--info">{PLAN_INTENT_COPY[planCode]}</p>
          ) : null}

          <Field error={errors.full_name}>
            <label htmlFor="su-name">Your name</label>
            <input
              ref={nameRef}
              id="su-name"
              name="name"
              autoComplete="name"
              autoFocus
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              aria-invalid={errors.full_name ? true : undefined}
            />
          </Field>

          <Field error={errors.email}>
            <label htmlFor="su-email">Work email</label>
            <input
              ref={emailRef}
              id="su-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={errors.email ? true : undefined}
            />
          </Field>
          {emailTaken ? (
            <p className="auth__fine auth__fine--tight">
              <Link to="/login" state={{ email: email.trim() }}>
                Log in instead
              </Link>{" "}
              or <Link to="/forgot-password">reset your password</Link>.
            </p>
          ) : null}

          <PasswordField
            id="su-password"
            label="Password"
            value={password}
            onChange={setPassword}
            error={errors.password}
            autoComplete="new-password"
            inputRef={passwordRef}
          />

          <TermsCheckbox
            id="su-terms"
            checked={accepted}
            onChange={(value) => {
              setAccepted(value);
              if (value && errors.accept_terms) setErrors((e) => ({ ...e, accept_terms: undefined }));
            }}
            docs={SIGNUP_DOCS}
            dialogTitle="Before you create your account"
            lead="I agree to Zinwe's"
            error={errors.accept_terms}
            inputRef={termsRef}
            disabled={pending}
          />

          <FormAlert message={formError} />

          <button type="submit" className="btn btn--primary btn--block" disabled={pending}>
            {pending ? "Creating your account…" : "Create account"}
            {pending ? null : <span className="arr">→</span>}
          </button>
          <p className="auth__fine">We'll email you a code to confirm it's you.</p>
        </form>
      )}
    </AuthShell>
  );
}
