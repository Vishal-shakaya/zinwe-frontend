import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { GrowCard } from "../components/series/GrowCard";
import { noteSeriesVisit } from "../lib/attribution";
import { usePageMeta } from "../hooks/usePageMeta";
import { useResource } from "../dashboard/useResource";
import { LockIcon, MemberGate } from "../components/series/MemberGate";
import { ReaderPill } from "../components/series/ReaderPill";
import { ApiError, errorMessage } from "../lib/api";
import { blogAsset } from "../lib/api/blog";
import { episodeCode, episodePath, getSeries, useReaderKey, type EpisodeCard, type SeriesDetail } from "../lib/api/series";
import { formatDate } from "../lib/format";
import { cx } from "../lib/cx";
import "../styles/series.css";

/** Public /blog/series/:slug: a members-only series, Netflix-style: hero, seasons, episodes. */
export default function SeriesPage(): ReactElement {
  const { slug = "" } = useParams();
  const [key, setKey] = useReaderKey();
  const load = useCallback((signal: AbortSignal) => getSeries(slug, key, signal), [slug, key]);
  const res = useResource(load, { resetKey: `${slug}|${key}` });
  const show = res.data;
  const { search } = useLocation();
  useEffect(() => {
    if (show) noteSeriesVisit(null, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per series loaded
  }, [show?.slug]);

  usePageMeta({
    title: show ? `${show.title} — a Zinwe series` : "Series — Zinwe",
    description: show?.tagline || show?.description.slice(0, 160) || "A members-only series from Zinwe.",
  });

  if (res.error && !show) {
    const missing = res.error instanceof ApiError && res.error.kind === "not_found";
    return (
      <div className="wrap blog-empty blog-empty--page">
        <b>{missing ? "This series isn't here" : "The series didn't load"}</b>
        <span>{missing ? "It may have moved." : errorMessage(res.error)}</span>
        <Link className="btn btn--ghost" to="/blog/series">
          All series
        </Link>
      </div>
    );
  }
  if (!show) return <div className="sx sx--loading" aria-busy="true" />;

  return <SeriesView show={show} onForget={() => setKey("")} />;
}

function SeriesView({ show, onForget }: { show: SeriesDetail; onForget: () => void }): ReactElement {
  const member = !!show.reader;
  const first = show.episodes[0];
  const latest = show.episodes[show.episodes.length - 1];
  const seasonsWithWork = useMemo(
    () => new Set([...show.episodes, ...show.upcoming].map((e) => e.season)),
    [show.episodes, show.upcoming],
  );
  const [season, setSeason] = useState(() => latest?.season ?? show.seasons[0]?.number ?? 1);
  const current = show.seasons.find((s) => s.number === season);
  const released = show.episodes.filter((e) => e.season === season);
  const upcoming = show.upcoming.filter((e) => e.season === season);
  const minutes = show.episodes.map((e) => e.reading_minutes);
  const [shortest, longest] = [Math.min(...minutes), Math.max(...minutes)];

  const facts = [
    show.seasons.length > 1 ? `${show.seasons.length} seasons` : null,
    show.planned_episodes ? `${show.planned_episodes} episodes` : null,
    minutes.length ? `${shortest === longest ? shortest : `${shortest}–${longest}`} min each` : null,
    show.cadence || null,
  ].filter(Boolean);

  return (
    <div className="sx">
      <header className="sx-hero">
        {show.cover ? <img className="sx-hero__art" src={blogAsset(show.cover.url)} alt="" fetchPriority="high" /> : null}
        <div className="sx-hero__shade" aria-hidden="true" />
        <div className="wrap sx-hero__inner">
          <nav className="sx-crumbs" aria-label="Breadcrumb">
            <Link to="/blog">Blog</Link>
            <span aria-hidden="true">/</span>
            <Link to="/blog/series">Series</Link>
          </nav>
          <p className="sx-eyebrow">A Zinwe original · members' series</p>
          <h1 className="sx-hero__title">{show.title}</h1>
          {show.tagline ? <p className="sx-hero__tagline">{show.tagline}</p> : null}
          {facts.length ? (
            <p className="sx-facts">
              {facts.map((f, i) => (
                <span key={i}>{f}</span>
              ))}
            </p>
          ) : null}
          {show.description ? <p className="sx-hero__desc">{show.description}</p> : null}
          <div className="sx-hero__ctas">
            {first ? (
              <Link className="sx-btn sx-btn--light" to={episodePath(show.slug, (member ? latest : first).slug)}>
                <PlayIcon /> {member ? (latest === first ? "Read episode 1" : "Read the latest episode") : "Start with episode 1"}
              </Link>
            ) : null}
            {member ? null : (
              <a className="sx-btn sx-btn--glass" href="#join">
                <LockIcon /> Get free access
              </a>
            )}
          </div>
          {show.reader ? <ReaderPill reader={show.reader} onForget={onForget} /> : null}
          {show.reader?.drip && show.reader.progress ? (
            <p className="sx-progress">
              Your episodes: <b>{show.reader.progress.unlocked}</b> of {show.reader.progress.released} open · the next one arrives
              by email
            </p>
          ) : null}
        </div>
      </header>

      <section className="wrap sx-episodes" aria-labelledby="episodes-title">
        <div className="sx-episodes__head">
          <h2 id="episodes-title">Episodes</h2>
          {show.seasons.length > 1 ? (
            <div className="sx-seasons" role="tablist" aria-label="Seasons">
              {show.seasons.map((s) => (
                <button
                  key={s.number}
                  type="button"
                  role="tab"
                  aria-selected={season === s.number}
                  className={cx("sx-season", season === s.number && "is-on", !seasonsWithWork.has(s.number) && "is-soon")}
                  onClick={() => setSeason(s.number)}
                >
                  Season {s.number}
                  {s.title ? <small>{s.title}</small> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        {current?.title || current?.theme ? (
          <p className="sx-season-note">
            <b>
              Season {current.number}
              {current.title ? `: ${current.title}` : ""}
            </b>
            {current.theme ? <span> · {current.theme}</span> : null}
          </p>
        ) : null}

        {released.length || upcoming.length ? (
          <ol className="sx-list">
            {released.map((e) => (
              <EpisodeRow key={e.slug} seriesSlug={show.slug} episode={e} member={member} />
            ))}
            {upcoming.map((e) => (
              <li key={e.slug} className="sx-row is-upcoming">
                <span className="sx-row__num">{e.episode ?? "·"}</span>
                <div className="sx-row__thumb sx-row__thumb--soon" aria-hidden="true">
                  <span>Soon</span>
                </div>
                <div className="sx-row__body">
                  <h3>{e.title}</h3>
                  <p className="sx-row__meta">Arrives {formatDate(e.published_at)}</p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="sx-soon">
            <b>Season {season} is in the writers' room.</b>
            <span>{member ? "Members get each episode by email the day it's out." : "Join free and each episode reaches your inbox the day it's out."}</span>
          </div>
        )}
      </section>

      <section className="wrap sx-perks" aria-label="What members get">
        <div>
          <b>The full case file</b>
          <span>Every episode in full: the story, what went wrong, and the plain-English lesson.</span>
        </div>
        <div>
          <b>A 10-minute fix</b>
          <span>One practical step per episode that a small team can do today, with no IT department.</span>
        </div>
        <div>
          <b>Downloads to keep</b>
          <span>Many episodes come with case-file PDFs and checklists, for you and your team.</span>
        </div>
      </section>

      <div className="wrap">
        <GrowCard seriesSlug={show.slug} seriesTitle={show.title} episode={null} reader={show.reader} />
      </div>

      {member ? null : (
        <div className="wrap" id="join">
          <MemberGate title={`Get ${show.title} in your inbox, free`} variant="band">
            <p className="sx-gate__lede">
              Membership is free. Episode 1 arrives the moment you confirm, then one episode a morning, four days a week, in order.
              Every released episode stays open to you here, on any device you open your link on.
            </p>
          </MemberGate>
        </div>
      )}
      <p className="wrap sx-disclaimer">The companies and people in our series are fictional. The mistakes are common, and the lessons are real.</p>
    </div>
  );
}

function EpisodeRow({ seriesSlug, episode: e, member }: { seriesSlug: string; episode: EpisodeCard; member: boolean }): ReactElement {
  const open = e.free_preview || (member && e.unlocked !== false);
  return (
    <li className="sx-row">
      <Link to={episodePath(seriesSlug, e.slug)} className="sx-row__link">
        <span className="sx-row__num">{e.episode ?? "·"}</span>
        <div className="sx-row__thumb">
          {e.cover ? <img src={blogAsset(e.cover.url)} alt={e.cover_alt} loading="lazy" decoding="async" /> : <span>{episodeCode(e)}</span>}
          <span className="sx-row__play" aria-hidden="true">
            <PlayIcon />
          </span>
        </div>
        <div className="sx-row__body">
          <h3>{e.title}</h3>
          {e.summary ? <p>{e.summary}</p> : null}
          <p className="sx-row__meta">
            <span>{e.reading_minutes} min read</span>
            {e.files ? <span>{e.files === 1 ? "1 download" : `${e.files} downloads`}</span> : null}
            <span>{formatDate(e.published_at)}</span>
            {e.free_preview ? (
              <span className="sx-chip sx-chip--free">Free episode</span>
            ) : open ? null : member ? (
              <span className="sx-chip sx-chip--soon">
                <LockIcon /> {e.unlocks_on ? `Opens ${formatDate(e.unlocks_on)}` : "Opens with a coming email"}
              </span>
            ) : (
              <span className="sx-chip">
                <LockIcon /> Members
              </span>
            )}
          </p>
        </div>
      </Link>
    </li>
  );
}

export function PlayIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path fill="currentColor" d="M4 2.8v10.4a.8.8 0 0 0 1.2.7l8.4-5.2a.8.8 0 0 0 0-1.4L5.2 2.1A.8.8 0 0 0 4 2.8Z" />
    </svg>
  );
}
