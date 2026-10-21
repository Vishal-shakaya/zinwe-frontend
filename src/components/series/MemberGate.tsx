import { useId, useState, type FormEvent, type ReactElement, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ApiError, errorMessage } from "../../lib/api";
import { subscribeToBlog } from "../../lib/api/blog";
import { cx } from "../../lib/cx";

/**
 * The members' door of a series: one email field that does both jobs. A new address gets the
 * confirmation email (confirming opens the series in that browser); a member's address gets their
 * reading link (a new device). The server answers the same either way, so the form can't be used to
 * find out who's a member.
 */
export function MemberGate({
  title,
  children,
  variant = "panel",
}: {
  title: string;
  children?: ReactNode;
  variant?: "panel" | "band";
}): ReactElement {
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
    <section className={cx("sx-gate", `sx-gate--${variant}`)} aria-labelledby={`${id}-title`}>
      <p className="sx-gate__badge">
        <LockIcon /> Members only · membership is free
      </p>
      <h2 id={`${id}-title`} className="sx-gate__title">
        {title}
      </h2>
      {children}
      {state === "done" ? (
        <div className="sx-gate__done" role="status">
          <b>Check your inbox.</b>
          <span>
            We sent a link to <b>{email.trim()}</b>. Open it on this device and the episode unlocks. Already a member? That email
            has your personal reading link.
          </span>
        </div>
      ) : (
        <form className="sx-gate__form" onSubmit={(e) => void submit(e)}>
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
          <button type="submit" className="sx-btn sx-btn--red" disabled={state === "busy"}>
            {state === "busy" ? "Sending…" : "Get free access"}
          </button>
          {error ? (
            <p id={`${id}-err`} className="sx-gate__err" role="alert">
              {error}
            </p>
          ) : null}
          <small id={`${id}-fine`} className="sx-gate__fine">
            New here or on a new device? Same box: we email you the link. One email per episode, unsubscribe any time.{" "}
            <Link to="/legal/privacy">Privacy</Link>
          </small>
        </form>
      )}
    </section>
  );
}

export function LockIcon(): ReactElement {
  return (
    <svg className="sx-lock" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 1.5a3.5 3.5 0 0 0-3.5 3.5v2H4a1.5 1.5 0 0 0-1.5 1.5v5A1.5 1.5 0 0 0 4 15h8a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 12 7h-.5V5A3.5 3.5 0 0 0 8 1.5Zm2 5.5H6V5a2 2 0 1 1 4 0v2Z"
      />
    </svg>
  );
}
