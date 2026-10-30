import { useCallback, useState, type FormEvent, type ReactElement } from "react";
import { ApiError, errorMessage, getMyFeedback, sendFeedback, type Feedback } from "../../lib/api";
import { useResource } from "../useResource";
import { Spinner } from "../ui/States";
import "../../styles/dash13/help.css";

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
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

interface FeedbackFormProps {
  /** Where the feedback was given from (stored with it, e.g. "/app/help#feedback" or "modal:/app/team"). */
  page: string;
  /** Shows the owner's past responses under the form. */
  showHistory?: boolean;
  /** Called from the thank-you state (the modal uses it to close). */
  onDone?: () => void;
  /** Pre-picked score, e.g. from a one-tap rating link in the feedback email. */
  initialRating?: number | null;
  /** The question as a heading (Help → Feedback); the modal has its own title. */
  heading?: boolean;
}

/**
 * Rate Zinwe 1–10 and say what to improve (board DashHelp → Feedback). Shared by Help → Feedback, the feedback
 * modal (useShell().openFeedback()) and the /app/feedback page that emails link to.
 */
export function FeedbackForm({ page, showHistory = false, onDone, initialRating = null, heading = false }: FeedbackFormProps): ReactElement {
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
    if (sending) return;
    if (rating === null) {
      setError("Pick a score from 1 to 10 first.");
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
    <div className="zf">
      {sent ? (
        <div className="zf-thanks" role="status">
          <b style={{ fontSize: 17 }}>Thank you. The founder reads every response.</b>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="z-btn sm" onClick={() => setSent(false)}>
              Send more feedback
            </button>
            {onDone ? (
              <button type="button" className="z-btn sm dark" onClick={onDone}>
                Done
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <form className="zf-form" noValidate onSubmit={onSubmit}>
          <fieldset className="zf-scorebox" aria-describedby="zf-scale">
            <legend className={heading ? "zf-q big" : "zf-q"}>How would you rate Zinwe so far?</legend>
            <div className="zf-scores">
              {RATINGS.map((n) => (
                <label key={n} className={`zf-score${rating === n ? " on" : ""}`}>
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
            <p className="zf-ends" id="zf-scale">
              <span>1 · Poor</span>
              <span>{rating !== null ? `${rating} · ${ratingWord(rating)}` : ""}</span>
              <span>10 · Excellent</span>
            </p>
          </fieldset>

          <label htmlFor="zf-msg" style={{ fontWeight: 600 }}>
            What should we improve? <span style={{ fontWeight: 400, color: "#6B6B6B" }}>(optional)</span>
          </label>
          <textarea
            id="zf-msg"
            className="zf-text"
            rows={4}
            maxLength={MAX_MESSAGE}
            placeholder="A feature you're missing, something confusing, or what you like."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <span className="zf-k" style={{ alignSelf: "flex-end", marginTop: -8 }}>
            {message.length}/{MAX_MESSAGE}
          </span>

          {error ? (
            <p className="zf-err" role="alert">
              {error}
            </p>
          ) : null}

          <div className="zf-acts">
            <button
              type="submit"
              className={`z-btn pri${sending ? " is-busy" : ""}`}
              aria-disabled={rating === null || undefined}
              disabled={sending}
            >
              {sending ? <Spinner size={16} tone="on-orange" /> : null}
              {sending ? "Sending…" : "Send feedback"}
            </button>
          </div>
        </form>
      )}

      {showHistory && history.data && history.data.length > 0 ? (
        <div className="zf-hist" aria-label="Your past feedback">
          <b>What you've told us</b>
          <ul>
            {history.data.map((f) => (
              <li key={f.id}>
                <span className="zf-hist__score z-num">{f.rating}/10</span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block" }}>{f.message || <span className="zf-k">No comment</span>}</span>
                  <span className="zf-k">{sentOn(f.created_at)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export default FeedbackForm;
