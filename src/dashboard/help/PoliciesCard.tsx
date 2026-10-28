import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { LEGAL_UPDATED, type LegalSlug } from "../../content/legal";

/** Board DashHelp → Policies: the documents, with the board's one-line summaries. Each opens on the website. */
const DOCS: ReadonlyArray<[string, string, LegalSlug]> = [
  ["Terms and Conditions", "Who Zinwe is for, billing and liability.", "terms"],
  ["Privacy Policy", "What we collect, how long we keep it, your rights.", "privacy"],
  ["Acceptable Use Policy", "For monitoring your own business devices, openly.", "acceptable-use"],
  ["Refund Policy", "Fees are non-refundable except for billing errors.", "refund"],
  ["Cookie Policy", "Essential cookies; analytics only with your OK.", "cookies"],
  ["Disclaimer", "Zinwe can’t catch every incident and isn’t legal advice.", "disclaimer"],
];

export function PoliciesCard({ more = true }: { more?: boolean }): ReactElement {
  return (
    <section className="z-card zp-card" aria-labelledby="docs-h" style={{ gap: 10 }}>
      <h2 id="docs-h" style={{ fontSize: 18 }}>
        Documents you agreed to
      </h2>
      <span className="zp-body">What Zinwe collects, and what it never does, is set out in the Privacy Policy.</span>
      <span className="zp-k">Last updated {LEGAL_UPDATED}</span>
      <div className="zh-docs">
        {DOCS.map(([t, d, slug]) => (
          <a key={slug} className="zh-doc" href={`/legal/${slug}`} target="_blank" rel="noreferrer">
            <b>{t}</b>
            <span>{d}</span>
          </a>
        ))}
      </div>
      {more ? (
        <Link to="/app/policies" style={{ fontWeight: 600, fontSize: 13, alignSelf: "flex-start" }}>
          What Zinwe records, and what it never does
        </Link>
      ) : null}
    </section>
  );
}
