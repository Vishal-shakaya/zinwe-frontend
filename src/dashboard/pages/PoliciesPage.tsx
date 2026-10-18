import type { ReactElement } from "react";
import { COLLECTED, COMMITMENTS, NEVER } from "../../content/help";
import { LEGAL_DOCS, LEGAL_UPDATED } from "../../content/legal";
import { usePageMeta } from "../../hooks/usePageMeta";
import { DashIcon } from "../components/DashIcon";
import { MetricsDisclosure } from "../components/MetricsDisclosure";
import { PageHeader } from "../components/States";
import { SocialLinks } from "../../components/ui/SocialLinks";

/** Policies (/app/policies, from the account menu): what Zinwe records, what it never does, and how the data is handled. */
export default function PoliciesPage(): ReactElement {
  usePageMeta({ title: "Policies — Zinwe", description: "What Zinwe records, what it never does, and who sees it." });

  return (
    <>
      <PageHeader title="Policies" lede="What Zinwe records, what it never does, and the documents you agreed to." />
      <MetricsDisclosure
        title="What Zinwe records"
        sub="Across every feature, in one place. It's visible only to your company's Zinwe account."
        collected={[...COLLECTED]}
        never={[...NEVER]}
      />

      <section className="dash-card" aria-labelledby="legal-title">
        <div className="dash-card__head">
          <h2 className="dash-card__title" id="legal-title">
            Legal documents
          </h2>
          <p className="dash-card__sub">
            The full texts you agreed to when you signed up and paid. Last updated {LEGAL_UPDATED}.
          </p>
        </div>
        <ul className="help-legal">
          {LEGAL_DOCS.map((d) => (
            <li key={d.slug}>
              <a href={`/legal/${d.slug}`} target="_blank" rel="noreferrer">
                <b>{d.title}</b>
                <small>{d.summary}</small>
              </a>
            </li>
          ))}
        </ul>
      </section>

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
        <div className="help-social">
          <span>Follow Zinwe for product news</span>
          <SocialLinks />
        </div>
      </section>
    </>
  );
}
