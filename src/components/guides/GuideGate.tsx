import { useId, useState, type FormEvent, type ReactElement } from "react";
import { Link, useLocation } from "react-router-dom";
import { ApiError, errorMessage } from "../../lib/api";
import { subscribeToBlog } from "../../lib/api/blog";
import { trackEvent } from "../../lib/analytics";

/**
 * "Get the free guide": one email field. A new address gets the confirmation email, and confirming downloads the
 * guide (NewsletterPage). A member on a new device gets their link back to this page. The server answers the same
 * either way, so the form can't be used to find out who's a member.
 */
export function GuideGate({ title, slug, compact = false }: { title: string; slug: string; compact?: boolean }): ReactElement {
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
      trackEvent("generate_lead", { method: "guide", item_id: slug });
    } catch (err) {
      setError((err instanceof ApiError && err.fieldErrors.email?.[0]) || errorMessage(err));
      setState("idle");
    }
  };

  if (state === "done") {
    return (
      <div className={`gd-gate gd-gate--done${compact ? " gd-gate--compact" : ""}`} role="status">
        <b>Check your inbox.</b>
        <span>
          We sent a link to <b>{email.trim()}</b>. Open it and <i>{title}</i> downloads straight away. Already a member? The email
          has your personal link.
        </span>
      </div>
    );
  }

  return (
    <form className={`gd-gate${compact ? " gd-gate--compact" : ""}`} onSubmit={(e) => void submit(e)} aria-labelledby={`${id}-t`}>
      <b id={`${id}-t`} className="gd-gate__title">
        Get the free guide
      </b>
      <div className="gd-gate__row">
        <input
          aria-label="Work email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : `${id}-fine`}
        />
        <button type="submit" className="btn btn--primary" disabled={state === "busy"}>
          {state === "busy" ? "Sending…" : "Send me the guide"}
        </button>
      </div>
      {error ? (
        <p id={`${id}-err`} className="gd-gate__err" role="alert">
          {error}
        </p>
      ) : null}
      <small id={`${id}-fine`} className="gd-gate__fine">
        Free membership: every Zinwe guide plus our members-only story series by email. Unsubscribe any time.{" "}
        <Link to="/legal/privacy">Privacy</Link>
      </small>
    </form>
  );
}
