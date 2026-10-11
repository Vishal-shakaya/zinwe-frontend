import type { ReactElement } from "react";
import { usePageMeta } from "../../hooks/usePageMeta";
import { FeedbackForm } from "../components/FeedbackForm";

/** Help → Feedback: the same form as the sidebar modal, plus what you've told us before. */
export default function HelpFeedbackPage(): ReactElement {
  usePageMeta({ title: "Feedback — Help", description: "Tell us how Zinwe is working for you." });

  return (
    <section className="dash-card fb" aria-labelledby="help-fb-title">
      <div className="dash-card__head">
        <h2 className="dash-card__title" id="help-fb-title">
          Tell us how we're doing
        </h2>
        <p className="dash-card__sub">What's working and what isn't. The Zinwe team reads every response.</p>
      </div>
      <FeedbackForm page="/app/help/feedback" showHistory />
    </section>
  );
}
