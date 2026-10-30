import { useCallback, useMemo, useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { seoFor } from "../content/seo";
import { usePageMeta } from "../hooks/usePageMeta";
import { useResource } from "../dashboard/useResource";
import { LockIcon, MemberGate } from "../components/series/MemberGate";
import { ReaderPill } from "../components/series/ReaderPill";
import { EpisodeTile, RecentTile, UpcomingTile } from "../components/stories/EpisodeTile";
import { Rail } from "../components/stories/Rail";
import { NextUp, Play, SeriesHero } from "../components/stories/SeriesHero";
import { errorMessage } from "../lib/api";
import { blogAsset } from "../lib/api/blog";
import { episodePath, getSeries, getSeriesList, useReaderKey, type EpisodeCard, type SeriesCard, type SeriesDetail } from "../lib/api/series";
import { accessOf, epNo, isNew, readRecent, soonestUpcoming } from "../lib/stories";
import "../styles/series.css";
import "../styles/site-stories.css";

interface Show {
  card: SeriesCard;
  /** The full lineup (null if it didn't load: the show still gets its poster). */
  detail: SeriesDetail | null;
}

/**
 * Public /blog/series (v1.3.2): the members' series as a streaming shelf. A small title, a cinematic billboard for
 * the episode to read now (Episode 1 for a visitor, the latest open one for a member, the next one after what this
 * browser read last), then rails: Continue, New this week, one per series (released, then scheduled), the shows.
 * Access is shown as it is: free episode, members, or (for a member) the day the drip opens it. Membership is free.
 */
export default function SeriesHubPage(): ReactElement {
  usePageMeta(seoFor("/blog/series"));
  const [key, setKey] = useReaderKey();
  const load = useCallback(
    async (signal: AbortSignal): Promise<Show[]> => {
      const list = await getSeriesList(signal);
      return Promise.all(
        list.results.map(async (card) => ({ card, detail: await getSeries(card.slug, key, signal).catch(() => null) })),
      );
    },
    [key],
  );
  const res = useResource(load, { resetKey: key });
  const shows = res.data;
  const [recent] = useState(readRecent);

  return (
    <div className="zst-tv">
      <div className="zst-wrap zst-tv__top">
        <nav className="zst-crumbs" aria-label="Breadcrumb">
          <Link to="/blog">Blog</Link>
          <span aria-hidden="true">/</span>
          <span>Series</span>
        </nav>
        <h1 className="zst-tv__h1">Stories, not lectures</h1>
        <p className="zst-tv__lede">
          Members-only series for business owners, their teams and their families: short episodes about company data, people's
          identities and children growing up online, each with a 10-minute fix. Membership is free.
        </p>
      </div>

      {res.error && !shows ? (
        <div className="zst-wrap">
          <div className="zst-state">
            <b>The series didn't load</b>
            <span>{errorMessage(res.error)}</span>
            <button type="button" className="zst-btn zst-btn--ghost" onClick={res.reload}>
              Try again
            </button>
          </div>
        </div>
      ) : !shows ? (
        <HubSkeleton />
      ) : shows.length === 0 ? (
        <div className="zst-wrap">
          <div className="zst-state">
            <b>The first series is on its way</b>
            <span>Check back soon.</span>
          </div>
        </div>
      ) : (
        <Shelf shows={shows} recent={recent} onForget={() => setKey("")} />
      )}
    </div>
  );
}

function Shelf({ shows, recent, onForget }: { shows: Show[]; recent: ReturnType<typeof readRecent>; onForget: () => void }): ReactElement {
  const reader = shows.find((s) => s.detail?.reader)?.detail?.reader ?? null;
  const member = !!reader;
  const pick = useMemo(() => billboard(shows, recent, member), [shows, recent, member]);
  const fresh = useMemo(
    () =>
      shows
        .flatMap((s) => (s.detail?.episodes ?? []).filter((e) => isNew(e.published_at)).map((e) => ({ s, e })))
        .sort((a, b) => b.e.published_at.localeCompare(a.e.published_at)),
    [shows],
  );
  const known = new Set(shows.map((s) => s.card.slug));
  const cont = recent.filter((r) => known.has(r.series));

  return (
    <>
      {pick ? <Billboard pick={pick} member={member} /> : null}
      {reader ? (
        <div className="zst-wrap zst-tv__reader">
          <ReaderPill reader={reader} onForget={onForget} />
        </div>
      ) : null}

      <div className="zst-tv__rails">
        {cont.length ? (
          <Rail title="Continue reading" note="Episodes you opened in this browser">
            {cont.map((r) => (
              <RecentTile key={`${r.series}/${r.slug}`} r={r} />
            ))}
          </Rail>
        ) : null}

        {fresh.length ? (
          <Rail title="New this week">
            {fresh.map(({ s, e }) => (
              <EpisodeTile key={`${s.card.slug}/${e.slug}`} seriesSlug={s.card.slug} seriesTitle={s.card.title} e={e} member={member} />
            ))}
          </Rail>
        ) : null}

        {shows.map((s) => {
          const eps = s.detail?.episodes ?? [];
          const soon = (s.detail?.upcoming ?? []).slice(0, 4);
          if (!eps.length && !soon.length) return null;
          const out = s.card.released ?? eps.length;
          return (
            <Rail
              key={s.card.slug}
              title={s.card.title}
              note={`${out} of ${s.card.planned_episodes} episodes out${s.card.cadence ? ` · ${s.card.cadence}` : ""}`}
              more={{ to: `/blog/series/${s.card.slug}`, label: "All episodes" }}
            >
              {eps.map((e) => (
                <EpisodeTile key={e.slug} seriesSlug={s.card.slug} e={e} member={member} />
              ))}
              {soon.map((u) => (
                <UpcomingTile key={u.slug} u={u} />
              ))}
            </Rail>
          );
        })}

        <Rail title="The series" note="One free membership opens all of them">
          {shows.map((s) => (
            <li key={s.card.slug} className="zst-show">
              <Link className="zst-show__link" to={`/blog/series/${s.card.slug}`}>
                <span className="zst-show__art">
                  {s.card.cover ? (
                    <img src={blogAsset(s.card.cover.url)} alt={s.card.cover_alt} width={1200} height={630} loading="lazy" decoding="async" />
                  ) : null}
                </span>
                <span className="zst-show__body">
                  <b className="zst-show__t">{s.card.title}</b>
                  {s.card.tagline ? <span className="zst-show__line">{s.card.tagline}</span> : null}
                  <span className="zst-show__k">
                    {s.card.planned_episodes} episodes · <LockIcon /> free membership
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </Rail>
      </div>

      {member ? null : (
        <div className="zst-wrap zst-tv__join" id="join">
          <MemberGate title="Every series in your inbox, free" variant="band">
            <p className="sx-gate__lede">
              Membership is free and opens every series here. Your first episode arrives the moment you confirm; the rest come by
              email, in order, and every released episode stays open to you on this site.
            </p>
          </MemberGate>
        </div>
      )}
      <p className="zst-wrap zst-tv__fine">The companies, families and people in our series are fictional. The situations are common, and the lessons are real.</p>
    </>
  );
}

interface Pick {
  show: Show;
  e: EpisodeCard;
  label: string;
}

/** The billboard's episode: after what this browser read last, else a member's latest open one, else Episode 1. */
function billboard(shows: Show[], recent: ReturnType<typeof readRecent>, member: boolean): Pick | null {
  for (const r of recent) {
    const show = shows.find((s) => s.card.slug === r.series);
    const eps = show?.detail?.episodes ?? [];
    const i = eps.findIndex((e) => e.slug === r.slug);
    if (show && i >= 0 && eps[i + 1]) return { show, e: eps[i + 1], label: "Up next for you" };
  }
  const show = shows.find((s) => s.detail?.episodes.length);
  if (!show?.detail) return null;
  const eps = show.detail.episodes;
  if (member) {
    const open = eps.filter((e) => accessOf(e, true) === "open");
    const last = open[open.length - 1];
    if (last) return { show, e: last, label: open.length > 1 ? "Your latest episode" : "Start here" };
  }
  return { show, e: eps[0], label: "Start here" };
}

function Billboard({ pick, member }: { pick: Pick; member: boolean }): ReactElement {
  const { show, e, label } = pick;
  const access = accessOf(e, member);
  const season = show.detail?.seasons.find((s) => s.number === e.season);
  const next = soonestUpcoming(show.detail?.upcoming ?? []);
  const canRead = access === "free" || access === "open";
  return (
    <SeriesHero art={show.card.cover ?? e.cover} artAlt="">
      <p className="zst-kicker">
        {show.card.title} · {label}
      </p>
      <h2 className="zst-hero__t">{e.title}</h2>
      <p className="zst-hero__meta">
        <span>
          {epNo(e)} · {e.reading_minutes} min
        </span>
        <span>
          Season {e.season}
          {season?.title ? `: ${season.title}` : ""}
        </span>
        {access === "free" ? <span className="zst-badge zst-badge--free">Free episode</span> : null}
        {access === "members" ? (
          <span className="zst-badge">
            <LockIcon /> Members · free to join
          </span>
        ) : null}
      </p>
      {e.summary ? <p className="zst-hero__hook">{e.summary}</p> : null}
      <div className="zst-hero__ctas">
        <Link className="zst-btn zst-btn--light" to={episodePath(show.card.slug, e.slug)}>
          <Play /> {canRead ? `Read episode ${e.episode ?? ""}`.trim() : "Read the opening"}
        </Link>
        {member ? (
          <Link className="zst-btn zst-btn--glass" to={`/blog/series/${show.card.slug}`}>
            All episodes
          </Link>
        ) : (
          <a className="zst-btn zst-btn--glass" href="#join">
            <LockIcon /> Get free access
          </a>
        )}
      </div>
      {next ? <NextUp u={next} /> : null}
    </SeriesHero>
  );
}

function HubSkeleton(): ReactElement {
  return (
    <div aria-busy="true">
      <div className="zst-hero zst-hero--big zst-hero--skel" />
      <div className="zst-tv__rails">
        <div className="zst-wrap zst-skel-rail">
          <span className="zst-skel zst-skel--t" />
          <span className="zst-skel-rail__row">
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} className="zst-skel zst-skel--tile" />
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}
