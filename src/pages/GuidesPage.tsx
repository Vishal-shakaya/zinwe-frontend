import { useEffect, useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { Book, FreeLabel } from "../components/resources/Book";
import { FREE_HONESTY, FREE_STEPS, FREE_TITLE, GUIDE_AUTHOR, GUIDE_NOTE, GUIDE_PROMISES } from "../content/site/resources";
import { seoFor } from "../content/seo";
import { usePageMeta } from "../hooks/usePageMeta";
import { useResource } from "../dashboard/useResource";
import { errorMessage } from "../lib/api";
import { blogAsset } from "../lib/api/blog";
import { getGuide, getGuides, guidePath, type GuideCard, type GuideDetail } from "../lib/api/guides";
import { trackEvent } from "../lib/analytics";
import "../styles/guides.css";
import "../styles/resources.css";

/** Chapters shown per guide in the library; the rest are on the guide's page. */
const INSIDE = 4;

/** Each guide's chapter list (the library API has none). Fetched after the list; the space is held meanwhile (CLS). */
function useChapters(rows: GuideCard[] | undefined): Record<string, GuideDetail["contents"]> {
  const [chapters, setChapters] = useState<Record<string, GuideDetail["contents"]>>({});
  const slugs = rows?.map((g) => g.slug).join("|") ?? "";
  useEffect(() => {
    if (!slugs) return;
    const ctrl = new AbortController();
    for (const slug of slugs.split("|")) {
      getGuide(slug, "", ctrl.signal)
        .then((g) => setChapters((c) => ({ ...c, [slug]: g.contents })))
        .catch(() => {}); // the row keeps its quiet placeholder; the guide's page has the full list
    }
    return () => ctrl.abort();
  }, [slugs]);
  return chapters;
}

/** Public /blog/guides: the free resource library. */
export default function GuidesPage(): ReactElement {
  const res = useResource(getGuides);
  const rows = res.data?.results;
  const chapters = useChapters(rows);
  const seo = seoFor("/blog/guides");
  usePageMeta(seo);
  const pages = rows?.reduce((n, g) => n + (g.page_count || 0), 0) ?? 0;

  return (
    <div className="zrs zrs-lib">
      <header className="wrap zrs-lib__hero">
        <div className="zrs-lib__copy">
          <nav className="zrs-crumbs" aria-label="Breadcrumb">
            <Link to="/blog">Blog</Link>
            <span aria-hidden="true">/</span>
            <span>Free resources</span>
          </nav>
          <FreeLabel />
          <h1 className="zrs-lib__title">{seo.h1}</h1>
          <p className="zrs-lib__lede">{seo.intro[0]}</p>
          <p className="zrs-lib__meta">
            {rows ? `${rows.length} guides · ${pages} pages · PDF` : "Guides · PDF"}
            <span aria-hidden="true"> · </span>
            {GUIDE_AUTHOR}
          </p>
        </div>
        <div className="zrs-shelf" aria-hidden="true">
          {(rows ?? Array.from({ length: 4 }, () => null)).slice(0, 4).map((g, i) => (
            <span key={g?.slug ?? i} className="zrs-shelf__book">
              <Book src={g?.cover ? blogAsset(g.cover.url) : null} alt="" size="md" priority={i < 2} />
            </span>
          ))}
        </div>
      </header>

      <section className="wrap zrs-promises" aria-label="What every guide has">
        {GUIDE_PROMISES.map((p) => (
          <div key={p.title}>
            <h2>{p.title}</h2>
            <p>{p.text}</p>
          </div>
        ))}
      </section>

      <section className="wrap zrs-lib__list" aria-label="The guides">
        {res.error && !rows ? (
          <div className="zrs-empty">
            <b>The guides didn't load</b>
            <span>{errorMessage(res.error)}</span>
            <button type="button" className="btn btn--ghost" onClick={res.reload}>
              Try again
            </button>
          </div>
        ) : !rows ? (
          Array.from({ length: 4 }, (_, i) => <div key={i} className="zrs-row is-skeleton" aria-busy="true" />)
        ) : rows.length === 0 ? (
          <div className="zrs-empty">
            <b>The first guides are on their way</b>
            <span>Check back soon.</span>
          </div>
        ) : (
          rows.map((g, i) => <GuideRow key={g.slug} guide={g} n={i + 1} chapters={chapters[g.slug]} />)
        )}
      </section>

      <section className="wrap zrs-free" aria-labelledby="zrs-free-t">
        <h2 id="zrs-free-t" className="zrs-h2">
          {FREE_TITLE}
        </h2>
        <ol className="zrs-steps">
          {FREE_STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="zrs-steps__n">{i + 1}</span>
              <b>{s.title}</b>
              <span>{s.text}</span>
            </li>
          ))}
        </ol>
        <p className="zrs-honesty">{FREE_HONESTY}</p>
      </section>

      <p className="wrap zrs-note">{GUIDE_NOTE}</p>
    </div>
  );
}

function GuideRow({ guide: g, n, chapters }: { guide: GuideCard; n: number; chapters?: GuideDetail["contents"] }): ReactElement {
  const to = guidePath(g.slug);
  const track = () => trackEvent("select_promotion", { promotion_name: "guide_card_library", item_id: g.slug });
  const shown = chapters?.slice(0, INSIDE);
  const more = chapters ? chapters.length - INSIDE : 0;
  return (
    <article className="zrs-row">
      <Link to={to} className="zrs-row__book" tabIndex={-1} aria-hidden="true" onClick={track}>
        <Book src={g.cover ? blogAsset(g.cover.url) : null} alt="" size="md" />
      </Link>
      <div className="zrs-row__body">
        <p className="zrs-row__meta">
          <span>Guide {String(n).padStart(2, "0")}</span>
          {g.page_count ? <span>{g.page_count} pages</span> : null}
          <span>PDF</span>
          <FreeLabel className="zrs-free-label--quiet" />
        </p>
        <h2 className="zrs-row__title">
          <Link to={to} onClick={track}>
            {g.title}
          </Link>
        </h2>
        {g.subtitle ? <p className="zrs-row__sub">{g.subtitle}</p> : null}
        {g.audience ? (
          <p className="zrs-row__for">
            <b>For</b> {g.audience}
          </p>
        ) : null}
        <div className="zrs-row__inside">
          <b>Inside</b>
          <ol aria-busy={shown ? undefined : true}>
            {shown
              ? shown.map((c, i) => (
                  <li key={`${i}-${c.title}`}>
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    {c.title}
                  </li>
                ))
              : Array.from({ length: INSIDE }, (_, i) => <li key={i} className="is-skeleton" />)}
          </ol>
          <small>{more > 0 ? `+ ${more} more chapter${more === 1 ? "" : "s"}` : " "}</small>
        </div>
        <Link to={to} className="zrs-row__cta" onClick={track}>
          See inside and get it free <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
