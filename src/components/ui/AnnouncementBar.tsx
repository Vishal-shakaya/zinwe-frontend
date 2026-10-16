import { useCallback, useEffect, useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { getWebsiteAnnouncements, type Announcement } from "../../lib/api";
import { cx } from "../../lib/cx";
import { isInternalHref, readDismissed, writeDismissed } from "../../lib/announcementDismissals";

/** One fetch per page load, shared by every bar on the page (site nav, sign-up, onboarding). */
let cache: Promise<Announcement[]> | null = null;
function loadOnce(): Promise<Announcement[]> {
  cache ??= getWebsiteAnnouncements().catch(() => []);
  return cache;
}

/**
 * The slim bar the Zinwe team pushes from the admin panel (offers, discounts, news) on the public
 * website, sign-up and onboarding. Shows the top message this visitor hasn't closed; nothing at all
 * while loading or when there's none, so it never shifts a page that has no message.
 */
export function AnnouncementBar({ className }: { className?: string }): ReactElement | null {
  const [items, setItems] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(readDismissed);

  useEffect(() => {
    let alive = true;
    void loadOnce().then((list) => {
      if (alive) setItems(list);
    });
    return () => {
      alive = false;
    };
  }, []);

  const close = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev).add(id);
      writeDismissed(next);
      return next;
    });
  }, []);

  const item = items.find((a) => !(a.dismissible && dismissed.has(a.id)));
  if (!item) return null;

  const cta =
    item.cta_label && item.cta_href ? (
      isInternalHref(item.cta_href) ? (
        <Link className="abar__cta" to={item.cta_href}>
          {item.cta_label} <span className="arr">→</span>
        </Link>
      ) : (
        <a className="abar__cta" href={item.cta_href} target="_blank" rel="noopener noreferrer">
          {item.cta_label} <span className="arr">→</span>
        </a>
      )
    ) : null;

  return (
    <div className={cx("abar", `abar--${item.kind}`, className)} role="region" aria-label="Announcement">
      <div className="abar__inner">
        <p className="abar__text">
          <b>{item.title}</b>
          {item.body ? <span> {item.body}</span> : null}
          {cta ? " " : null}
          {cta}
        </p>
        {item.dismissible ? (
          <button type="button" className="abar__x" onClick={() => close(item.id)} aria-label={`Close: ${item.title}`}>
            ×
          </button>
        ) : null}
      </div>
    </div>
  );
}
