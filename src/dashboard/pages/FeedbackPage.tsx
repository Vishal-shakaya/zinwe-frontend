import type { ReactElement } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { usePageMeta } from "../../hooks/usePageMeta";
import { FeedbackForm } from "../components/FeedbackForm";
import { PageHead } from "../shell/PageHead";
import "../../styles/dash13/settings.css";

/**
 * Standalone feedback page. Not in the menu: it's the landing spot for the "How are we doing?" link in our emails
 * (?rating=N pre-picks the tapped score), and "Your past feedback" from Help → Feedback and the feedback modal.
 */
export default function FeedbackPage(): ReactElement {
  usePageMeta({ title: "Feedback — Zinwe", description: "Tell us how Zinwe is working for you." });
  const [params] = useSearchParams();
  const tapped = Number(params.get("rating"));
  const initialRating = Number.isInteger(tapped) && tapped >= 1 && tapped <= 10 ? tapped : null;

  return (
    <div className="zp-help">
      <PageHead
        label={<Link to="/app/help#tab=feedback">Help &amp; support</Link>}
        title="Feedback"
        lede={
          initialRating
            ? "Thanks for the score. Add a line on what to improve, then send."
            : "Tell us what's working and what isn't. The founder reads every response."
        }
      />
      <div className="zp-col">
        <section className="z-card zp-card mid" aria-label="Send feedback">
          <FeedbackForm page={initialRating ? "email" : "/app/feedback"} showHistory initialRating={initialRating} heading />
        </section>
      </div>
    </div>
  );
}
