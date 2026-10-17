import { useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import type { Device, DeviceEvent } from "../../lib/api";
import { cx } from "../../lib/cx";
import { detailOf } from "../features/alertGroups";
import { alertLabel, alertsOnly, eventMeta, isHandled, severityOf, SEVERITY_LABEL, type AlertMember } from "../features/events";
import { formatDateTime, formatRelative } from "../time";
import { DashIcon } from "./DashIcon";
import { SendAlertMenu } from "./SendAlertMenu";
import { UsbRestore } from "./UsbRestore";

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
  /** An alert was marked handled / opened again, or its person was messaged. */
  onChanged?: (event: DeviceEvent) => void;
  /** The PCs, so a "USB switched to read-only" alert can offer Restore USB right here. */
  devices?: Device[];
  /** Reload the PCs after Restore USB. */
  onDevicesChanged?: () => void;
}

/**
 * The actionable alert table: Type · Status · Action · Suggested message.
 * "Action" is "Send alert": message the person (widget, email or both), block the
 * site or tool, review the rule, or mark it handled. Tap an alert to read the full
 * sentence and what it means for your data (J5-12). Rule confirmations never show.
 */
export function AlertsTable({
  events,
  resolveMember,
  now,
  caption,
  emptyText,
  limit,
  onChanged,
  devices,
  onDevicesChanged,
}: AlertsTableProps): ReactElement {
  const [open, setOpen] = useState<number | null>(null);
  // Handled / messaged here: show it straight away, before the next poll.
  const [changed, setChanged] = useState<Record<number, DeviceEvent>>({});
  const alerts = alertsOnly(events).map((event) => changed[event.id] ?? event);
  const shown = limit !== undefined ? alerts.slice(0, limit) : alerts;

  if (alerts.length === 0) {
    return <p className="dash-note dash-alerts__empty">{emptyText ?? "Nothing to action right now. You're all clear."}</p>;
  }

  const onRowChanged = (next: DeviceEvent) => {
    setChanged((c) => ({ ...c, [next.id]: next }));
    onChanged?.(next);
  };

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
          const handled = isHandled(event);
          const expanded = open === event.id;
          const detailId = `alert-detail-${event.id}`;
          const lockedPc =
            event.type === "data.usb_locked_down" ? devices?.find((d) => d.id === event.device_id) : undefined;
          return (
            <div className={cx("dash-alerts__group", expanded && "is-open", handled && "is-handled")} key={event.id}>
              <div className={cx("dash-alerts__row", `dash-alerts__row--${severity}`)} role="row">
                <span role="cell" className="dash-alerts__type" data-label="Type">
                  <button
                    type="button"
                    className="dash-alerts__toggle"
                    aria-expanded={expanded}
                    aria-controls={detailId}
                    onClick={() => setOpen(expanded ? null : event.id)}
                  >
                    <span className={cx("dash-alerts__mark", `dash-alerts__mark--${severity}`)} aria-hidden="true">
                      <DashIcon name={severity === "info" ? "activity" : "alert"} />
                    </span>
                    <span className="dash-alerts__typetext">
                      <b>{alertLabel(event)}</b>
                      <small>
                        {member ? `${member.name} · ` : ""}
                        {event.hostname || "a PC"} ·{" "}
                        <time dateTime={event.occurred_at} title={formatDateTime(event.occurred_at)}>
                          {formatRelative(event.occurred_at, now)}
                        </time>
                      </small>
                    </span>
                    <span className="dash-alerts__chev" aria-hidden="true">
                      <DashIcon name="arrow" />
                    </span>
                  </button>
                </span>

                <span role="cell" data-label="Status" className="dash-alerts__status">
                  <span className={cx("dash-sev", `dash-sev--${severity}`)}>{SEVERITY_LABEL[severity]}</span>
                  {handled ? (
                    <small className="dash-alerts__handled">
                      <DashIcon name="check" />
                      Handled
                    </small>
                  ) : null}
                </span>

                <span role="cell" data-label="Action">
                  <SendAlertMenu event={event} person={member ?? undefined} compact onChanged={onRowChanged} />
                </span>

                <span role="cell" className="dash-alerts__suggest" data-label="Suggested message">
                  {meta.suggested ? <span>{meta.suggested}</span> : <span className="dash-alerts__dash">—</span>}
                </span>
                {lockedPc?.usb_locked_at ? (
                  <span className="dash-alerts__usb">
                    <UsbRestore device={lockedPc} onRestored={onDevicesChanged} />
                  </span>
                ) : null}
              </div>

              {expanded ? (
                <div className="dash-alerts__detail" id={detailId}>
                  <p className="dash-alerts__full">{detailOf(event)}</p>
                  {meta.meaning ? (
                    <p className="dash-alerts__meaning">
                      <b>What it means</b> {meta.meaning}
                    </p>
                  ) : null}
                  <p className="dash-alerts__when">
                    {formatDateTime(event.occurred_at)} · {event.hostname || "a PC"}
                    {member ? ` · ${member.name}` : ""}
                    {handled && event.handled_by ? ` · handled by ${event.handled_by}` : ""}
                  </p>
                  <p className="dash-alerts__links">
                    <Link className="dash-link" to={meta.reviewTo}>
                      {meta.reviewTo === "/app/team" ? "Restore USB on Team & devices" : "Review the rule"}{" "}
                      <DashIcon name="arrow" />
                    </Link>
                    <Link className="dash-link" to={`/app/alerts?device=${event.device_id}`}>
                      All alerts from this PC <DashIcon name="arrow" />
                    </Link>
                  </p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      {shown.length < alerts.length ? (
        <p className="dash-note dash-alerts__more">
          Showing the newest {shown.length} of {alerts.length}.{" "}
          <Link className="dash-link" to="/app/alerts">
            See all in Alerts <DashIcon name="arrow" />
          </Link>
        </p>
      ) : null}
    </div>
  );
}

export default AlertsTable;
