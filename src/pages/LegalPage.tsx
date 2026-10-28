import type { ReactElement } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { LegalText } from "../components/legal/LegalText";
import { LEGAL_CONTACT, LEGAL_DOCS, LEGAL_UPDATED, legalDoc } from "../content/legal";
import { LEGAL_SUMMARY_UPDATED, POLICY_SUMMARIES } from "../content/site/legalSummary";
import { legalSeo, seoFor } from "../content/seo";
import { usePageMeta } from "../hooks/usePageMeta";
import { cx } from "../lib/cx";
import "../components/legal/legal.css";
import "../styles/site-legal.css";

/**
 * /legal (board SiteLegal: plain-word summaries with anchors #terms #privacy #refunds #cookies #aup) and
 * /legal/:slug (one full policy, from content/legal.ts, with every policy in the side list).
 */
export default function LegalPage(): ReactElement {
  const { slug } = useParams();
  const doc = legalDoc(slug);
  usePageMeta(doc ? legalSeo(doc) : seoFor("/legal"));

  if (slug && !doc) return <Navigate to="/legal" replace />;

  if (doc) {
    return (
      <div className="zs-wrap zl-body">
        <nav className="zl-toc" aria-label="Policies">
          <span className="zl-toc__k">POLICIES</span>
          <Link to="/legal">
            <span className="zl-dot" aria-hidden="true" />
            All policies, in short
          </Link>
          {LEGAL_DOCS.map((d) => (
            <Link key={d.slug} to={`/legal/${d.slug}`} aria-current={d.slug === doc.slug ? "page" : undefined} className={cx(d.slug === doc.slug && "is-on")}>
              <span className="zl-dot" aria-hidden="true" />
              {d.title}
            </Link>
          ))}
        </nav>
        <article className="zl-pol zl-full">
          <h1 className="zl-full__h">Zinwe {doc.title}</h1>
          <p className="zl-meta">
            Last updated {doc.updated ?? LEGAL_UPDATED} · Operated by SKYTECHNO, New Delhi, India ·{" "}
            <a className="zs-link" href={`mailto:${LEGAL_CONTACT}`}>
              {LEGAL_CONTACT}
            </a>
          </p>
          <LegalText doc={doc} />
        </article>
      </div>
    );
  }

  return (
    <div className="zl">
      <section className="zs-wrap zl-hero">
        <span className="zs-eyebrow">Legal</span>
        <h1 className="zs-h1 zl-h1">Terms and policies, in plain words.</h1>
        <p className="zl-lead">
          Short summaries of the policies that apply when you use Zinwe. Each one links to the full text on zinwe.io, which is what counts.
          Questions:{" "}
          <a className="zs-link" href={`mailto:${LEGAL_CONTACT}`}>
            {LEGAL_CONTACT}
          </a>
          .
        </p>
        <span className="zs-mono zl-updated">{LEGAL_SUMMARY_UPDATED}</span>
      </section>

      <div className="zs-wrap zl-body">
        <nav className="zl-toc" aria-label="On this page">
          <span className="zl-toc__k">ON THIS PAGE</span>
          {POLICY_SUMMARIES.map((p) => (
            <a key={p.id} href={`#${p.id}`}>
              <span className="zl-dot" aria-hidden="true" />
              {p.toc}
            </a>
          ))}
        </nav>
        <div className="zl-list">
          {POLICY_SUMMARIES.map((p) => (
            <article key={p.id} id={p.id} className="zl-pol" aria-labelledby={`${p.id}-h`}>
              <h2 id={`${p.id}-h`}>{p.title}</h2>
              <p className="zl-sum">{p.sum}</p>
              <ul>
                {p.points.map((pt) => (
                  <li key={pt}>{pt}</li>
                ))}
              </ul>
              {p.updated ? <span className="zl-meta">{p.updated}</span> : null}
              <Link className="zs-link zl-fulllink" to={`/legal/${p.slug}`}>
                {p.full}
              </Link>
            </article>
          ))}
          <p className="zl-also">
            Also on zinwe.io:{" "}
            <Link className="zs-link" to="/legal/delivery">
              Shipping and Delivery Policy
            </Link>{" "}
            (nothing is shipped; plans switch on when payment is confirmed) and the{" "}
            <Link className="zs-link" to="/legal/disclaimer">
              Disclaimer
            </Link>
            . Something unclear?{" "}
            <Link className="zs-link" to="/contact?mode=message">
              Talk to us
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
