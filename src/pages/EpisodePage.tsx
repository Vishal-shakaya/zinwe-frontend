import { useCallback, useEffect, type ReactElement } from "react";
import { Link, useParams } from "react-router-dom";
import { usePageMeta } from "../hooks/usePageMeta";
import { useResource } from "../dashboard/useResource";
import { LockIcon, MemberGate } from "../components/series/MemberGate";
import { ReaderPill } from "../components/series/ReaderPill";
import { PlayIcon } from "./SeriesPage";
import { ApiError, errorMessage } from "../lib/api";
import { blogAsset, withAssetBase } from "../lib/api/blog";
import {
  episodeCode,
  episodePath,
  fileKind,
  fileSize,
  getEpisode,
  useReaderKey,
  type Episode,
  type EpisodeCard,
} from "../lib/api/series";
import { formatDate } from "../lib/format";
import "../styles/series.css";

const SITE = "https://zinwe.io";

/** schema.org: a members-only article (the opening is free; `.ep-members` isn't), part of its series. */
function useEpisodeHead(ep: Episode | undefined): void {
  useEffect(() => {
    if (!ep) return;
    const url = `${SITE}${episodePath(ep.series.slug, ep.slug)}`;
    const cover = ep.cover ?? ep.series.cover;
    const image = cover ? new URL(blogAsset(cover.url), window.location.origin).href : undefined;
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: ep.seo_title,
      description: ep.meta_description,
      datePublished: ep.published_at,
      dateModified: ep.updated_at,
      author: { "@type": "Organization", name: "Zinwe" },
      publisher: { "@type": "Organization", name: "Zinwe", logo: { "@type": "ImageObject", url: `${SITE}/brand/zinwe-logo-96.png` } },
      mainEntityOfPage: url,
      isPartOf: { "@type": "CreativeWorkSeries", name: ep.series.title, url: `${SITE}/blog/series/${ep.series.slug}` },
      ...(image ? { image } : {}),
      isAccessibleForFree: ep.free_preview,
      ...(ep.free_preview ? {} : { hasPart: { "@type": "WebPageElement", isAccessibleForFree: false, cssSelector: ".ep-members" } }),
    });
    document.head.appendChild(ld);
    return () => ld.remove();
  }, [ep]);
}

