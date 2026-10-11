import { useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import type { DeviceEvent } from "../../lib/api";
import { cx } from "../../lib/cx";
import { eventDomain, eventMeta, severityOf, SEVERITY_LABEL, type AlertMember } from "../features/events";
import { formatDateTime, formatRelative } from "../time";
import { DashIcon } from "./DashIcon";
import { MessageComposer } from "./MessageComposer";

export type { AlertMember };

export interface AlertsTableProps {
  events: DeviceEvent[];
  /** Maps an event's device_id to the member who owns it, or null if unknown. */
  resolveMember: (deviceId: number) => AlertMember | null;
  now: number;
  /** Shown above the table; omit to hide the header row entirely. */
  caption?: string;
  emptyText?: string;
  /** Show only the newest N, with a link to the full list in Activity. */
  limit?: number;
}

/**
 * The actionable alert table: Type · Status · Action · Suggested message.
 * "Action" is contextual — block a domain (→ Internet controls), message the
 * member (inline, prefilled), or review on the relevant feature page.
 */
export function AlertsTable({
  events,
  resolveMember,
  now,
  caption,
  emptyText,
  limit,
}: AlertsTableProps): ReactElement {
  const [openId, setOpenId] = useState<number | null>(null);

  const shown = limit !== undefined ? events.slice(0, limit) : events;

  if (events.length === 0) {
    return <p className="dash-note dash-alerts__empty">{emptyText ?? "Nothing to action right now. You're all clear."}</p>;
  }

  return (
    <div className="dash-alerts">
      {caption ? <p className="dash-sr">{caption}</p> : null}
      <div className="dash-alerts__table" role="table" aria-label={caption ?? "Alerts"}>
        <div className="dash-alerts__row dash-alerts__row--head" role="row">
          <span role="columnheader">Type</span>
          <span role="columnheader">Status</span>
          <span role="columnheader">Action</span>
          <span role="columnheader">Suggested message</span>
        </div>
        {shown.map((event) => {
          const meta = eventMeta(event.type);
          const severity = severityOf(event);
          const member = resolveMember(event.device_id);
          const domain = eventDomain(event);
          const open = openId === event.id;
          return (
            <div className="dash-alerts__group" key={event.id}>
              <div className={cx("dash-alerts__row", `dash-alerts__row--${severity}`)} role="row">
                <span role="cell" className="dash-alerts__type" data-label="Type">
                  <span className={cx("dash-alerts__mark", `dash-alerts__mark--${severity}`)} aria-hidden="true">
                    <DashIcon name={severity === "info" ? "activity" : "alert"} />
                  </span>
                  <span className="dash-alerts__typetext">
                    <b>{meta.label}</b>
                    <small>
                      {event.hostname || "a PC"}
                      {member ? ` · ${member.name}` : ""} ·{" "}
                      <time dateTime={event.occurred_at} title={formatDateTime(event.occurred_at)}>
                        {formatRelative(event.occurred_at, now)}
                      </time>
                    </small>
                  </span>
                </span>

                <span role="cell" data-label="Status">
                  <span className={cx("dash-sev", `dash-sev--${severity}`)}>{SEVERITY_LABEL[severity]}</span>
                </span>

                <span role="cell" data-label="Action">
                  {meta.action === "block-domain" && domain ? (
                    <Link className="btn btn--ink dash-btn-sm" to={`/app/internet?block=${encodeURIComponent(domain)}`}>
                      Block {domain.length > 22 ? `${domain.slice(0, 20)}…` : domain}
                    </Link>
                  ) : meta.action === "message" && member ? (
                    <button
                      type="button"
                      className="btn btn--ink dash-btn-sm"
                      aria-expanded={open}
                      onClick={() => setOpenId(open ? null : event.id)}
                    >
                      <DashIcon name="activity" />
                      Message
                    </button>
                  ) : (
                    <Link className="btn btn--ghost dash-btn-sm" to={meta.reviewTo}>
                      Review
                    </Link>
                  )}
                </span>

                <span role="cell" className="dash-alerts__suggest" data-label="Suggested message">
                  {meta.suggested ? <span>{meta.suggested}</span> : <span className="dash-alerts__dash">—</span>}
                </span>
              </div>

              {open && member ? (
                <div className="dash-alerts__compose">
                  <MessageComposer
                    memberId={member.id}
                    memberName={member.name}
                    preset={{
                      title: meta.label,
                      body: meta.suggested || undefined,
                      severity: severity === "info" ? "info" : severity,
                    }}
                    onClose={() => setOpenId(null)}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      {shown.length < events.length ? (
        <p className="dash-note dash-alerts__more">
          Showing the newest {shown.length} of {events.length}.{" "}
          <Link className="dash-link" to="/app/alerts">
            See all in Alerts <DashIcon name="arrow" />
          </Link>
        </p>
      ) : null}
    </div>
  );
}

export default AlertsTable;
