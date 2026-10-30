import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { seoFor } from "../content/seo";
import { usePageMeta } from "../hooks/usePageMeta";
import { useResource } from "../dashboard/useResource";
import { GuideCard } from "../components/guides/GuideCard";
import { errorMessage } from "../lib/api";
import { getGuides } from "../lib/api/guides";
import "../styles/blog.css";
import "../styles/guides.css";

/** Public /blog/guides: the free e-guide library. */
export default function GuidesPage(): ReactElement {
  const res = useResource(getGuides);
  const rows = res.data?.results;
  usePageMeta(seoFor("/blog/guides"));

  return (
    <div className="blog">
      <header className="wrap blog-hero">
        <nav className="gd-crumbs" aria-label="Breadcrumb">
          <Link to="/blog">Blog</Link>
        </nav>
        <p className="eyebrow">Free guides</p>
        <h1 className="h-display blog-hero__title">Free, practical guides for small businesses</h1>
        <p className="lede">
          Plain-English e-guides with workbooks and 30-day plans you can actually finish. No jargon, no scare statistics, no IT
          department needed. Free for members, and membership is free.
        </p>
      </header>
      <div className="wrap">
        {res.error && !rows ? (
          <div className="blog-empty">
            <b>The guides didn't load</b>
            <span>{errorMessage(res.error)}</span>
            <button type="button" className="btn btn--ghost" onClick={res.reload}>
              Try again
            </button>
          </div>
        ) : !rows ? (
          <div className="gd-grid" aria-busy="true">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="gd-card is-skeleton" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="blog-empty">
            <b>The first guides are on their way</b>
            <span>Check back soon.</span>
          </div>
        ) : (
          <div className="gd-grid">
            {rows.map((g, i) => (
              <GuideCard key={g.slug} guide={g} from="library" priority={i === 0} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