/** Public /blog/series/:slug/:episode: the opening for everyone, the full case file for members. */
export default function EpisodePage(): ReactElement {
  const { slug = "", episode = "" } = useParams();
  const [key, setKey] = useReaderKey();
  const load = useCallback((signal: AbortSignal) => getEpisode(slug, episode, key, signal), [slug, episode, key]);
  const res = useResource(load, { resetKey: `${slug}|${episode}|${key}` });
  const ep = res.data;

  usePageMeta({
    title: ep ? `${ep.seo_title} — ${ep.series.title}` : "Series — Zinwe",
    description: ep?.meta_description || "A members-only episode from a Zinwe series.",
  });
  useEpisodeHead(ep);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [slug, episode]);

  if (res.error && !ep) {
    const missing = res.error instanceof ApiError && res.error.kind === "not_found";
    return (
      <div className="wrap blog-empty blog-empty--page">
        <b>{missing ? "This episode isn't here" : "The episode didn't load"}</b>
        <span>{missing ? "It may not be out yet." : errorMessage(res.error)}</span>
        <Link className="btn btn--ghost" to={`/blog/series/${slug}`}>
          All episodes
        </Link>
      </div>
    );
  }
  if (!ep) return <div className="sx sx--loading" aria-busy="true" />;

  const cover = ep.cover ?? ep.series.cover;
  const seasonLine = ep.season_info?.title ? `Season ${ep.season}: ${ep.season_info.title}` : `Season ${ep.season}`;
  const keyQuery = key ? `?k=${encodeURIComponent(key)}` : "";

  return (
    <article className="sx sx-ep">
      <header className="sx-hero sx-hero--ep">
        {cover ? <img className="sx-hero__art" src={blogAsset(cover.url)} alt="" fetchPriority="high" /> : null}
        <div className="sx-hero__shade" aria-hidden="true" />
        <div className="wrap sx-hero__inner">
          <nav className="sx-crumbs" aria-label="Breadcrumb">
            <Link to="/blog">Blog</Link>
            <span aria-hidden="true">/</span>
            <Link to={`/blog/series/${ep.series.slug}`}>{ep.series.title}</Link>
          </nav>
          <p className="sx-eyebrow">
            {ep.label}
            {ep.planned_episodes ? ` / ${ep.planned_episodes}` : ""}
          </p>
          <h1 className="sx-hero__title sx-hero__title--ep">{ep.title}</h1>
          {ep.summary ? <p className="sx-hero__tagline">{ep.summary}</p> : null}
          <p className="sx-facts">
            <span>{seasonLine}</span>
            <span>{ep.reading_minutes} min read</span>
            <span>{formatDate(ep.published_at)}</span>
            {ep.attachments.length ? <span>{ep.attachments.length === 1 ? "1 download" : `${ep.attachments.length} downloads`}</span> : null}
          </p>
          {ep.reader ? <ReaderPill reader={ep.reader} onForget={() => setKey("")} /> : null}
        </div>
      </header>

      <div className="sx-paper">
        <div className="sx-read">
          <div className="sx-body" dangerouslySetInnerHTML={{ __html: withAssetBase(ep.teaser_html) }} />

          {ep.locked ? (
            <div className="ep-members sx-locked">
              <div className="sx-locked__fade" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </div>
              <MemberGate title="The rest of this case file is for members">
                <ul className="sx-inside">
                  <li>The full story, to the last scene</li>
                  <li>The lesson, in plain English</li>
                  <li>Your 10-minute challenge</li>
                  {ep.attachments.map((f) => (
                    <li key={f.title}>
                      <LockIcon /> {f.title} <small>({fileKind(f.content_type)}, {fileSize(f.size)})</small>
                    </li>
                  ))}
                </ul>
              </MemberGate>
            </div>
          ) : (
            <div className="ep-members">
              <div className="sx-body" dangerouslySetInnerHTML={{ __html: withAssetBase(ep.body_html) }} />
              {ep.attachments.length ? (
                <section className="sx-files" aria-labelledby="files-title">
                  <h2 id="files-title">Case file downloads</h2>
                  <ul>
                    {ep.attachments.map((f) => (
                      <li key={f.url}>
                        <a href={`${blogAsset(f.url ?? "")}${keyQuery}`} download={f.filename}>
                          <span className="sx-files__kind">{fileKind(f.content_type)}</span>
                          <span className="sx-files__name">
                            <b>{f.title}</b>
                            <small>{fileSize(f.size)}</small>
                          </span>
                          <span className="sx-files__get">Download</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                  <p className="sx-files__note">For you and your team. Please don't post them publicly.</p>
                </section>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <nav className="wrap sx-nextprev" aria-label="More episodes">
        {ep.previous ? <NeighbourCard seriesSlug={ep.series.slug} episode={ep.previous} label="Previous episode" /> : <span />}
        {ep.next ? (
          <NeighbourCard seriesSlug={ep.series.slug} episode={ep.next} label="Next episode" />
        ) : ep.next_upcoming ? (
          <div className="sx-next sx-next--soon">
            <small>Next episode · {formatDate(ep.next_upcoming.published_at)}</small>
            <b>{ep.next_upcoming.title}</b>
            <span>{ep.reader ? "It comes to your inbox the day it's out." : "Members get it by email the day it's out."}</span>
          </div>
        ) : (
          <span />
        )}
      </nav>
      <p className="wrap sx-back">
        <Link to={`/blog/series/${ep.series.slug}`}>← All episodes of {ep.series.title}</Link>
      </p>
      <p className="wrap sx-disclaimer">The companies and people in our series are fictional. The mistakes are common, and the lessons are real.</p>
    </article>
  );
}

function NeighbourCard({ seriesSlug, episode: e, label }: { seriesSlug: string; episode: EpisodeCard; label: string }): ReactElement {
  return (
    <Link className="sx-next" to={episodePath(seriesSlug, e.slug)}>
      <small>
        {label} · {episodeCode(e)}
      </small>
      <b>{e.title}</b>
      <span>
        <PlayIcon /> {e.reading_minutes} min read
      </span>
    </Link>
  );
}
