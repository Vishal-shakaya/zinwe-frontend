import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { seoFor } from "../content/seo";
import { usePageMeta } from "../hooks/usePageMeta";
import { useResource } from "../dashboard/useResource";
import { SeriesFeature } from "../components/series/SeriesFeature";
import { errorMessage } from "../lib/api";
import { getSeriesList } from "../lib/api/series";
import "../styles/blog.css";
import "../styles/series.css";

/** Public /blog/series: every members-only series. */
export default function SeriesHubPage(): ReactElement {
  const res = useResource(getSeriesList);
  const rows = res.data?.results;

  usePageMeta(seoFor("/blog/series"));

  return (
    <div className="blog">
      <header className="wrap blog-hero">
        <nav className="sx-crumbs sx-crumbs--light" aria-label="Breadcrumb">
          <Link to="/blog">Blog</Link>
        </nav>
        <p className="eyebrow">Zinwe originals</p>
        <h1 className="h-display blog-hero__title">Stories, not lectures</h1>
        <p className="lede">
          Members-only series for business owners: short episodes about the small mistakes that put company data at risk, each with a
          10-minute fix. Membership is free.
        </p>
      </header>
      <div className="wrap sx-hub">
        {res.error && !rows ? (
          <div className="blog-empty">
            <b>The series didn't load</b>
            <span>{errorMessage(res.error)}</span>
            <button type="button" className="btn btn--ghost" onClick={res.reload}>
              Try again
            </button>
          </div>
        ) : !rows ? (
          <div className="sx-feature is-skeleton" aria-busy="true" />
        ) : rows.length === 0 ? (
          <div className="blog-empty">
            <b>The first series is on its way</b>
            <span>Check back soon.</span>
          </div>
        ) : (
          rows.map((s) => <SeriesFeature key={s.slug} show={s} />)
        )}
      </div>
    </div>
  );
}
