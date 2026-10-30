import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { blogAsset } from "../../lib/api/blog";
import { episodePath, type EpisodeCard, type UpcomingEpisode } from "../../lib/api/series";
import { cx } from "../../lib/cx";
import { accessOf, dayText, epNo, weekdayText, whenText, type RecentEpisode } from "../../lib/stories";
import { LockIcon } from "../series/MemberGate";

/** The access badge on a tile: free, members, or (for a member) the day the drip opens it. Open ones say nothing. */
function AccessBadge({ e, member }: { e: EpisodeCard; member: boolean }): ReactElement | null {
  const a = accessOf(e, member);
  if (a === "free") return <span className="zst-badge zst-badge--free">Free episode</span>;
  if (a === "open") return null;
  if (a === "waiting")
    return (
      <span className="zst-badge">
        <LockIcon /> {e.unlocks_on ? `Opens ${weekdayText(e.unlocks_on)}` : "Opens by email"}
      </span>
    );
  return (
    <span className="zst-badge">
      <LockIcon /> Members
    </span>
  );
}

function Art({ cover, alt, code, eager }: { cover: { url: string } | null; alt: string; code: string; eager?: boolean }): ReactElement {
  return (
    <span className="zst-tile__art">
      {cover ? (
        <img src={blogAsset(cover.url)} alt={alt} width={1200} height={630} loading={eager ? "eager" : "lazy"} decoding="async" />
      ) : (
        <span className="zst-tile__blank" aria-hidden="true">
          {code}
        </span>
      )}
    </span>
  );
}

/** A released episode, as a poster in a rail. */
export function EpisodeTile({
  seriesSlug,
  seriesTitle,
  e,
  member,
  eager,
}: {
  seriesSlug: string;
  /** Shown above the title when the rail mixes series. */
  seriesTitle?: string;
  e: EpisodeCard;
  member: boolean;
  eager?: boolean;
}): ReactElement {
  const a = accessOf(e, member);
  return (
    <li className="zst-tile">
      <Link className={cx("zst-tile__link", (a === "members" || a === "waiting") && "is-locked")} to={episodePath(seriesSlug, e.slug)}>
        <Art cover={e.cover} alt={e.cover_alt} code={epNo(e)} eager={eager} />
        <span className="zst-tile__meta">
          {seriesTitle ? <span className="zst-tile__show">{seriesTitle}</span> : null}
          <span className="zst-tile__k">
            <span>
              {epNo(e)} · {e.reading_minutes} min
            </span>
            <AccessBadge e={e} member={member} />
          </span>
          <b className="zst-tile__t">{e.title}</b>
        </span>
      </Link>
    </li>
  );
}

/** A scheduled episode: no page yet, so no link; the date it arrives. */
export function UpcomingTile({ u, seriesTitle }: { u: UpcomingEpisode; seriesTitle?: string }): ReactElement {
  const when = whenText(u.published_at);
  return (
    <li className="zst-tile zst-tile--soon">
      <span className="zst-tile__link">
        <span className="zst-tile__art">
          <span className="zst-tile__blank zst-tile__blank--soon" aria-hidden="true">
            <span>{epNo(u)}</span>
          </span>
        </span>
        <span className="zst-tile__meta">
          {seriesTitle ? <span className="zst-tile__show">{seriesTitle}</span> : null}
          <span className="zst-tile__k">
            <span>
              {epNo(u)} · {dayText(u.published_at)}
            </span>
            <span className="zst-badge zst-badge--soon">{when ? `Coming ${when}` : "Coming soon"}</span>
          </span>
          <b className="zst-tile__t">{u.title}</b>
        </span>
      </span>
    </li>
  );
}

/** "Continue": an episode this browser opened before. */
export function RecentTile({ r }: { r: RecentEpisode }): ReactElement {
  return (
    <li className="zst-tile">
      <Link className="zst-tile__link" to={episodePath(r.series, r.slug)}>
        <Art cover={r.cover ? { url: r.cover } : null} alt="" code={epNo(r)} />
        <span className="zst-tile__meta">
          <span className="zst-tile__show">{r.seriesTitle}</span>
          <span className="zst-tile__k">
            {epNo(r)} · {r.minutes} min
          </span>
          <b className="zst-tile__t">{r.title}</b>
        </span>
      </Link>
    </li>
  );
}
