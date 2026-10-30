import { useCallback, useState, type ReactElement } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ICONS } from "../components/site/icons";
import { PathIcon } from "../components/site/SiteIcon";
import { SiteSubscribe } from "../components/site/SiteSubscribe";
import { seoFor } from "../content/seo";
import { useResource } from "../dashboard/useResource";
import { usePageMeta } from "../hooks/usePageMeta";
import { errorMessage, getReleaseNotes } from "../lib/api";
import { blogAsset, getArticles, type ArticleCard, type ArticleType } from "../lib/api/blog";
import { getGuides } from "../lib/api/guides";
import { getSeriesList } from "../lib/api/series";
import { cx } from "../lib/cx";
import { formatDate } from "../lib/format";
import "../styles/site-blog.css";

const TYPE_KEYS: ArticleType[] = ["press_release", "tutorial", "newsletter", "new_release", "informative"];
/** The board's filter names for the two kinds most articles are; the rest keep the API's label. */
const FILTER_LABEL: Partial<Record<ArticleType, string>> = { informative: "Data safety", tutorial: "How-to guides" };
/** Cover tint + icon per kind, for articles without a cover image (and the "Latest" list). */
const KIND_LOOK: Record<ArticleType, { tone: string; icon: string }> = {
  informative: { tone: "blue", icon: ICONS.shield },
  tutorial: { tone: "green", icon: "M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" },
  new_release: { tone: "orange", icon: ICONS.box },
  press_release: { tone: "purple", icon: ICONS.doc },
  newsletter: { tone: "amber", icon: ICONS.mail },
};
const GUIDE_BG = ["zb-gc--0", "zb-gc--1", "zb-gc--2", "zb-gc--3"];

function Meta({ a }: { a: ArticleCard }): ReactElement {
  return (
    <span className="zb-meta">
      <span className={cx("zb-tag", `tone-${KIND_LOOK[a.type]?.tone ?? "grey"}`)}>{a.type_label}</span>
      <time dateTime={a.published_at}>{formatDate(a.published_at)}</time> · {a.reading_minutes} min read
    </span>
  );
}

function Cover({ a, big = false }: { a: ArticleCard; big?: boolean }): ReactElement {
  if (a.cover) {
    // Covers are 1200×630; the box's aspect-ratio (site-blog.css) holds the space. The featured cover is the
    // page's largest image (LCP): loaded first, never lazily.
    return (
      <img
        className={cx("zb-cover", big && "zb-cover--big")}
        src={blogAsset(a.cover.url)}
        alt={a.cover_alt}
        width={1200}
        height={630}
        loading={big ? "eager" : "lazy"}
        fetchPriority={big ? "high" : undefined}
        decoding={big ? "sync" : "async"}
      />
    );
  }
  const look = KIND_LOOK[a.type] ?? KIND_LOOK.informative;
  return (
    <span className={cx("zb-cover zb-cover--tint", `tone-${look.tone}`, big && "zb-cover--big")} aria-hidden="true">
      <span className="zb-cover__icon">
        <PathIcon d={look.icon} size={22} />
      </span>
      <b>{a.title}</b>
    </span>
  );
}

/**
 * Public /blog, v3.1 (board SiteBlog): title + search + the newest release note; the featured article beside the
 * latest three; every article with kind filters (?type=, server side) and search (this page's articles, as typed);
 * one Zinwe tip card in the grid; the free guides; the members' series; the newsletter. Data: /api/blog/articles,
 * /api/blog/guides, /api/blog/series and /api/auth/whats-new — the same sources as before.
 */
