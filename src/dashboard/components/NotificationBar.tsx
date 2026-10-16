import { useCallback, useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import type { Announcement, AnnouncementKind } from "../../lib/api";
import { isInternalHref as isInternal, readDismissed, writeDismissed } from "../../lib/announcementDismissals";
import { DashIcon, type DashIconName } from "./DashIcon";

const ICON: Record<AnnouncementKind, DashIconName> = {
  version: "refresh",
  offer: "card",
  discount: "card",
  news: "book",
  maintenance: "settings",
  upgrade: "arrow",
};

/**
 * The dismissible bars at the top of the dashboard: messages the Zinwe team pushes from the admin
 * panel (offers, discounts, news, updates, maintenance) and the upgrade bar (what the next plan
 * adds, or that every PC slot is taken). Closing one is remembered per browser by its id, so a new
 * or edited message shows again.
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
