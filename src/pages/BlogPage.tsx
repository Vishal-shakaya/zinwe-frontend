import { useCallback, useState, type ReactElement } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ICONS } from "../components/site/icons";
import { PathIcon } from "../components/site/SiteIcon";
import { SiteSubscribe } from "../components/site/SiteSubscribe";
import { seoFor } from "../content/seo";
import { useResource } from "../dashboard/useResource";
import { usePageMeta } from "../hooks/usePageMeta";
import { errorMessage } from "../lib/api";
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
 * Public /blog (v1.3.2, owner 31 Oct): a playful banner with the mascot and the vision (company doc, Purpose); then a
 * search bar and topic chips (?type=, server side; search narrows this page, as typed); then every article in a
 * video-site grid. Below it, the members' series, the free guides and the newsletter. Same data as before:
 * /api/blog/articles, /api/blog/guides and /api/blog/series.
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
  const shown = all.filter((a) => !needle || `${a.title} ${a.summary} ${a.tags.join(" ")}`.toLowerCase().includes(needle));
  const types = (data?.types ?? []).filter((t) => t.count > 0 || t.key === type);

  return (
    <div className="zst-blog">
      {/* 1 · The vision, playfully: the mascot and what Zinwe is for. */}
      <section className="zst-wrap zst-vision-wrap">
        <div className="zst-vision">
          <div className="zst-vision__copy">
            <span className="zst-vision__k">The Zinwe blog</span>
            <h1 className="zst-vision__h1">
              Security shouldn't feel like <em>an IT project.</em>
            </h1>
            <p className="zst-vision__lede">We're making it a simple part of running a small business, one short read at a time.</p>
          </div>
          <div className="zst-vision__art" aria-hidden="true">
            <span className="zst-vision__bubble">IT Is OK!</span>
            <img className="zst-vision__mascot" src="/brand/zinwe-mascot.webp" width={480} height={720} alt="" fetchPriority="high" decoding="async" />
          </div>
        </div>
      </section>

      {/* 2 · Search, then topics as a row of chips (?type=, server side). Search narrows this page, as typed. */}
      <section id="all" className="zst-wrap zst-find">
        <label className="zst-search zst-search--wide">
          <PathIcon d={ICONS.search} size={18} />
          <span className="zs-sr">Search articles</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: passwords, USB, sharing…" />
        </label>
        {types.length ? (
          <div className="zst-chips" role="group" aria-label="Filter by topic">
            <button type="button" className={cx("zst-chip", !type && "is-on")} aria-pressed={!type} onClick={() => go({ type: "" })}>
              All
            </button>
            {types.map((t) => (
              <button key={t.key} type="button" className={cx("zst-chip", type === t.key && "is-on")} aria-pressed={type === t.key} onClick={() => go({ type: t.key })}>
                {FILTER_LABEL[t.key] ?? t.label}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      {/* 3 · The articles, as a video-site grid: picture, title, who, topic and date. */}
      <section className="zst-wrap zst-feed" aria-label="Articles">
        {needle ? (
          <p className="zst-feed__n">
            {shown.length} {shown.length === 1 ? "story" : "stories"} found
          </p>
        ) : null}
        {list.error && !data ? (
          <div className="zst-state zst-state--light">
            <b>The blog didn't load</b>
            <span>{errorMessage(list.error)}</span>
            <button type="button" className="zs-btn zs-btn--sm" onClick={list.reload}>
              Try again
            </button>
          </div>
        ) : !data ? (
          <ol className="zst-grid" aria-busy="true">
            {Array.from({ length: 8 }, (_, i) => (
              <li key={`sk-${i}`} className="zst-card">
                <span className="zst-card__art zst-skel" />
                <span className="zst-card__body">
                  <span className="zst-skel zst-skel--line" />
                  <span className="zst-skel zst-skel--line zst-skel--w80" />
                </span>
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
        ) : (
          <ol className="zst-grid">
            {shown.map((a, i) => (
              <Card key={a.slug} a={a} first={i === 0} />
            ))}
          </ol>
        )}

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

function Card({ a, first }: { a: ArticleCard; first: boolean }): ReactElement {
  return (
    <li className="zst-card">
      <Link to={`/blog/${a.slug}`} className="zst-card__link">
        <span className="zst-card__art">
          {a.cover ? (
            <img src={blogAsset(a.cover.url)} alt="" width={1200} height={630} loading={first ? "eager" : "lazy"} decoding="async" />
          ) : (
            <span className="zst-card__blank">{a.title}</span>
          )}
          <span className="zst-card__time">{a.reading_minutes} min</span>
        </span>
        <span className="zst-card__body">
          <img className="zst-card__who" src="/brand/zinwe-mark-128.webp" width={36} height={36} alt="" loading="lazy" />
          <span className="zst-card__text">
            <span className="zst-card__t">{a.title}</span>
            <span className="zst-card__by">{a.author_name || "Zinwe team"}</span>
            <span className="zst-card__by">
              {topic(a)} · <time dateTime={a.published_at}>{formatDate(a.published_at)}</time>
            </span>
          </span>
        </span>
      </Link>
    </li>
  );
}
