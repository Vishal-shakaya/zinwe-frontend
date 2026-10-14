import { useId, useState, type FormEvent, type ReactElement } from "react";
import { Link, useLocation } from "react-router-dom";
import { ApiError, errorMessage } from "../../lib/api";
import { subscribeToBlog } from "../../lib/api/blog";
import { cx } from "../../lib/cx";

/**
 * "Get new articles by email": double opt-in sign-up for the blog newsletter. `compact` is the
 * narrow version for the article sidebar.
 */
export function NewsletterSignup({ compact = false }: { compact?: boolean }): ReactElement {
  const id = useId();
  const { pathname } = useLocation();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setState("busy");
    setError(null);
    try {
      await subscribeToBlog(email.trim(), pathname);
      setState("done");
    } catch (err) {
      setError((err instanceof ApiError && err.fieldErrors.email?.[0]) || errorMessage(err));
      setState("idle");
    }
  };

  return (
    <section className={cx("nl-signup", compact && "nl-signup--compact")} aria-labelledby={`${id}-title`}>
      <div className="nl-signup__copy">
        <b id={`${id}-title`}>Get new articles by email</b>
        <span>Practical guides and Zinwe news, one or two emails a month. Unsubscribe any time.</span>
      </div>
      {state === "done" ? (
        <p className="nl-signup__done" role="status">
          <b>Check your inbox.</b> We sent a link to <b>{email.trim()}</b>. Click it to confirm.
        </p>
      ) : (
        <form className="nl-signup__form" onSubmit={(e) => void submit(e)}>
          <input
            aria-label="Email address"
            type="email"
            required
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-err` : undefined}
          />
          <button type="submit" className="btn btn--primary" disabled={state === "busy"}>
            {state === "busy" ? "Sending…" : "Subscribe"}
          </button>
          {error ? (
            <p id={`${id}-err`} className="nl-signup__err" role="alert">
              {error}
            </p>
          ) : null}
          <small className="nl-signup__fine">
            We use your email only for this. <Link to="/legal/privacy">Privacy policy</Link>
          </small>
        </form>
      )}
    </section>
  );
}
