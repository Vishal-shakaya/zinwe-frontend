import { useCallback, useState, type FormEvent, type ReactElement } from "react";
import { ApiError, errorMessage, getMyFeedback, sendFeedback, type Feedback } from "../../lib/api";
import { cx } from "../../lib/cx";
import { useResource } from "../useResource";

const RATINGS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const MAX_MESSAGE = 2000;

function ratingWord(rating: number): string {
  if (rating >= 9) return "Excellent";
  if (rating >= 7) return "Good";
  if (rating >= 5) return "Okay";
  return "Needs work";
}

function sentOn(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

interface FeedbackFormProps {
  /** Where the feedback was given from (stored with it, e.g. "/app/help/feedback" or "modal:/app/team"). */
  page: string;
  /** Shows the owner's past responses under the form. */
  showHistory?: boolean;
  /** Called from the thank-you state (the modal uses it to close). */
  onDone?: () => void;
  /** Pre-picked score, e.g. from a one-tap rating link in the feedback email. */
  initialRating?: number | null;
}

/**
 * Rate Zinwe 1–10 and say what to improve. Shared by the sidebar's feedback
 * modal, the Help → Feedback tab and the /app/feedback page that emails link to.
 */
export function FeedbackForm({
  page,
  showHistory = false,
  onDone,
  initialRating = null,
}: FeedbackFormProps): ReactElement {
  // The modal doesn't show history, so it skips the request.
  const load = useCallback(
    (signal: AbortSignal) => (showHistory ? getMyFeedback(signal) : Promise.resolve<Feedback[]>([])),
    [showHistory],
  );
  const history = useResource(load);

  const [rating, setRating] = useState<number | null>(initialRating);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (rating === null) {
      setError("Pick a rating from 1 to 10.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const saved = await sendFeedback({ rating, message: message.trim(), page });
      if (showHistory) history.setData([saved, ...(history.data ?? [])].slice(0, 10));
      setSent(true);
      setRating(null);
      setMessage("");
    } catch (err) {
      const field = err instanceof ApiError ? (err.fieldErrors.rating ?? err.fieldErrors.message)?.[0] : undefined;
      setError(field ?? errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {sent ? (
        <div className="fb__thanks" role="status">
          <b>Thanks, that helps a lot.</b>
          <span>Your feedback went straight to the Zinwe team.</span>
          <div className="fb__thanks-actions">
            <button type="button" className="btn btn--ghost dash-btn-sm" onClick={() => setSent(false)}>
              Send more feedback
            </button>
            {onDone ? (
              <button type="button" className="btn btn--ink dash-btn-sm" onClick={onDone}>
                Done
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <form className="fb__form" noValidate onSubmit={onSubmit}>
          <fieldset className="fb__rating" aria-describedby="fb-scale">
            <legend>How would you rate Zinwe so far?</legend>
            <div className="fb__scale">
              {RATINGS.map((n) => (
                <label key={n} className={cx("fb__opt", rating === n && "is-on")}>
                  <input
                    type="radio"
                    name="rating"
                    value={n}
                    checked={rating === n}
                    onChange={() => {
                      setRating(n);
                      setError(null);
                    }}
                  />
                  <span>{n}</span>
                </label>
              ))}
            </div>
            <p className="fb__ends" id="fb-scale">
              <span>1 · Poor</span>
              <span>{rating !== null ? `${rating} · ${ratingWord(rating)}` : ""}</span>
              <span>10 · Excellent</span>
            </p>
          </fieldset>

          <div className="field">
            <label htmlFor="fb-message">
              What should we improve? <small>(optional)</small>
            </label>
            <textarea
              id="fb-message"
              rows={4}
              maxLength={MAX_MESSAGE}
              placeholder="A feature you're missing, something confusing, or what you like."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <small className="fb__count">
              {message.length}/{MAX_MESSAGE}
            </small>
          </div>

          {error ? (
            <p className="fb__error" role="alert">
              {error}
            </p>
          ) : null}

          <div>
            <button type="submit" className="btn btn--primary" disabled={sending}>
              {sending ? "Sending…" : "Send feedback"}
            </button>
          </div>
        </form>
      )}

      {showHistory && history.data && history.data.length > 0 ? (
        <div className="fb-history" aria-label="Your past feedback">
          <h3 className="fb-history__title">What you've told us</h3>
          <ul className="fb-history__list">
            {history.data.map((f) => (
              <li key={f.id}>
                <span className="fb-history__score">{f.rating}/10</span>
                <div>
                  <p>{f.message || <span className="fb-history__none">No comment</span>}</p>
                  <small>{sentOn(f.created_at)}</small>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}

export default FeedbackForm;
