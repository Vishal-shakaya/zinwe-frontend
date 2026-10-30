import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { FamilyShare } from "../components/series/FamilyShare";
import { GrowCard } from "../components/series/GrowCard";
import { GuidePickCard } from "../components/guides/GuideCard";
import "../styles/guides.css";
import { trackEvent } from "../lib/analytics";
import { fromEmail, noteSeriesVisit } from "../lib/attribution";
import { usePageMeta } from "../hooks/usePageMeta";
import { pageTitle } from "../lib/pageTitle";
import { useResource } from "../dashboard/useResource";
import { LockIcon, MemberGate } from "../components/series/MemberGate";
import { ReaderPill } from "../components/series/ReaderPill";
import { EpisodeTile } from "../components/stories/EpisodeTile";
import { ReadingProgress } from "../components/stories/ReadingProgress";
import { Rail } from "../components/stories/Rail";
import { NextUp, Play, SeriesHero } from "../components/stories/SeriesHero";
import { ApiError, errorMessage } from "../lib/api";
import { blogAsset, withAssetBase } from "../lib/api/blog";
import {
  episodePath,
  fileKind,
  fileSize,
  getEpisode,
  getSeries,
  useReaderKey,
  type Episode,
  type EpisodeCard,
} from "../lib/api/series";
import { formatDate } from "../lib/format";
import { seriesVoice } from "../lib/seriesVoice";
import { accessOf, dayText, epNo, noteRecent } from "../lib/stories";
import "../styles/series.css";
import "../styles/site-stories.css";

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