export default function BlogPage(): ReactElement {
  usePageMeta(seoFor("/blog"));
  const [params, setParams] = useSearchParams();
  const type = (TYPE_KEYS as string[]).includes(params.get("type") ?? "") ? (params.get("type") as ArticleType) : "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [q, setQ] = useState("");

  const load = useCallback((signal: AbortSignal) => getArticles({ type, page }, signal), [type, page]);
  const list = useResource(load, { resetKey: `${type}|${page}` });
  const data = list.data;
  const guides = useResource(getGuides).data?.results ?? [];
  const series = useResource(getSeriesList).data?.results ?? [];
  const notes = useResource(getReleaseNotes);
  const release = notes.data?.[0];

  const go = (next: { type?: ArticleType | ""; page?: number }) => {
    const t = next.type ?? type;
    const p = next.page ?? 1;
    const query: Record<string, string> = {};
    if (t) query.type = t;
    if (p > 1) query.page = String(p);
    setParams(query);
  };

  const needle = q.trim().toLowerCase();
  const all = data?.results ?? [];
  const browsing = !type && !needle && page === 1;
  const shown = all.filter((a) => !needle || `${a.title} ${a.summary} ${a.tags.join(" ")}`.toLowerCase().includes(needle));
  const [lead, ...rest] = all;
  const latest = rest.slice(0, 3);
  // The grid shows everything (the featured row above is a preview, like the board).
  const types = (data?.types ?? []).filter((t) => t.count > 0 || t.key === type);
  const total = data?.types.reduce((n, t) => n + t.count, 0) ?? 0;

  return (
    <div className="zb">
      {/* 1 · Title, search and a slim "what's new" line. */}
      <section className="zs-wrap zb-hero">
        <div className="zb-hero__row">
          <div className="zb-hero__copy">
            <span className="zs-eyebrow">The Zinwe blog</span>
            <h1 className="zs-h1 zb-h1">Data protection guides for a safer, calmer office.</h1>
            <p className="zs-lead">Practical guides on keeping company data safe and running a small team, written for owners without an IT team. Short reads, no jargon.</p>
          </div>
          <label className="zb-search">
            <PathIcon d={ICONS.search} size={17} />
            <span className="zs-sr">Search articles</span>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: passwords, USB, sharing…" />
          </label>
        </div>
        {release ? (
          <Link className="zb-release" to="/whats-new">
            <span className="zs-mono zb-release__v">Zinwe {release.version}</span>
            <span>Release notes: {release.title}</span>
            <span className="zb-release__go">Read →</span>
          </Link>
        ) : notes.data === undefined && !notes.error ? (
          // Holds the release line's place while it loads, so the articles below don't shift (CLS).
          <span className="zs-skel zb-release zb-release--skel" aria-hidden="true" />
        ) : null}
      </section>

      {/* 2 · Featured article beside the latest three; hidden while searching or filtering. */}
      {browsing && lead ? (
        <section className="zs-wrap zb-feature">
          <Link to={`/blog/${lead.slug}`} className="zb-post zb-post--lead">
            <Cover a={lead} big />
            <span className="zb-post__body zb-post__body--lead">
              <Meta a={lead} />
              <h2 className="zb-lead__h">{lead.title}</h2>
              {lead.summary ? <span className="zb-lead__s">{lead.summary}</span> : null}
            </span>
          </Link>
          {latest.length ? (
            <div className="zb-latest">
              <span className="zb-latest__k">LATEST</span>
              {latest.map((a) => {
                const look = KIND_LOOK[a.type] ?? KIND_LOOK.informative;
                return (
                  <Link key={a.slug} className="zb-side-a" to={`/blog/${a.slug}`}>
                    <span className={cx("zb-side-a__i", `tone-${look.tone}`)} aria-hidden="true">
                      <PathIcon d={look.icon} size={18} />
                    </span>
                    <span className="zb-side-a__t">
                      <b>{a.title}</b>
                      <span>
                        {a.type_label} · {formatDate(a.published_at)} · {a.reading_minutes} min
                      </span>
                    </span>
                  </Link>
                );
              })}
              <a className="zb-latest__all" href="#all">
                All articles ↓
              </a>
            </div>
          ) : null}
        </section>
      ) : browsing && !data && !list.error ? (
        // The featured row's shape while the articles load, so "All articles" doesn't jump down (CLS).
        <section className="zs-wrap zb-feature" aria-hidden="true">
          <div className="zs-skel zb-skel--lead" />
          <div className="zs-skel zb-skel--latest" />
        </section>
      ) : null}

      {/* 3 · Every article: filter by kind, search narrows it. A product tip sits in the grid, once. */}
      <section id="all" className="zs-wrap zb-all">
        <div className="zb-all__head">
          <h2>{browsing ? "All articles" : `${shown.length} ${shown.length === 1 ? "article" : "articles"}`}</h2>
          {types.length ? (
            <div className="zb-filters" role="group" aria-label="Filter articles">
              <button type="button" className={cx("zs-chip", !type && "is-on")} aria-pressed={!type} onClick={() => go({ type: "" })}>
                All <span className="zs-mono zb-count">{total}</span>
              </button>
              {types.map((t) => (
                <button key={t.key} type="button" className={cx("zs-chip", type === t.key && "is-on")} aria-pressed={type === t.key} onClick={() => go({ type: t.key })}>
                  {FILTER_LABEL[t.key] ?? t.label} <span className="zs-mono zb-count">{t.count}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {list.error && !data ? (
          <div className="zs-state">
            <b>The blog didn't load</b>
            <span>{errorMessage(list.error)}</span>
            <button type="button" className="zs-btn zs-btn--sm" onClick={list.reload}>
              Try again
            </button>
          </div>
        ) : !data ? (
          <div className="zb-grid" aria-busy="true">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={`sk-${i}`} className="zs-skel zb-skel" />
            ))}
          </div>
        ) : all.length === 0 ? (
          <div className="zs-state">
            <b>{type ? "Nothing here yet" : "The first articles are on their way"}</b>
            <span>{type ? "Try another kind, or come back soon." : "Check back soon for guides and news from the Zinwe team."}</span>
          </div>
        ) : shown.length === 0 ? (
          <div className="zs-state">
            <span>
              No articles match "{q.trim()}".{" "}
              <button type="button" className="zs-textbtn" onClick={() => setQ("")}>
                Clear the search
              </button>
            </span>
          </div>
        ) : (
          <div className="zb-grid">
            {shown.map((a, i) => (
              <ArticleItem key={a.slug} a={a} tipBefore={browsing && i === 2 && shown.length > 2} />
            ))}
          </div>
        )}

        {data && data.pages > 1 && !needle ? (
          <nav className="zb-pages" aria-label="Pages">
            <button type="button" className="zs-btn zs-btn--sm" disabled={page <= 1} onClick={() => go({ page: page - 1 })}>
              ← Newer
            </button>
            <span>
              Page {page} of {data.pages}
            </span>
            <button type="button" className="zs-btn zs-btn--sm" disabled={page >= data.pages} onClick={() => go({ page: page + 1 })}>
              Older →
            </button>
          </nav>
        ) : null}
      </section>

      {/* 4 · Free guides. */}
      {guides.length ? (
        <section className="zs-wrap zb-guides">
          <div className="zb-sec__head">
            <div>
              <h2>Free guides</h2>
              <span>PDFs with workbooks and 30-day plans. Free with a membership.</span>
            </div>
            <Link className="zs-link zb-strong" to="/blog/guides">
              All guides →
            </Link>
          </div>
          <div className="zb-guides__grid">
            {guides.slice(0, 4).map((g, i) => (
              <Link key={g.slug} to={`/blog/guides/${g.slug}`} className="zb-post zb-guide">
                {g.cover ? (
                  <img className="zb-guide__img" src={blogAsset(g.cover.url)} alt={g.cover_alt} loading="lazy" decoding="async" />
                ) : (
                  <span className={cx("zb-gc", GUIDE_BG[i % GUIDE_BG.length])} aria-hidden="true">
                    <span className="zb-gc__k">ZINWE GUIDE</span>
                    <b>{g.title}</b>
                    <span className="zb-gc__bar" />
                  </span>
                )}
                <span className="zb-guide__foot">
                  <span className="zs-mono">{g.page_count} pages · PDF</span>
                  <span className="zb-guide__go">Get it free →</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* 5 · Members' series. */}
      {series.length ? (
        <section className="zs-wrap zb-series">
          <div className="zb-sec__head">
            <div>
              <h2>Members' series</h2>
              <span>Stories in short episodes, one email at a time. Free with a membership.</span>
            </div>
          </div>
          <div className="zb-series__grid">
            {series.map((s, i) => (
              <Link key={s.slug} to={`/blog/series/${s.slug}`} className={cx("zb-show", `zb-show--${i % 3}`)}>
                <span className="zs-mono zb-show__k">MEMBERS' SERIES · FREE</span>
                <b>{s.title}</b>
                <span className="zb-show__line">{s.tagline}</span>
                <span className="zb-show__foot">
                  <span className="zs-mono">
                    {s.released ? `${s.released} of ${s.planned_episodes} episodes out` : `${s.planned_episodes} episodes`}
                  </span>
                  <span className="zb-show__go">Start episode 1 →</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* 6 · Subscribe. */}
      <SiteSubscribe variant="band" />
    </div>
  );
}

function ArticleItem({ a, tipBefore }: { a: ArticleCard; tipBefore: boolean }): ReactElement {
  return (
    <>
      {tipBefore ? (
        <Link to="/product#protection" className="zb-tip">
          <span className="zb-tip__copy">
            <span className="zb-tag tone-ink">Zinwe tip</span>
            <b>Make every pen drive read-only, in one click.</b>
            <span>Files still open; nothing copies out. Keyboards and mice are never affected.</span>
          </span>
          <span className="zb-tip__ui" aria-hidden="true">
            <b>Pen drives</b>
            <span className="zb-tip__seg">
              <span>Allow</span>
              <span className="is-on">Open files only</span>
              <span>Block</span>
            </span>
          </span>
          <span className="zb-tip__go">See how it works →</span>
        </Link>
      ) : null}
      <Link to={`/blog/${a.slug}`} className="zb-post">
        <Cover a={a} />
        <span className="zb-post__body">
          <Meta a={a} />
          <h3>{a.title}</h3>
          {a.summary ? <span className="zb-post__sum">{a.summary}</span> : null}
        </span>
      </Link>
    </>
  );
}
