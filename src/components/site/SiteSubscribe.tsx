import { useId, useState, type FormEvent, type ReactElement } from "react";
import { useLocation } from "react-router-dom";
import { ApiError, errorMessage } from "../../lib/api";
import { subscribeToBlog } from "../../lib/api/blog";
import { trackEvent } from "../../lib/analytics";
import { cx } from "../../lib/cx";

/**
 * The blog newsletter sign-up as drawn on the v3 Blog (wide band) and Article (side card) boards. Double opt-in:
 * POST /api/blog/newsletter/subscribe/ sends a confirmation link; nothing is subscribed until it is clicked.
 */
export function SiteSubscribe({ variant }: { variant: "band" | "side" }): ReactElement {
  const id = useId();
  const { pathname } = useLocation();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("That email doesn’t look complete. Check it and try again.");
      return;
    }
    setState("busy");
    setError(null);
    try {
      await subscribeToBlog(email.trim(), pathname);
      setState("done");
      trackEvent("generate_lead", { method: "blog_newsletter" });
    } catch (err) {
      setError((err instanceof ApiError && err.fieldErrors.email?.[0]) || errorMessage(err));
      setState("idle");
    }
  };

  const done =
    variant === "band" ? (
      <span role="status" className="zb-sub__done">
        Check {email.trim()} to confirm. The first email arrives right after.
      </span>
    ) : (
      <span role="status" className="zb-sub__done">
        Check your inbox to confirm.
      </span>
    );

  const form = (
    <form className={cx("zb-sub__form", variant === "side" && "zb-sub__form--side")} onSubmit={(e) => void submit(e)} noValidate>
      <label htmlFor={`${id}-e`} className={variant === "band" ? "zs-sr" : "zb-sub__lab"}>
        Work email
      </label>
      <input
        id={`${id}-e`}
        type="email"
        autoComplete="email"
        placeholder="you@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
      />
      <button type="submit" className="zs-btn zs-btn--pri zs-btn--flat" disabled={state === "busy"}>
        {state === "busy" ? "Sending…" : "Subscribe"}
      </button>
      {error ? (
        <p id={`${id}-err`} role="alert" className="zb-sub__err">
          {error}
        </p>
      ) : null}
    </form>
  );

  if (variant === "side") {
    return (
      <div className="zb-side zb-sub--side">
        <b>Get new articles</b>
        {state === "done" ? done : form}
      </div>
    );
  }
  return (
    <section className="zs-wrap zb-subwrap" aria-labelledby={`${id}-t`}>
      <div className="zb-sub">
        <div className="zb-sub__copy">
          <b id={`${id}-t`}>One useful email a week. Free.</b>
          <span>New articles, the guides and members-only episodes. Unsubscribe any time.</span>
        </div>
        {state === "done" ? done : form}
      </div>
    </section>
  );
}
