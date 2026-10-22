import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { GrowCard } from "../components/series/GrowCard";
import { trackEvent } from "../lib/analytics";
import { fromEmail, noteSeriesVisit } from "../lib/attribution";
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
import { seriesVoice } from "../lib/seriesVoice";
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

/** Public /blog/series/:slug/:episode: the opening for everyone, the full episode for members. */
export default function EpisodePage(): ReactElement {
  const { slug = "", episode = "" } = useParams();
  const { search } = useLocation();
  const [key, setKey] = useReaderKey();
  // Opened from an episode email (utm_medium=email): the API counts the read as an email read. Read once.
  const [viaEmail] = useState(() => fromEmail(search));
  const load = useCallback(
    (signal: AbortSignal) => getEpisode(slug, episode, key, signal, viaEmail),
    [slug, episode, key, viaEmail],
  );
  const res = useResource(load, { resetKey: `${slug}|${episode}|${key}` });
  const ep = res.data;
  const endRef = useRef<HTMLDivElement>(null);

  // Attribution (a later Zinwe sign-up is credited to this episode) and what the visitor saw.
  useEffect(() => {
    if (!ep) return;
    const code = seriesVoice(ep.series.slug).campaign;
    noteSeriesVisit(code, ep.episode, search);
    if (ep.locked && !ep.reader) trackEvent("view_promotion", { promotion_name: `${code}_members_gate`, item_id: ep.episode ?? 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per episode loaded
  }, [ep?.slug, ep?.locked]);

  // Read to the end: the last paragraph of the full episode came into view.
  useEffect(() => {
    if (!ep || ep.locked || !endRef.current) return;
    const seen = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        trackEvent(`${seriesVoice(ep.series.slug).campaign}_read_end`, { item_id: ep.episode ?? 0, member: !!ep.reader });
        seen.disconnect();
      }
    });
    seen.observe(endRef.current);
    return () => seen.disconnect();
  }, [ep]);

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
  const voice = seriesVoice(ep.series.slug);

  return (
    <article className="sx sx-ep" data-series={ep.series.slug}>
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

          {ep.member_locked ? (
            <div className="ep-members sx-locked">
              <div className="sx-locked__fade" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </div>
              <section className="sx-gate sx-gate--panel">
                <p className="sx-gate__badge">
                  <LockIcon /> Coming to your inbox
                </p>
                <h2 className="sx-gate__title">
                  This episode opens with your {ep.unlocks_on ? `${weekday(ep.unlocks_on)} morning` : "next"} email
                </h2>
                <p className="sx-gate__lede">
                  Members get {voice.pace}, in order.
                  {ep.reader?.progress ? ` You have ${ep.reader.progress.unlocked} of ${ep.reader.progress.released} so far.` : ""} Your
                  next episode arrives by email, and opens here the same morning.
                </p>
                <Link className="sx-btn sx-btn--red" to={`/blog/series/${ep.series.slug}`}>
                  Your episodes
                </Link>
              </section>
            </div>
          ) : ep.locked ? (
            <div className="ep-members sx-locked">
              <div className="sx-locked__fade" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </div>
              <MemberGate title={`The rest of this ${voice.unit} is for members`}>
                <ul className="sx-inside">
                  {voice.inside.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
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
              <div ref={endRef} aria-hidden="true" />
              {ep.attachments.length ? (
                <section className="sx-files" aria-labelledby="files-title">
                  <h2 id="files-title">{voice.filesTitle}</h2>
                  <ul>
                    {ep.attachments.map((f) => (
                      <li key={f.url}>
                        <a
                          href={`${blogAsset(f.url ?? "")}${keyQuery}`}
                          download={f.filename}
                          onClick={() => trackEvent("file_download", { file_name: f.filename ?? "", item_id: ep.episode ?? 0 })}
                        >
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
              {ep.free_preview && !ep.reader ? (
                <MemberGate title={ep.next ? `Get Episode ${ep.next.episode} and the rest of the series, free` : "Get the whole series, free"}>
                  <p className="sx-gate__lede">{voice.freeLede}</p>
                </MemberGate>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className="wrap">
        <GrowCard seriesSlug={ep.series.slug} seriesTitle={ep.series.title} episode={ep.episode} reader={ep.reader} />
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
      <p className="wrap sx-disclaimer">{voice.disclaimer}</p>
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

/** "Friday" from an ISO date (the reader's local date, from the server). */
function weekday(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long" });
}
