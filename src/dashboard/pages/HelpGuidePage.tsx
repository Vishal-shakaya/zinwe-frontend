import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { FAQS, GUIDE_STEPS } from "../../content/help";
import { usePageMeta } from "../../hooks/usePageMeta";
import { DashIcon } from "../components/DashIcon";

/** Help → How to use: four steps from sign-up to protected, then the questions owners ask most. */
export default function HelpGuidePage(): ReactElement {
  usePageMeta({ title: "How to use Zinwe — Help", description: "Get your team protected in four steps." });

  return (
    <>
      <section className="dash-card" aria-labelledby="guide-title">
        <div className="dash-card__head">
          <h2 className="dash-card__title" id="guide-title">
            Get protected in four steps
          </h2>
          <p className="dash-card__sub">About 5 minutes per PC. No IT skills needed.</p>
        </div>
        <ol className="help-steps">
          {GUIDE_STEPS.map((step, i) => (
            <li key={step.title} className="help-step">
              <span className="help-step__num" aria-hidden="true">
                {i + 1}
              </span>
              <div className="help-step__text">
                <b>{step.title}</b>
                <p>{step.body}</p>
                <Link className="dash-link" to={step.to}>
                  {step.cta} <DashIcon name="arrow" />
                </Link>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="dash-card" aria-labelledby="faq-title">
        <h2 className="dash-card__title" id="faq-title">
          Common questions
        </h2>
        <div className="help-faq">
          {FAQS.map((faq) => (
            <details key={faq.q} className="help-faq__item">
              <summary>{faq.q}</summary>
              <p>{faq.a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
