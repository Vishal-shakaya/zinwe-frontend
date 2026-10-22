import { useCallback, type ReactElement } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { seoFor } from "../content/seo";
import { usePageMeta } from "../hooks/usePageMeta";
import { useResource } from "../dashboard/useResource";
import { NewsletterSignup } from "../components/blog/NewsletterSignup";
import { SeriesFeature } from "../components/series/SeriesFeature";
import { getSeriesList } from "../lib/api/series";
import { getGuides } from "../lib/api/guides";
import { GuidePickCard } from "../components/guides/GuideCard";
import "../styles/guides.css";
import { blogAsset, getArticles, type ArticleCard, type ArticleType } from "../lib/api/blog";
import { errorMessage, getReleaseNotes } from "../lib/api";
import { formatDate } from "../lib/format";
import { cx } from "../lib/cx";
import "../styles/blog.css";
import "../styles/series.css";

const TYPE_KEYS: ArticleType[] = ["press_release", "tutorial", "newsletter", "new_release", "informative"];

/** Public /blog: every published article, newest first, filterable by type (?type=) and paged (?page=). */
export default function BlogPage(): ReactElement {
  const [params, setParams] = useSearchParams();
  const type = (TYPE_KEYS as string[]).includes(params.get("type") ?? "") ? (params.get("type") as ArticleType) : "";
  const page = Math.max(1, Number(params.get("page")) || 1);

  usePageMeta(seoFor("/blog"));

  const load = useCallback((signal: AbortSignal) => getArticles({ type, page }, signal), [type, page]);
  const list = useResource(load, { resetKey: `${type}|${page}` });
  const data = list.data;
  // The members' series sit above the articles (first page, no filter), like a streaming service's billboard.
  const shows = useResource(getSeriesList).data?.results ?? [];
  const guides = useResource(getGuides).data?.results ?? [];
  // Releases live in one place, the release notes (/whats-new, written in the admin app); the blog points to the
  // newest one rather than repeating it as an article.
  const latestRelease = useResource(getReleaseNotes).data?.[0];

  const go = (next: { type?: ArticleType | ""; page?: number }) => {
    const t = next.type ?? type;
    const p = next.page ?? 1;
    const q: Record<string, string> = {};
    if (t) q.type = t;
    if (p > 1) q.page = String(p);
    setParams(q);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const [lead, ...rest] = data?.results ?? [];
  const showLead = !!lead && page === 1;
  // Filters only once there's something to filter, and only the types that have articles.
  const types = (data?.types ?? []).filter((t) => t.count > 0 || t.key === type);
  const showFilters = types.length > 0 && (types.length > 1 || type !== "");

  return (
    <div className="blog">
      <header className="wrap blog-hero">
        <p className="eyebrow">Zinwe blog</p>
        <h1 className="h-display blog-hero__title">Guides, releases and news</h1>
        <p className="lede">How small teams keep their data safe, what's new in Zinwe, and what we're learning along the way.</p>
      </header>

      <div className="wrap">
        {page === 1 && !type && latestRelease ? (
          <Link className="blog-release" to="/whats-new" aria-label={`What's new in Zinwe ${latestRelease.version}`}>
            <span className="blog-release__tag">New in Zinwe {latestRelease.version}</span>
            <span className="blog-release__text">
              <b>{latestRelease.title}</b>
              {latestRelease.summary ? <span>{latestRelease.summary}</span> : null}
            </span>
            <span className="blog-release__go">
              Read the release notes <span aria-hidden="true">→</span>
            </span>
          </Link>
        ) : null}
        {page === 1 && !type ? shows.map((s) => <SeriesFeature key={s.slug} show={s} />) : null}
        {page === 1 && !type && guides.length ? (
          <section className="blog-guides" aria-labelledby="blog-guides-title">
            <h2 id="blog-guides-title">
              Free guides <Link to="/blog/guides">See all →</Link>
            </h2>
            <div className="blog-guides__row">
              {guides.slice(0, 4).map((g) => (
                <GuidePickCard key={g.slug} guide={g} />
              ))}
            </div>
          </section>
        ) : null}

        {showFilters ? (
          <nav className="blog-filter" aria-label="Article types">
            <button type="button" className={cx("blog-filter__chip", !type && "is-on")} onClick={() => go({ type: "" })}>
              All
            </button>
            {types.map((t) => (
              <button
                key={t.key}
                type="button"
                className={cx("blog-filter__chip", `kind--${t.key}`, type === t.key && "is-on")}
                onClick={() => go({ type: t.key })}
              >
                {t.label}
                <span>{t.count}</span>
              </button>
            ))}
            <Link className="blog-filter__chip blog-filter__chip--link" to="/whats-new">
              Release notes <span aria-hidden="true">→</span>
            </Link>
          </nav>
        ) : null}

        {list.error && !data ? (
          <div className="blog-empty">
            <b>The blog didn't load</b>
            <span>{errorMessage(list.error)}</span>
            <button type="button" className="btn btn--ghost" onClick={list.reload}>
              Try again
            </button>
          </div>
        ) : !data ? (
          <div className="blog-grid" aria-busy="true">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="blog-card is-skeleton" />
            ))}
          </div>
        ) : data.results.length === 0 ? (
          <div className="blog-empty">
            <b>{type ? "Nothing here yet" : "The first articles are on their way"}</b>
            <span>{type ? "Try another type, or come back soon." : "Check back soon for guides and news from the Zinwe team."}</span>
          </div>
        ) : (
          <>
            {showLead ? <LeadCard article={lead} /> : null}
            <div className="blog-grid">
              {(showLead ? rest : data.results).map((a) => (
                <Card key={a.slug} article={a} />
              ))}
            </div>
            {data.pages > 1 ? (
              <nav className="blog-pages" aria-label="Pages">
                <button type="button" className="btn btn--ghost" disabled={page <= 1} onClick={() => go({ page: page - 1 })}>
                  ← Newer
                </button>
                <span>
                  Page {page} of {data.pages}
                </span>
                <button type="button" className="btn btn--ghost" disabled={page >= data.pages} onClick={() => go({ page: page + 1 })}>
                  Older →
                </button>
              </nav>
            ) : null}
          </>
        )}

        <NewsletterSignup />
      </div>
    </div>
  );
}

