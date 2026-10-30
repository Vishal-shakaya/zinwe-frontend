import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { blogAsset } from "../../lib/api/blog";
import type { SeriesCard } from "../../lib/api/series";
import { LockIcon } from "./MemberGate";

/** A series as a wide poster: on the blog (above the articles) and on the series hub. */
export function SeriesFeature({
  show,
  headingLevel = 2,
  priority = false,
}: {
  show: SeriesCard;
  headingLevel?: 2 | 3;
  /** The first poster on screen (LCP): loaded at once, never lazily. */
  priority?: boolean;
}): ReactElement {
  const Heading = `h${headingLevel}` as const;
  const out = show.released ?? 0;
  return (
    <Link to={`/blog/series/${show.slug}`} className="sx-feature">
      {/* The art fills the poster (position absolute), so it never shifts the layout; 1200×630 like every cover. */}
      {show.cover ? (
        <img
          className="sx-feature__art"
          src={blogAsset(show.cover.url)}
          alt={show.cover_alt}
          width={1200}
          height={630}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          decoding="async"
        />
      ) : null}
      <div className="sx-feature__shade" aria-hidden="true" />
      <div className="sx-feature__body">
        <p className="sx-eyebrow">A Zinwe original · members' series</p>
        <Heading className="sx-feature__title">{show.title}</Heading>
        {show.tagline ? <p className="sx-feature__tagline">{show.tagline}</p> : null}
        <p className="sx-facts">
          {out ? <span>{out === 1 ? "Episode 1 out now" : `${out} episodes out`}</span> : <span>Coming soon</span>}
          {show.planned_episodes ? <span>{show.planned_episodes} planned</span> : null}
          <span>
            <LockIcon /> Free membership
          </span>
        </p>
        <span className="sx-btn sx-btn--light">Watch the series</span>
      </div>
    </Link>
  );
}
