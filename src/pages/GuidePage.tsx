import { useCallback, useEffect, type ReactElement } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { usePageMeta } from "../hooks/usePageMeta";
import { pageTitle } from "../lib/pageTitle";
import { useResource } from "../dashboard/useResource";
import { Book, FreeLabel } from "../components/resources/Book";
import { GuideGate } from "../components/guides/GuideGate";
import { FREE_HONESTY, FREE_STEPS, FREE_TITLE, GUIDE_AUTHOR, GUIDE_NOTE } from "../content/site/resources";
import { ApiError, errorMessage } from "../lib/api";
import { blogAsset } from "../lib/api/blog";
import { fileSizeLabel, getGuide, guideDownloadHref, guidePath, guideStartFreeUrl, type GuideDetail } from "../lib/api/guides";
import { useReaderKey } from "../lib/api/series";
import { noteGuideVisit } from "../lib/attribution";
import { trackEvent } from "../lib/analytics";
import "../styles/guides.css";
import "../styles/resources.css";

const updatedLabel = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
};

/** Public /blog/guides/:slug: a free e-guide's landing page. Visitors see what's inside; members download the PDF. */
export default function GuidePage(): ReactElement {
  const { slug = "" } = useParams();
  const { search } = useLocation();
  const [key] = useReaderKey();
  const load = useCallback((signal: AbortSignal) => getGuide(slug, key, signal), [slug, key]);
  const res = useResource(load, { resetKey: `${slug}|${key}` });
  const g = res.data;

  usePageMeta({
    // The same title the backend pre-render gives this page (z_blog/prerender.py).
    title: g ? pageTitle(`${g.title} (free guide)`) : pageTitle("Free guides"),
    description: g?.summary || g?.subtitle || "Free plain-English guides for small businesses.",
  });

  useEffect(() => {
    if (!g) return;
    noteGuideVisit(g.campaign, search);
    trackEvent("view_item", { item_id: g.slug, item_category: "guide", member: g.member });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per guide loaded
  }, [g?.slug]);

  if (res.error && !g) {
    const missing = res.error instanceof ApiError && res.error.kind === "not_found";
    return (
      <div className="wrap zrs-empty zrs-empty--page">
        <b>{missing ? "This guide isn't here" : "The guide didn't load"}</b>
        <span>{missing ? "It may have moved." : errorMessage(res.error)}</span>
        <Link className="btn btn--ghost" to="/blog/guides">
          All guides
        </Link>
      </div>
    );
  }
  if (!g) return <div className="wrap zrs-guide-loading" aria-busy="true" />;

  const updated = updatedLabel(g.updated_at);
  const about = g.description
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="zrs zrs-guide">
      <header className="wrap zrs-guide__hero">
        <nav className="zrs-crumbs" aria-label="Breadcrumb">
          <Link to="/blog">Blog</Link>
          <span aria-hidden="true">/</span>
          <Link to="/blog/guides">Free resources</Link>
        </nav>
        <div className="zrs-guide__copy">
          <p className="zrs-guide__meta">
            <FreeLabel />
            <span>Guide{g.page_count ? ` · ${g.page_count} pages` : ""} · PDF</span>
          </p>
          <h1 className="zrs-guide__title">{g.title}</h1>
          {g.subtitle ? <p className="zrs-guide__lede">{g.subtitle}</p> : null}
          <p className="zrs-guide__by">
            {GUIDE_AUTHOR}
            {updated ? ` · Updated ${updated}` : ""}
          </p>
          <div className="zrs-guide__get">
            <Download guide={g} readerKey={key} />
          </div>
        </div>
        <div className="zrs-guide__book">
          <Book src={g.cover ? blogAsset(g.cover.url) : null} alt={g.cover_alt || g.title} size="lg" priority />
        </div>
      </header>

      {g.highlights.length ? (
        <section className="wrap zrs-glance" aria-label="At a glance">
          <ul>
            {g.highlights.map((h) => (
              <li key={h.label}>
                <b>{h.value}</b>
                <span>{h.label}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {about.length || g.audience ? (
        <section className="wrap zrs-guide__section zrs-outcomes" aria-labelledby="zrs-why">
          <h2 id="zrs-why" className="zrs-h2">
            What it helps you do
          </h2>
          <div className="zrs-outcomes__body">
            {about.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            {g.audience ? (
              <p className="zrs-outcomes__for">
                <b>Who it's for</b>
                <span>{g.audience}</span>
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {g.contents.length ? (
        <section className="wrap zrs-guide__section" aria-labelledby="zrs-inside">
          <h2 id="zrs-inside" className="zrs-h2">
            What's inside
          </h2>
          <ol className="zrs-toc">
            {g.contents.map((c, i) => (
              <li key={`${i}-${c.title}`}>
                <span className="zrs-toc__n">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <b>{c.title}</b>
                  {c.note ? <small>{c.note}</small> : null}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {g.samples.some(Boolean) ? (
        <section className="wrap zrs-guide__section" aria-labelledby="zrs-look">
          <h2 id="zrs-look" className="zrs-h2">
            Take a look inside
          </h2>
          <div className="zrs-pages">
            {g.samples.map((s, i) =>
              s ? <img key={s.id} src={blogAsset(s.url)} alt={`${g.title}, sample page ${i + 1}`} loading="lazy" decoding="async" /> : null,
            )}
          </div>
        </section>
      ) : null}

      <section className="wrap zrs-guide__section zrs-free zrs-free--guide" aria-labelledby="zrs-free-t">
        <div>
          <h2 id="zrs-free-t" className="zrs-h2">
            {g.member ? "Your copy is ready" : FREE_TITLE}
          </h2>
          {g.member ? (
            <p className="zrs-honesty">Download it, print the workbook pages and share it with your team.</p>
          ) : (
            <>
              <ol className="zrs-steps zrs-steps--stack">
                {FREE_STEPS.map((s, i) => (
                  <li key={s.title}>
                    <span className="zrs-steps__n">{i + 1}</span>
                    <b>{s.title}</b>
                    <span>{s.text}</span>
                  </li>
                ))}
              </ol>
              <p className="zrs-honesty">{FREE_HONESTY}</p>
            </>
          )}
        </div>
        <div className="zrs-free__get">
          <Download guide={g} readerKey={key} compact />
        </div>
      </section>

      {g.feature_line ? (
        <section className="wrap zrs-guide__section zrs-helps" aria-labelledby="zrs-helps">
          <h2 id="zrs-helps">How Zinwe helps</h2>
          <p>{g.feature_line}</p>
          <Link
            className="zrs-link"
            to={guideStartFreeUrl(g.campaign)}
            onClick={() => trackEvent("select_promotion", { promotion_name: `${g.campaign}_start_free`, item_id: g.slug })}
          >
            Start Zinwe free <span aria-hidden="true">→</span>
          </Link>
        </section>
      ) : null}

      {g.others.length ? (
        <section className="wrap zrs-guide__section" aria-labelledby="zrs-more">
          <h2 id="zrs-more" className="zrs-h2">
            More free guides
          </h2>
          <div className="zrs-more">
            {g.others.map((o) => (
              <Link
                key={o.slug}
                to={guidePath(o.slug)}
                className="zrs-more__item"
                onClick={() => trackEvent("select_promotion", { promotion_name: "guide_card_more", item_id: o.slug })}
              >
                <Book src={o.cover ? blogAsset(o.cover.url) : null} alt="" size="sm" />
                <span>
                  <small>
                    Guide{o.page_count ? ` · ${o.page_count} pages` : ""} · <FreeLabel className="zrs-free-label--quiet" />
                  </small>
                  <b>{o.title}</b>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
      <p className="wrap zrs-note">{GUIDE_NOTE}</p>
    </div>
  );
}

function Download({ guide, readerKey, compact = false }: { guide: GuideDetail; readerKey: string; compact?: boolean }): ReactElement {
  if (!guide.member) return <GuideGate title={guide.title} slug={guide.slug} compact={compact} />;
  return (
    <div className="gd-download">
      <a
        className="btn btn--primary"
        href={guideDownloadHref(guide.slug, readerKey)}
        onClick={() => trackEvent("file_download", { file_name: guide.filename, item_id: guide.slug, link_text: "guide" })}
      >
        Download the PDF{guide.size ? ` (${fileSizeLabel(guide.size)})` : ""}
      </a>
      {guide.reader ? <small>Members' edition · {guide.reader.email}</small> : null}
    </div>
  );
}