function Meta({ article }: { article: ArticleCard }): ReactElement {
  return (
    <p className="blog-meta">
      <time dateTime={article.published_at}>{formatDate(article.published_at)}</time>
      <span aria-hidden="true">·</span>
      {article.reading_minutes} min read
    </p>
  );
}

function Cover({ article, eager = false }: { article: ArticleCard; eager?: boolean }): ReactElement {
  return article.cover ? (
    <img
      className="blog-cover"
      src={blogAsset(article.cover.url)}
      alt={article.cover_alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
    />
  ) : (
    <div className={cx("blog-cover blog-cover--empty", `kind--${article.type}`)} aria-hidden="true">
      <span>{article.type_label}</span>
    </div>
  );
}

function LeadCard({ article }: { article: ArticleCard }): ReactElement {
  return (
    <Link to={`/blog/${article.slug}`} className="blog-lead">
      <Cover article={article} eager />
      <div className="blog-lead__body">
        <span className={cx("kind-tag", `kind--${article.type}`)}>{article.type_label}</span>
        <h2>{article.title}</h2>
        {article.summary ? <p>{article.summary}</p> : null}
        <Meta article={article} />
      </div>
    </Link>
  );
}

function Card({ article }: { article: ArticleCard }): ReactElement {
  return (
    <Link to={`/blog/${article.slug}`} className="blog-card">
      <Cover article={article} />
      <div className="blog-card__body">
        <span className={cx("kind-tag", `kind--${article.type}`)}>{article.type_label}</span>
        <h3>{article.title}</h3>
        {article.summary ? <p>{article.summary}</p> : null}
        <Meta article={article} />
      </div>
    </Link>
  );
}
