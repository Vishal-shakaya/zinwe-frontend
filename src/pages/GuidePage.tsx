import { useCallback, useEffect, type ReactElement } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { usePageMeta } from "../hooks/usePageMeta";
import { pageTitle } from "../lib/pageTitle";
import { useResource } from "../dashboard/useResource";
import { GuideCard } from "../components/guides/GuideCard";
import { GuideGate } from "../components/guides/GuideGate";
import { ApiError, errorMessage } from "../lib/api";
import { blogAsset } from "../lib/api/blog";
import { fileSizeLabel, getGuide, guideDownloadHref, guideStartFreeUrl, type GuideDetail } from "../lib/api/guides";
import { useReaderKey } from "../lib/api/series";
import { noteGuideVisit } from "../lib/attribution";
import { trackEvent } from "../lib/analytics";
import "../styles/guides.css";

/** Public /blog/guides/:slug: a free e-guide's page. Visitors see what's inside; members download the PDF. */
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
      <div className="wrap blog-empty blog-empty--page">
        <b>{missing ? "This guide isn't here" : "The guide didn't load"}</b>
        <span>{missing ? "It may have moved." : errorMessage(res.error)}</span>
        <Link className="btn btn--ghost" to="/blog/guides">
          All guides
        </Link>
      </div>
    );
  }
  if (!g) return <div className="wrap gd-loading" aria-busy="true" />;

  return (
    <div className="gd">
      <header className="wrap gd-hero">
        <div className="gd-hero__copy">
          <nav className="gd-crumbs" aria-label="Breadcrumb">
            <Link to="/blog">Blog</Link>
            <span aria-hidden="true">/</span>
            <Link to="/blog/guides">Free guides</Link>
          </nav>
          <p className="eyebrow">Free guide{g.page_count ? ` · ${g.page_count} pages` : ""} · PDF</p>
          <h1 className="h-display gd-hero__title">{g.title}</h1>
          {g.subtitle ? <p className="lede">{g.subtitle}</p> : null}
          {g.highlights.length ? (
            <ul className="gd-stats">
              {g.highlights.map((h) => (
                <li key={h.label}>
                  <b>{h.value}</b>
                  <span>{h.label}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {g.audience ? (
            <p className="gd-audience">
              <b>For:</b> {g.audience}
            </p>
          ) : null}
          <Download guide={g} readerKey={key} />
        </div>
        <div className="gd-hero__book">
          {g.cover ? <img src={blogAsset(g.cover.url)} alt={g.cover_alt || g.title} fetchPriority="high" /> : null}
        </div>
      </header>

      {g.contents.length ? (
        <section className="wrap gd-section" aria-labelledby="gd-inside">
          <h2 id="gd-inside" className="h-section">
            What's inside
          </h2>
          <ol className="gd-contents">
            {g.contents.map((c, i) => (
              <li key={`${i}-${c.title}`}>
                <span className="gd-contents__n">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <b>{c.title}</b>
                  {c.note ? <small>{c.note}</small> : null}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {g.samples.length ? (
        <section className="wrap gd-section" aria-labelledby="gd-look">
          <h2 id="gd-look" className="h-section">
            Take a look inside
          </h2>
          <div className="gd-samples">
            {g.samples.map((s, i) =>
              s ? <img key={s.id} src={blogAsset(s.url)} alt={`${g.title}, sample page ${i + 1}`} loading="lazy" decoding="async" /> : null,
            )}
          </div>
        </section>
      ) : null}

      {g.description ? (
        <section className="wrap gd-section gd-about">
          {g.description
            .split("\n")
            .filter((p) => p.trim())
            .map((p, i) => (
              <p key={i}>{p}</p>
            ))}
        </section>
      ) : null}

      <section className="wrap gd-section gd-bottom">
        <div className="gd-bottom__get">
          <b>{g.member ? "Your copy is ready" : "Get your free copy"}</b>
          <span>
            {g.member
              ? "Download it, print the workbook pages and share it with your team."
              : "Enter your email. Confirm it, and the PDF downloads straight away. Every other Zinwe guide is free too."}
          </span>
          <Download guide={g} readerKey={key} compact />
        </div>
        {g.feature_line ? (
          <div className="gd-bottom__zinwe">
            <b>How Zinwe helps</b>
            <span>{g.feature_line}</span>
            <Link
              className="btn btn--ghost"
              to={guideStartFreeUrl(g.campaign)}
              onClick={() => trackEvent("select_promotion", { promotion_name: `${g.campaign}_start_free`, item_id: g.slug })}
            >
              Start Zinwe free
            </Link>
          </div>
        ) : null}
      </section>

      {g.others.length ? (
        <section className="wrap gd-section" aria-labelledby="gd-more">
          <h2 id="gd-more" className="h-section">
            More free guides
          </h2>
          <div className="gd-grid">
            {g.others.map((o) => (
              <GuideCard key={o.slug} guide={o} from="more" />
            ))}
          </div>
        </section>
      ) : null}
      <p className="wrap gd-note">General educational guidance, not legal or professional advice. Adapt it to your business.</p>
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
