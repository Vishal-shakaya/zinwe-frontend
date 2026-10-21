import type { ReactElement } from "react";
import { useResource } from "../../dashboard/useResource";
import { getSeriesList } from "../../lib/api/series";
import { SeriesFeature } from "../series/SeriesFeature";
import "../../styles/series.css";

/** Home page: the members' series poster (nothing shows until a series is live). */
export function SeriesBand(): ReactElement | null {
  const shows = useResource(getSeriesList).data?.results ?? [];
  if (!shows.length) return null;
  return (
    <section className="sec sec--series" aria-labelledby="home-series-title">
      <div className="wrap">
        <p className="eyebrow" id="home-series-title">
          Free for business owners
        </p>
        <h2 className="h-section">Learn from other people's small mistakes</h2>
        <p className="lede home-series__lede">
          A members-only series of short business stories, each with a 10-minute fix you can do today. No IT department needed.
        </p>
        {shows.map((s) => (
          <SeriesFeature key={s.slug} show={s} />
        ))}
      </div>
    </section>
  );
}
