import type { ReactElement, ReactNode } from "react";
import { blogAsset } from "../../lib/api/blog";
import type { UpcomingEpisode } from "../../lib/api/series";
import { cx } from "../../lib/cx";
import { dayText, epNo, useMinute, whenText } from "../../lib/stories";

/**
 * The cinematic billboard of the series pages: full-bleed art with a calm shade, the words on the left. The art box
 * has a fixed aspect on every width (and a min-height), so nothing moves when the image arrives (CLS).
 */
export function SeriesHero({
  art,
  artAlt = "",
  children,
  size = "big",
  className,
}: {
  art: { url: string } | null;
  artAlt?: string;
  children: ReactNode;
  size?: "big" | "ep";
  className?: string;
}): ReactElement {
  return (
    <header className={cx("zst-hero", `zst-hero--${size}`, className)}>
      <div className="zst-hero__art">
        {art ? <img src={blogAsset(art.url)} alt={artAlt} width={1200} height={630} fetchPriority="high" decoding="async" /> : null}
      </div>
      <div className="zst-hero__shade" aria-hidden="true" />
      <div className="zst-wrap zst-hero__inner">{children}</div>
    </header>
  );
}

/** "Next new episode: Ep 07 · Title · Mon, 2 Nov · in 2 days" (from the release schedule; refreshed each minute). */
export function NextUp({ u, label = "Next new episode" }: { u: UpcomingEpisode; label?: string }): ReactElement {
  const now = useMinute();
  const when = whenText(u.published_at, now);
  return (
    <p className="zst-nextup">
      <span className="zst-nextup__dot" aria-hidden="true" />
      <span>
        {label}: <b>{epNo(u)} · {u.title}</b>
        <span className="zst-nextup__when">
          {" "}
          · {dayText(u.published_at)}
          {when ? ` · ${when}` : ""}
        </span>
      </span>
    </p>
  );
}

export function Play(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path fill="currentColor" d="M4 2.8v10.4a.8.8 0 0 0 1.2.7l8.4-5.2a.8.8 0 0 0 0-1.4L5.2 2.1A.8.8 0 0 0 4 2.8Z" />
    </svg>
  );
}
