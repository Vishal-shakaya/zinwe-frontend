import { useCallback, useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import type { Announcement, AnnouncementKind } from "../../lib/api";
import { DashIcon, type DashIconName } from "./DashIcon";

const STORAGE_KEY = "zinwe.dismissed-announcements";

const ICON: Record<AnnouncementKind, DashIconName> = {
  version: "refresh",
  offer: "card",
  upgrade: "arrow",
};

/** Per-viewer dismissals; survives reloads, never required for correctness. */
function readDismissed(): Set<string> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const ids = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(ids) ? ids.map(String) : []);
  } catch {
    return new Set();
  }
}

function writeDismissed(ids: Set<string>): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Private mode / blocked storage: the bar simply won't remember the dismissal.
  }
}

function isInternal(href: string): boolean {
  return href.startsWith("/");
}

/**
 * The dismissible notification bar under the nav (M11): version notes, offers
 * and the upgrade nudge. Dismissals are remembered per-browser by announcement
 * id, so a new message (new id) shows again.
 */
export function NotificationBar({ items }: { items: Announcement[] }): ReactElement | null {
  const [dismissed, setDismissed] = useState<Set<string>>(readDismissed);

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      writeDismissed(next);
      return next;
    });
  }, []);

  const visible = items.filter((item) => !(item.dismissible && dismissed.has(item.id)));
  if (visible.length === 0) return null;

  return (
    <div className="dash-notices">
      {visible.map((item) => (
        <div key={item.id} className={`dash-notice dash-notice--${item.kind}`} role="status">
          <span className="dash-notice__ico" aria-hidden="true">
            <DashIcon name={ICON[item.kind]} />
          </span>
          <span className="dash-notice__text">
            <b>{item.title}</b>
            {item.body ? <span> {item.body}</span> : null}
          </span>
          {item.cta_label && item.cta_href ? (
            isInternal(item.cta_href) ? (
              <Link className="btn btn--primary dash-btn-sm dash-notice__cta" to={item.cta_href}>
                {item.cta_label}
              </Link>
            ) : (
              <a
                className="btn btn--primary dash-btn-sm dash-notice__cta"
                href={item.cta_href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {item.cta_label}
              </a>
            )
          ) : null}
          {item.dismissible ? (
            <button
              type="button"
              className="dash-notice__x"
              onClick={() => dismiss(item.id)}
              aria-label={`Dismiss: ${item.title}`}
            >
              ×
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