/**
 * Public /blog/series/:slug/:episode (v1.3.2): the episode reader, dark like the rest of the series, with a calm
 * reading column (~64 characters), a reading-progress hint, the opening for everyone and the full episode for
 * members (gating unchanged: the API decides), then "Up next" with its hook line and the rest of the series in a rail.
 */
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
  const readRef = useRef<HTMLDivElement>(null);
  // The rest of the series, for the "More from" rail (the same reader key, so access shows right).
  const loadLineup = useCallback((signal: AbortSignal) => getSeries(slug, key, signal), [slug, key]);
  const lineup = useResource(loadLineup, { resetKey: `${slug}|${key}` });

  // Attribution (a later Zinwe sign-up is credited to this episode) and what the visitor saw.
  useEffect(() => {
    if (!ep) return;
    const code = seriesVoice(ep.series.slug).campaign;
    noteSeriesVisit(code, ep.episode, search);
    if (ep.locked && !ep.reader) trackEvent("view_promotion", { promotion_name: `${code}_members_gate`, item_id: ep.episode ?? 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per episode loaded
  }, [ep?.slug, ep?.locked]);

  // "Continue reading" on the series pages: this browser remembers the episodes it opened (nothing is sent anywhere).
  useEffect(() => {
    if (!ep) return;
    noteRecent({
      series: ep.series.slug,
      seriesTitle: ep.series.title,
      slug: ep.slug,
      title: ep.title,
      season: ep.season,
      episode: ep.episode,
      minutes: ep.reading_minutes,
      cover: (ep.cover ?? ep.series.cover)?.url ?? null,
    });
  }, [ep]);

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
    // The API's page_title, else the backend's rule: "<episode> | <series> | Zinwe", shortened past 60 characters.
    title: ep ? ep.page_title || pageTitle(ep.seo_title || ep.title, ep.series.title) : pageTitle("Series"),
    description: ep?.meta_description || "A members-only episode from a Zinwe series.",
  });
  useEpisodeHead(ep);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [slug, episode]);

  if (res.error && !ep) {
    const missing = res.error instanceof ApiError && res.error.kind === "not_found";
    return (
      <div className="zst-tv">
        <div className="zst-wrap zst-tv__top">
          <div className="zst-state">
            <b>{missing ? "This episode isn't here" : "The episode didn't load"}</b>
            <span>{missing ? "It may not be out yet." : errorMessage(res.error)}</span>
            <Link className="zst-btn zst-btn--ghost" to={`/blog/series/${slug}`}>
              All episodes
            </Link>
          </div>
        </div>
      </div>
    );
  }
  if (!ep)
    return (
      <div className="zst-tv" aria-busy="true">
        <div className="zst-hero zst-hero--ep zst-hero--skel" />
      </div>
    );

  // The series art behind the title (episode covers carry their own big words); the episode art shows in rails and Up next.
  const cover = ep.series.cover ?? ep.cover;
  const seasonLine = ep.season_info?.title ? `Season ${ep.season}: ${ep.season_info.title}` : `Season ${ep.season}`;
  const keyQuery = key ? `?k=${encodeURIComponent(key)}` : "";
  const voice = seriesVoice(ep.series.slug);
  const member = !!ep.reader;
  const more = (lineup.data?.episodes ?? []).filter((e) => e.slug !== ep.slug);

  return (
    <article className="zst-tv zst-ep" data-series={ep.series.slug}>
      <ReadingProgress target={readRef} tone="dark" />
      <SeriesHero art={cover} size="ep">
        <nav className="zst-crumbs" aria-label="Breadcrumb">
          <Link to="/blog">Blog</Link>
          <span aria-hidden="true">/</span>
          <Link to={`/blog/series/${ep.series.slug}`}>{ep.series.title}</Link>
        </nav>
        <p className="zst-kicker">
          {ep.label}
          {ep.planned_episodes ? ` / ${ep.planned_episodes}` : ""}
        </p>
        <h1 className="zst-hero__t zst-hero__t--ep">{ep.title}</h1>
        {ep.summary ? <p className="zst-hero__hook">{ep.summary}</p> : null}
        <p className="zst-hero__meta">
          <span>{seasonLine}</span>
          <span>{ep.reading_minutes} min read</span>
          <span>{formatDate(ep.published_at)}</span>
          {ep.attachments.length ? <span>{ep.attachments.length === 1 ? "1 download" : `${ep.attachments.length} downloads`}</span> : null}
          {ep.free_preview ? <span className="zst-badge zst-badge--free">Free episode</span> : null}
        </p>
        {ep.reader ? <ReaderPill reader={ep.reader} onForget={() => setKey("")} /> : null}
      </SeriesHero>

      <div className="zst-reader" ref={readRef}>
        <div className="zst-ep-body" dangerouslySetInnerHTML={{ __html: withAssetBase(ep.teaser_html) }} />

        {ep.member_locked ? (
          <div className="ep-members zst-locked">
            <div className="zst-locked__fade" aria-hidden="true">
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
          <div className="ep-members zst-locked">
            <div className="zst-locked__fade" aria-hidden="true">
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
            <div className="zst-ep-body" dangerouslySetInnerHTML={{ __html: withAssetBase(ep.body_html) }} />
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
                <p className="sx-files__note">{voice.filesNote ?? "For you and your team. Please don't post them publicly."}</p>
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

      {/* Up next: the following episode, big, with its own hook line; or the next one on the release schedule. */}
      {ep.next ? (
        <UpNext seriesSlug={ep.series.slug} e={lineup.data?.episodes.find((e) => e.slug === ep.next?.slug) ?? ep.next} member={member} />
      ) : ep.next_upcoming ? (
        <section className="zst-wrap zst-upnext zst-upnext--soon" aria-label="Next episode">
          <span className="zst-kicker">Next episode · {epNo(ep.next_upcoming)}</span>
          <b className="zst-upnext__t">{ep.next_upcoming.title}</b>
          <NextUp u={ep.next_upcoming} label={ep.reader ? "It comes to your inbox" : "Members get it by email"} />
        </section>
      ) : null}

      {more.length ? (
        <div className="zst-tv__rails">
          <Rail title={`More from ${ep.series.title}`} more={{ to: `/blog/series/${ep.series.slug}`, label: "All episodes" }}>
            {more.map((e) => (
              <EpisodeTile key={e.slug} seriesSlug={ep.series.slug} e={e} member={!!lineup.data?.reader} />
            ))}
          </Rail>
        </div>
      ) : null}

      <div className="zst-wrap zst-ep__after">
        {voice.familyCards && ep.episode ? <FamilyShare episode={ep.episode} /> : null}
        {ep.guide_pick ? (
          <div className="sx-guide-pick">
            <p>Go deeper on this topic</p>
            <GuidePickCard guide={ep.guide_pick} dark />
          </div>
        ) : null}
        <GrowCard seriesSlug={ep.series.slug} seriesTitle={ep.series.title} episode={ep.episode} reader={ep.reader} />
      </div>

      <nav className="zst-wrap zst-ep__nav" aria-label="More episodes">
        {ep.previous ? (
          <Link to={episodePath(ep.series.slug, ep.previous.slug)}>
            ← {epNo(ep.previous)} · {ep.previous.title}
          </Link>
        ) : (
          <span />
        )}
        <Link to={`/blog/series/${ep.series.slug}`}>All episodes of {ep.series.title}</Link>
      </nav>
      <p className="zst-wrap zst-tv__fine">{voice.disclaimer}</p>
    </article>
  );
}

/** The next episode, big: its art, its hook line, and honestly whether it's open to this reader. */
function UpNext({ seriesSlug, e, member }: { seriesSlug: string; e: EpisodeCard; member: boolean }): ReactElement {
  // The neighbour card carries no per-member state; until the lineup has loaded, a member's next one says only "Next".
  const a = member && e.unlocked === undefined ? "unknown" : accessOf(e, member);
  return (
    <section className="zst-wrap zst-upnext" aria-label="Up next">
      <Link className="zst-upnext__link" to={episodePath(seriesSlug, e.slug)}>
        <span className="zst-upnext__art">
          {e.cover ? <img src={blogAsset(e.cover.url)} alt="" width={1200} height={630} loading="lazy" decoding="async" /> : null}
        </span>
        <span className="zst-upnext__body">
          <span className="zst-kicker">
            Up next · {epNo(e)} · {e.reading_minutes} min
          </span>
          <b className="zst-upnext__t">{e.title}</b>
          {e.summary ? <span className="zst-upnext__hook">{e.summary}</span> : null}
          <span className="zst-upnext__go">
            {a === "unknown" ? (
              <>
                <Play /> Next episode
              </>
            ) : a === "free" || a === "open" ? (
              <>
                <Play /> Read it now
              </>
            ) : a === "waiting" ? (
              <>
                <LockIcon /> {e.unlocks_on ? `Opens ${dayText(e.unlocks_on)} with your email` : "Opens with a coming email"}
              </>
            ) : (
              <>
                <LockIcon /> Read the opening · members read on, free
              </>
            )}
          </span>
        </span>
      </Link>
    </section>
  );
}

/** "Friday" from an ISO date (the reader's local date, from the server). */
function weekday(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long" });
}
