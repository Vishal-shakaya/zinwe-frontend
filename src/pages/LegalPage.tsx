import type { ReactElement } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { LegalText } from "../components/legal/LegalText";
import { LEGAL_CONTACT, LEGAL_DOCS, LEGAL_UPDATED, legalDoc } from "../content/legal";
import { usePageMeta } from "../hooks/usePageMeta";
import "../components/legal/legal.css";

/** /legal (all policies) and /legal/:slug (one policy, with the others in a side list). */
export default function LegalPage(): ReactElement {
  const { slug } = useParams();
  const doc = legalDoc(slug);
  usePageMeta({
    title: doc ? `${doc.title} — Zinwe` : "Legal — Zinwe",
    description: doc ? doc.summary : "Zinwe's Terms, Privacy, Refund, Cookie and Acceptable Use policies.",
  });

  if (slug && !doc) return <Navigate to="/legal" replace />;

  return (
    <div className="wrap legal-page">
      <nav className="legal-nav" aria-label="Policies">
        <Link to="/legal" className={!doc ? "is-on" : undefined}>
          All policies
        </Link>
        {LEGAL_DOCS.map((d) => (
          <Link key={d.slug} to={`/legal/${d.slug}`} className={d.slug === doc?.slug ? "is-on" : undefined}>
            {d.title}
          </Link>
        ))}
      </nav>

      {doc ? (
        <article className="legal-doc">
          <h1>Zinwe {doc.title}</h1>
          <p className="legal-doc__meta">
            Last updated {LEGAL_UPDATED} · Operated by SKYTECHNO, New Delhi, India ·{" "}
            <a href={`mailto:${LEGAL_CONTACT}`}>{LEGAL_CONTACT}</a>
          </p>
          <LegalText doc={doc} />
        </article>
      ) : (
        <article className="legal-doc">
          <h1>Legal</h1>
          <p className="legal-doc__meta">
            The terms that govern Zinwe, in plain language. Last updated {LEGAL_UPDATED}.
          </p>
          <div className="legal-index">
            {LEGAL_DOCS.map((d) => (
              <Link key={d.slug} to={`/legal/${d.slug}`}>
                <b>{d.title}</b>
                <small>{d.summary}</small>
              </Link>
            ))}
          </div>
        </article>
      )}
    </div>
  );
}
