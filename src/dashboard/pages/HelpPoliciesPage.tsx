import type { ReactElement } from "react";
import { COLLECTED, COMMITMENTS, NEVER } from "../../content/help";
import { usePageMeta } from "../../hooks/usePageMeta";
import { DashIcon } from "../components/DashIcon";
import { MetricsDisclosure } from "../components/MetricsDisclosure";

/** Help → Policies: what Zinwe records, what it never does, and how the data is handled. */
export default function HelpPoliciesPage(): ReactElement {
  usePageMeta({ title: "Policies — Help", description: "What Zinwe records, what it never does, and who sees it." });

  return (
    <>
      <MetricsDisclosure
        title="What Zinwe records"
        sub="Across every feature, in one place. It's visible only to your company's Zinwe account."
        collected={[...COLLECTED]}
        never={[...NEVER]}
      />

      <section className="dash-card" aria-labelledby="pol-title">
        <h2 className="dash-card__title" id="pol-title">
          Our promises
        </h2>
        <ul className="help-promises">
          {COMMITMENTS.map((point) => (
            <li key={point.title}>
              <span className="help-promises__mark" aria-hidden="true">
                <DashIcon name="check" />
              </span>
              <div>
                <b>{point.title}</b>
                <p>{point.body}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="dash-note">
          Questions about privacy or your data? Email{" "}
          <a className="dash-link" href="mailto:hello@zinwe.io">
            hello@zinwe.io
          </a>
          .
        </p>
      </section>
    </>
  );
}
