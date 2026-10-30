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
import "../styles/site-stories.css";

const TYPE_KEYS: ArticleType[] = ["press_release", "tutorial", "newsletter", "new_release", "informative"];
/** The board's filter names for the two kinds most articles are; the rest keep the API's label. */
const FILTER_LABEL: Partial<Record<ArticleType, string>> = { informative: "Data safety", tutorial: "How-to guides" };
const topic = (a: ArticleCard): string => FILTER_LABEL[a.type] ?? a.type_label;

/**
 * Public /blog (v1.3.2, "the blog reads like a story"): a quiet masthead with search and the newest release note;
 * the lead story big (image, headline, one-line dek); then "Keep reading" as calm rows with real reading times;
 * topics as quiet text filters (?type=, server side) and search (this page's articles, as typed); one Zinwe tip
 * among the rows; the members' series and the free guides; the newsletter. Same data as before: /api/blog/articles,
 * /api/blog/guides, /api/blog/series and /api/auth/whats-new.
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
  const lead = browsing ? all[0] : undefined;
  const rows = lead ? shown.slice(1) : shown;
  const types = (data?.types ?? []).filter((t) => t.count > 0 || t.key === type);
  const total = data?.types.reduce((n, t) => n + t.count, 0) ?? 0;

  return (
    <div className="zst-blog">
      {/* 1 · Masthead: title, search, and a slim "what's new" line. */}
      <section className="zst-wrap zst-mast">
        <span className="zst-mast__k">The Zinwe blog</span>
        <div className="zst-mast__row">
          <div>
            <h1 className="zst-mast__h1">Data protection guides for a safer, calmer office.</h1>
            <p className="zst-mast__lede">Practical guides on keeping company data safe and running a small team, written for owners without an IT team. Short reads, no jargon.</p>
          </div>
          <label className="zst-search">
            <PathIcon d={ICONS.search} size={16} />
            <span className="zs-sr">Search articles</span>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: passwords, USB, sharing…" />
          </label>
        </div>
        {release ? (
          <Link className="zst-release" to="/whats-new">
            <span className="zst-release__v">Zinwe {release.version}</span>
            <span className="zst-release__t">Release notes: {release.title}</span>
            <span aria-hidden="true">→</span>
          </Link>
        ) : notes.data === undefined && !notes.error ? (
          // Holds the release line's place while it loads, so the stories below don't shift (CLS).
          <span className="zst-skel zst-release zst-release--skel" aria-hidden="true" />
        ) : (
          // No release notes (or they failed): keep the line's room, so the lead story never jumps up (CLS).
          <span className="zst-release zst-release--none" aria-hidden="true" />
        )}
      </section>

      {/* 2 · The lead story: big image, a strong headline, one line of dek. Only on the first page, not while searching. */}
      {lead ? (
        <section className="zst-wrap zst-lead" aria-label="Latest story">
          <Link to={`/blog/${lead.slug}`} className="zst-lead__link">
            <span className="zst-lead__art">
              {lead.cover ? (
                // Covers are 1200×630; the box's aspect-ratio holds the space. The lead image is the page's LCP.
                <img src={blogAsset(lead.cover.url)} alt={lead.cover_alt} width={1200} height={630} loading="eager" fetchPriority="high" decoding="sync" />
              ) : (
                <span className="zst-lead__blank" aria-hidden="true">
                  {lead.title}
                </span>
              )}
            </span>
            <span className="zst-lead__body">
              <span className="zst-kick">
                <span className="zst-kick__t">Latest</span> {topic(lead)} · {lead.reading_minutes} min read
              </span>
              <span className="zst-lead__h">{lead.title}</span>
              {lead.summary ? <span className="zst-lead__dek">{lead.summary}</span> : null}
              <span className="zst-lead__by">
                {lead.author_name || "Zinwe team"} · <time dateTime={lead.published_at}>{formatDate(lead.published_at)}</time>
              </span>
            </span>
          </Link>
        </section>
      ) : browsing && !data && !list.error ? (
        // The lead's shape while the stories load, so nothing below jumps (CLS).
        <section className="zst-wrap zst-lead" aria-hidden="true">
          <span className="zst-lead__link">
            <span className="zst-lead__art zst-skel" />
            <span className="zst-lead__body">
              <span className="zst-skel zst-skel--line" />
              <span className="zst-skel zst-skel--h" />
              <span className="zst-skel zst-skel--line zst-skel--w80" />
            </span>
          </span>
        </section>
      ) : null}

      {/* 3 · Keep reading: calm rows. Topics are quiet text filters; search narrows this page. */}
      <section id="all" className="zst-wrap zst-list">
        <div className="zst-list__head">
          <h2 className="zst-list__t">{needle ? `${shown.length} ${shown.length === 1 ? "story" : "stories"} found` : browsing ? "Keep reading" : "Stories"}</h2>
          {types.length ? (
            <div className="zst-topics" role="group" aria-label="Filter by topic">
              <button type="button" className={cx("zst-topic", !type && "is-on")} aria-pressed={!type} onClick={() => go({ type: "" })}>
                All <span className="zst-topic__n">{total}</span>
              </button>
              {types.map((t) => (
                <button key={t.key} type="button" className={cx("zst-topic", type === t.key && "is-on")} aria-pressed={type === t.key} onClick={() => go({ type: t.key })}>
                  {FILTER_LABEL[t.key] ?? t.label} <span className="zst-topic__n">{t.count}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {list.error && !data ? (
          <div className="zst-state zst-state--light">
            <b>The blog didn't load</b>
            <span>{errorMessage(list.error)}</span>
            <button type="button" className="zs-btn zs-btn--sm" onClick={list.reload}>
              Try again
            </button>
          </div>
        ) : !data ? (
          <ol className="zst-rows" aria-busy="true">
            {Array.from({ length: 5 }, (_, i) => (
              <li key={`sk-${i}`} className="zst-row zst-row--skel">
                <span className="zst-row__text">
                  <span className="zst-skel zst-skel--line" />
                  <span className="zst-skel zst-skel--h" />
                </span>
                <span className="zst-row__art zst-skel" />
              </li>
            ))}
          </ol>
        ) : all.length === 0 ? (
          <div className="zst-state zst-state--light">
            <b>{type ? "Nothing here yet" : "The first articles are on their way"}</b>
            <span>{type ? "Try another topic, or come back soon." : "Check back soon for guides and news from the Zinwe team."}</span>
          </div>
        ) : shown.length === 0 ? (
          <div className="zst-state zst-state--light">
            <span>
              No stories match "{q.trim()}".{" "}
              <button type="button" className="zs-textbtn" onClick={() => setQ("")}>
                Clear the search
              </button>
            </span>
          </div>
        ) : rows.length ? (
          <ol className="zst-rows">
            {rows.map((a, i) => (
              <Row key={a.slug} a={a} tipBefore={browsing && i === 3 && rows.length > 4} />
            ))}
          </ol>
        ) : null}

        {data && data.pages > 1 && !needle ? (
          <nav className="zst-pages" aria-label="Pages">
            <button type="button" className="zst-pages__b" disabled={page <= 1} onClick={() => go({ page: page - 1 })}>
              ← Newer
            </button>
            <span>
              Page {page} of {data.pages}
            </span>
            <button type="button" className="zst-pages__b" disabled={page >= data.pages} onClick={() => go({ page: page + 1 })}>
              Older →
            </button>
          </nav>
        ) : null}
      </section>

      {/* 4 · Members' series: the doorway to the dark, streaming-style series pages. */}
      {series.length ? (
        <section className="zst-shows" aria-labelledby="zst-shows-t">
          <div className="zst-wrap">
            <div className="zst-sec">
              <div>
                <h2 id="zst-shows-t">Members' series</h2>
                <p>Stories in short episodes, one email at a time. Free with a membership.</p>
              </div>
              <Link className="zst-sec__more" to="/blog/series">
                All series →
              </Link>
            </div>
            <div className="zst-shows__grid" data-rail="">
              {series.map((s) => (
                <Link key={s.slug} to={`/blog/series/${s.slug}`} className="zst-poster">
                  <span className="zst-poster__art">
                    {s.cover ? <img src={blogAsset(s.cover.url)} alt={s.cover_alt} width={1200} height={630} loading="lazy" decoding="async" /> : null}
                  </span>
                  <span className="zst-poster__body">
                    <b>{s.title}</b>
                    <span className="zst-poster__line">{s.tagline}</span>
                    <span className="zst-poster__k">
                      {s.released ? `${s.released} of ${s.planned_episodes} episodes out` : `${s.planned_episodes} episodes`} · Start episode 1 →
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* 5 · Free guides. */}
      {guides.length ? (
        <section className="zst-wrap zst-guides" aria-labelledby="zst-guides-t">
          <div className="zst-sec">
            <div>
              <h2 id="zst-guides-t">Free guides</h2>
              <p>PDFs with workbooks and 30-day plans. Free with a membership.</p>
            </div>
            <Link className="zst-sec__more" to="/blog/guides">
              All guides
            </Link>
          </div>
          <ul className="zst-guides__list">
            {guides.slice(0, 4).map((g) => (
              <li key={g.slug}>
                <Link to={`/blog/guides/${g.slug}`} className="zst-guide">
                  <span className="zst-guide__art">
                    {g.cover ? <img src={blogAsset(g.cover.url)} alt={g.cover_alt} width={1240} height={1754} loading="lazy" decoding="async" /> : <b>{g.title}</b>}
                  </span>
                  <span className="zst-guide__t">{g.title}</span>
                  <span className="zst-guide__k">
                    Free · {g.page_count} pages · PDF
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 6 · Subscribe. */}
      <SiteSubscribe variant="band" />
    </div>
  );
}

function Row({ a, tipBefore }: { a: ArticleCard; tipBefore: boolean }): ReactElement {
  return (
    <>
      {tipBefore ? (
        <li className="zst-tip">
          <Link to="/product#protection" className="zst-tip__link">
            <span className="zst-kick">
              <span className="zst-kick__t">Zinwe tip</span>
            </span>
            <b>Make every pen drive read-only, in one click.</b>
            <span>Files still open; nothing copies out. Keyboards and mice are never affected.</span>
            <span className="zst-tip__go">See how it works →</span>
          </Link>
        </li>
      ) : null}
      <li className="zst-row">
        <Link to={`/blog/${a.slug}`} className="zst-row__link">
          <span className="zst-row__text">
            <span className="zst-kick">
              {topic(a)} · {a.reading_minutes} min read
            </span>
            <span className="zst-row__t">{a.title}</span>
            {a.summary ? <span className="zst-row__dek">{a.summary}</span> : null}
            <time className="zst-row__date" dateTime={a.published_at}>
              {formatDate(a.published_at)}
            </time>
          </span>
          <span className="zst-row__art">
            {a.cover ? <img src={blogAsset(a.cover.url)} alt="" width={1200} height={630} loading="lazy" decoding="async" /> : null}
          </span>
        </Link>
      </li>
    </>
  );
}
