import type { ReactElement } from "react";
import { useSearchParams } from "react-router-dom";
import { usePageMeta } from "../../hooks/usePageMeta";
import { FeedbackForm } from "../components/FeedbackForm";
import { PageHeader } from "../components/States";

/**
 * Standalone feedback page. Not in the sidebar: it's the landing spot for the
 * "How are we doing?" link in our emails. In the app, owners use the sidebar's
 * account menu (Give feedback, a modal); its "Your past feedback" link opens this page.
 */
export default function FeedbackPage(): ReactElement {
  usePageMeta({ title: "Feedback — Zinwe", description: "Tell us how Zinwe is working for you." });
  // The email's 1–10 buttons link here with ?rating=N, so the tapped score is already picked.
  const [params] = useSearchParams();
  const tapped = Number(params.get("rating"));
  const initialRating = Number.isInteger(tapped) && tapped >= 1 && tapped <= 10 ? tapped : null;

  return (
    <>
      <PageHeader
        title="Feedback"
        lede={
          initialRating
            ? "Thanks for the score. Add a line on what to improve, then send."
            : "Tell us what's working and what isn't. We read every response."
        }
      />
      <section className="dash-card fb" aria-label="Send feedback">
        <FeedbackForm page={initialRating ? "email" : "/app/feedback"} showHistory initialRating={initialRating} />
      </section>
    </>
  );
}
