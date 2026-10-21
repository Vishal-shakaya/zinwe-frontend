import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { blogAsset, type SeriesPick } from "../../lib/api/blog";
import { trackEvent } from "../../lib/analytics";
import "../../styles/series.css";

/** On a blog article: the members' series episode closest to its topic. */
export function SeriesPickCard({ pick }: { pick: SeriesPick }): ReactElement {
  return (
    <Link
      to={`/blog/series/${pick.series_slug}/${pick.slug}`}
      className="sx-pick"
      onClick={() => trackEvent("select_promotion", { promotion_name: "tlf_article_pick", item_id: pick.slug })}
    >
      {pick.cover ? <img src={blogAsset(pick.cover.url)} alt="" loading="lazy" decoding="async" /> : null}
      <span className="sx-pick__body">
        <small>From the members' series</small>
        <b>{pick.title}</b>
        <span>{pick.summary}</span>
        <em>{pick.free_preview ? "Read it free →" : "Read the opening →"}</em>
      </span>
    </Link>
  );
}
