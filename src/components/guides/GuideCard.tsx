import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { blogAsset } from "../../lib/api/blog";
import { guidePath, type GuideCard as Guide } from "../../lib/api/guides";
import { trackEvent } from "../../lib/analytics";

/** A guide as a book: cover, title, one line, pages. Used in the library, on the home page and under a guide. */
export function GuideCard({ guide, from, priority = false }: { guide: Guide; from: string; priority?: boolean }): ReactElement {
  return (
    <Link
      to={guidePath(guide.slug)}
      className="gd-card"
      onClick={() => trackEvent("select_promotion", { promotion_name: `guide_card_${from}`, item_id: guide.slug })}
    >
      <span className="gd-card__book">
        {/* The book box keeps the A-series ratio (guides.css); `priority` = the first cover on screen (LCP): no lazy load. */}
        {guide.cover ? (
          <img
            src={blogAsset(guide.cover.url)}
            alt={guide.cover_alt}
            width={600}
            height={849}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : undefined}
            decoding="async"
          />
        ) : (
          <span>{guide.title}</span>
        )}
      </span>
      <span className="gd-card__body">
        <small>Free guide{guide.page_count ? ` · ${guide.page_count} pages` : ""}</small>
        <b>{guide.title}</b>
        {guide.summary ? <span>{guide.summary}</span> : null}
        <em>Get the free guide →</em>
      </span>
    </Link>
  );
}

/** The guide closest to what the reader is on (a blog article's aside, under an episode). */
export function GuidePickCard({ guide, dark = false }: { guide: Guide; dark?: boolean }): ReactElement {
  return (
    <Link
      to={guidePath(guide.slug)}
      className={`gd-pick${dark ? " gd-pick--dark" : ""}`}
      onClick={() => trackEvent("select_promotion", { promotion_name: "guide_pick", item_id: guide.slug })}
    >
      {guide.cover ? <img src={blogAsset(guide.cover.url)} alt="" loading="lazy" decoding="async" /> : null}
      <span>
        <small>Free guide{guide.page_count ? ` · ${guide.page_count} pages` : ""}</small>
        <b>{guide.title}</b>
        <em>Download it free →</em>
      </span>
    </Link>
  );
}
