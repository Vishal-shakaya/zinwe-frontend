import { useCallback, useEffect, type ReactElement } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { GrowCard } from "../components/series/GrowCard";
import { noteSeriesVisit } from "../lib/attribution";
import { seriesVoice } from "../lib/seriesVoice";
import { usePageMeta } from "../hooks/usePageMeta";
import { pageTitle } from "../lib/pageTitle";
import { useResource } from "../dashboard/useResource";
import { LockIcon, MemberGate } from "../components/series/MemberGate";
import { ReaderPill } from "../components/series/ReaderPill";
import { EpisodeTile, UpcomingTile } from "../components/stories/EpisodeTile";
import { Rail } from "../components/stories/Rail";
import { NextUp, Play, SeriesHero } from "../components/stories/SeriesHero";
import { ApiError, errorMessage } from "../lib/api";
import { episodePath, getSeries, useReaderKey, type SeriesDetail } from "../lib/api/series";
import { accessOf, epNo, readRecent, soonestUpcoming } from "../lib/stories";
import "../styles/series.css";
import "../styles/site-stories.css";

/** Public /blog/series/:slug (v1.3.2): a members-only series as a show page: billboard, then one rail per season. */
export default function SeriesPage(): ReactElement {
  const { slug = "" } = useParams();
  const [key, setKey] = useReaderKey();
  const load = useCallback((signal: AbortSignal) => getSeries(slug, key, signal), [slug, key]);
  const res = useResource(load, { resetKey: `${slug}|${key}` });
  const show = res.data;
  const { search } = useLocation();
  useEffect(() => {
    if (show) noteSeriesVisit(seriesVoice(show.slug).campaign, null, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per series loaded
  }, [show?.slug]);

  usePageMeta({
    // The same title the backend pre-render gives this page (z_blog/prerender.py).
    title: show ? pageTitle(`${show.title}: a members-only series`) : pageTitle("Series"),
    description: show?.tagline || show?.description.slice(0, 160) || "A members-only series from Zinwe.",
  });

  if (res.error && !show) {
    const missing = res.error instanceof ApiError && res.error.kind === "not_found";
    return (
      <div className="zst-tv">
        <div className="zst-wrap zst-tv__top">
          <div className="zst-state">
            <b>{missing ? "This series isn't here" : "The series didn't load"}</b>
            <span>{missing ? "It may have moved." : errorMessage(res.error)}</span>
            <Link className="zst-btn zst-btn--ghost" to="/blog/series">
              All series
            </Link>
          </div>
        </div>
      </div>
    );
  }
  if (!show)
    return (
      <div className="zst-tv" aria-busy="true">
        <div className="zst-hero zst-hero--big zst-hero--skel" />
      </div>
    );

  return <SeriesView show={show} onForget={() => setKey("")} />;
}

function SeriesView({ show, onForget }: { show: SeriesDetail; onForget: () => void }): ReactElement {
  const member = !!show.reader;
  const voice = seriesVoice(show.slug);
  const first = show.episodes[0];
  const open = show.episodes.filter((e) => accessOf(e, member) === "open");
  const latestOpen = open[open.length - 1];
  // Where this browser left off in this series, if anywhere: the episode after it.
  const lastRead = readRecent().find((r) => r.series === show.slug);
  const after = lastRead ? show.episodes[show.episodes.findIndex((e) => e.slug === lastRead.slug) + 1] : undefined;
  const target = after && lastRead ? after : member && latestOpen ? latestOpen : first;
  const minutes = show.episodes.map((e) => e.reading_minutes);
  const [shortest, longest] = [Math.min(...minutes), Math.max(...minutes)];
  const next = soonestUpcoming(show.upcoming);

  const facts = [
    show.seasons.length > 1 ? `${show.seasons.length} seasons` : null,
    show.planned_episodes ? `${show.planned_episodes} episodes` : null,
    minutes.length ? `${shortest === longest ? shortest : `${shortest}–${longest}`} min each` : null,
    show.cadence || null,
  ].filter(Boolean);

  const seasons = show.seasons.length ? show.seasons : [{ number: 1, title: "", theme: "" }];

  return (
    <div className="zst-tv" data-series={show.slug}>
      <SeriesHero art={show.cover} artAlt="">
        <nav className="zst-crumbs" aria-label="Breadcrumb">
          <Link to="/blog">Blog</Link>
          <span aria-hidden="true">/</span>
          <Link to="/blog/series">Series</Link>
        </nav>
        <p className="zst-kicker">A Zinwe original · members' series</p>
        <h1 className="zst-hero__t zst-hero__t--show">{show.title}</h1>
        {show.tagline ? <p className="zst-hero__tag">{show.tagline}</p> : null}
        {facts.length ? (
          <p className="zst-hero__meta">
            {facts.map((f, i) => (
              <span key={i}>{f}</span>
            ))}
          </p>
        ) : null}
        {show.description ? <p className="zst-hero__desc">{show.description}</p> : null}
        <div className="zst-hero__ctas">
          {target ? (
            <Link className="zst-btn zst-btn--light" to={episodePath(show.slug, target.slug)}>
              <Play />{" "}
              {target === after && lastRead
                ? `Continue: ${epNo(target)}`
                : target === first
                  ? "Start with episode 1"
                  : `Read episode ${target.episode ?? ""}`.trim()}
            </Link>
          ) : null}
          {member ? null : (
            <a className="zst-btn zst-btn--glass" href="#join">
              <LockIcon /> Get free access
            </a>
          )}
        </div>
        {show.reader ? <ReaderPill reader={show.reader} onForget={onForget} /> : null}
        {show.reader?.drip && show.reader.progress ? (
          <p className="zst-hero__progress">
            Your episodes: <b>{show.reader.progress.unlocked}</b> of {show.reader.progress.released} open · the next one arrives by email
          </p>
        ) : null}
        {next ? <NextUp u={next} /> : null}
      </SeriesHero>

      <div className="zst-tv__rails">
        {seasons.map((s) => {
          const released = show.episodes.filter((e) => e.season === s.number);
          const upcoming = show.upcoming.filter((e) => e.season === s.number);
          return (
            <Rail
              key={s.number}
              title={
                <>
                  Season {s.number}
                  {s.title ? <span className="zst-rail__sub">{s.title}</span> : null}
                </>
              }
              note={s.theme || undefined}
            >
              {released.map((e) => (
                <EpisodeTile key={e.slug} seriesSlug={show.slug} e={e} member={member} />
              ))}
              {upcoming.map((u) => (
                <UpcomingTile key={u.slug} u={u} />
              ))}
              {released.length || upcoming.length ? null : (
                <li className="zst-tile zst-tile--empty">
                  <span>
                    <b>In the writers' room.</b> {member ? "Members get each episode by email the day it's out." : "Join free and each episode reaches your inbox the day it's out."}
                  </span>
                </li>
              )}
            </Rail>
          );
        })}
      </div>

      <section className="zst-wrap zst-perks" aria-label="What members get">
        {voice.perks.map((p) => (
          <div key={p.title}>
            <b>{p.title}</b>
            <span>{p.text}</span>
          </div>
        ))}
      </section>

      <div className="zst-wrap">
        <GrowCard seriesSlug={show.slug} seriesTitle={show.title} episode={null} reader={show.reader} />
      </div>

      {member ? null : (
        <div className="zst-wrap zst-tv__join" id="join">
          <MemberGate title={`Get ${show.title} in your inbox, free`} variant="band">
            <p className="sx-gate__lede">{voice.joinLede}</p>
          </MemberGate>
        </div>
      )}
      <p className="zst-wrap zst-tv__fine">{voice.disclaimer}</p>
    </div>
  );
}
