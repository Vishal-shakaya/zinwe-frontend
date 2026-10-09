import { useCallback, useState, type ReactElement } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { usePageMeta } from "../../hooks/usePageMeta";
import {
  EVENTS_DEFAULT_LIMIT,
  EVENTS_MAX_LIMIT,
  errorMessage,
  listDevices,
  listEvents,
  type DeviceEvent,
} from "../../lib/api";
import { DashIcon } from "../components/DashIcon";
import { EmptyState, ErrorState, LoadingState, PageHeader, RefreshButton, StaleBanner } from "../components/States";
import { dayGroup, formatDateTime, formatRelative, formatTime, useNow } from "../time";
import { useResource } from "../useResource";

type Severity = "info" | "warning" | "critical";

const SEVERITY_LABEL: Record<Severity, string> = {
  info: "For your information",
  warning: "Worth a look",
  critical: "Needs attention",
};

function severityOf(event: DeviceEvent): Severity {
  return event.severity === "warning" || event.severity === "critical" ? event.severity : "info";
}

function parseDeviceId(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

export default function ActivityPage(): ReactElement {
  usePageMeta({ title: "Activity — Zinwe", description: "What happened on your PCs, newest first." });

  const [params, setParams] = useSearchParams();
  const deviceId = parseDeviceId(params.get("device"));
  const [limit, setLimit] = useState(EVENTS_DEFAULT_LIMIT);
  const now = useNow();

  const loadDevices = useCallback((signal: AbortSignal) => listDevices(signal), []);
  const devices = useResource(loadDevices);

  const loadEvents = useCallback(
    (signal: AbortSignal) => listEvents({ device: deviceId, limit }, signal),
    [deviceId, limit],
  );
  // "Show older" keeps the list on screen; a different PC starts from a clean slate.
  const events = useResource(loadEvents, { pollMs: 60_000, resetKey: deviceId ?? "all" });

  const deviceList = devices.data ?? [];
  const selectedDevice = deviceList.find((d) => d.id === deviceId);
  const hasDevices = deviceList.length > 0;

  const onFilter = (value: string) => {
    setLimit(EVENTS_DEFAULT_LIMIT);
    const next = new URLSearchParams(params);
    if (value) next.set("device", value);
    else next.delete("device");
    setParams(next, { replace: true });
  };

  const list = events.data ?? [];
  const canLoadMore = events.data !== undefined && list.length >= limit && limit < EVENTS_MAX_LIMIT;

  return (
    <>
      <PageHeader
        title="Activity"
        lede="What happened on your PCs, newest first, in plain language."
        actions={<RefreshButton onClick={events.reload} pending={events.pending} />}
      />

      <section className="dash-card" aria-labelledby="feed-title">
        <div className="dash-card__head dash-card__head--split">
          <h2 className="dash-card__title" id="feed-title">
            {selectedDevice ? `Activity on ${selectedDevice.hostname}` : "All activity"}
          </h2>
          {hasDevices || deviceId !== undefined ? (
            <label className="dash-filter">
              <span>Show</span>
              <select value={deviceId !== undefined ? String(deviceId) : ""} onChange={(e) => onFilter(e.target.value)}>
                <option value="">All PCs</option>
                {deviceList.map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    {d.hostname}
                    {d.is_revoked ? " (removed)" : ""}
                  </option>
                ))}
                {deviceId !== undefined && !selectedDevice ? (
                  <option value={String(deviceId)}>This PC</option>
                ) : null}
              </select>
            </label>
          ) : null}
        </div>

        {events.data === undefined ? (
          events.error ? (
            <ErrorState
              title="We couldn't load your activity"
              message={errorMessage(events.error)}
              onRetry={events.reload}
              retrying={events.pending}
            />
          ) : (
            <LoadingState label="Loading activity…" rows={4} />
          )
        ) : list.length === 0 ? (
          <FeedEmpty filtered={deviceId !== undefined} hasDevices={hasDevices} onClear={() => onFilter("")} />
        ) : (
          <>
            {events.error ? <StaleBanner message={errorMessage(events.error)} onRetry={events.reload} /> : null}
            <Feed events={list} now={now} />
            {canLoadMore ? (
              <div className="dash-more">
                <button
                  type="button"
                  className="btn btn--ghost dash-btn-sm"
                  disabled={events.pending}
                  onClick={() => setLimit((l) => Math.min(l + EVENTS_DEFAULT_LIMIT, EVENTS_MAX_LIMIT))}
                >
                  {events.pending ? "Loading…" : "Show older activity"}
                </button>
              </div>
            ) : list.length >= EVENTS_MAX_LIMIT ? (
              <p className="dash-note">Showing the latest {EVENTS_MAX_LIMIT} events.</p>
            ) : null}
          </>
        )}
      </section>
    </>
  );
}

function FeedEmpty({
  filtered,
  hasDevices,
  onClear,
}: {
  filtered: boolean;
  hasDevices: boolean;
  onClear: () => void;
}): ReactElement {
  if (filtered) {
    return (
      <EmptyState
        icon="activity"
        title="Nothing from this PC yet"
        action={
          <button type="button" className="btn btn--ghost dash-btn-sm" onClick={onClear}>
            Show all PCs
          </button>
        }
      >
        When someone plugs in a USB drive or a rule changes on this PC, it shows up here.
      </EmptyState>
    );
  }
  if (!hasDevices) {
    return (
      <EmptyState
        icon="pc"
        title="No activity yet"
        action={
          <Link className="btn btn--primary dash-btn-sm" to="/app/devices#add-pc">
            Add your first PC <span className="arr">→</span>
          </Link>
        }
      >
        Activity appears here once a PC has the Zinwe agent installed.
      </EmptyState>
    );
  }
  return (
    <EmptyState icon="shield" title="All quiet">
      Nothing has happened on your PCs yet. When someone plugs in a USB drive or a rule changes, you'll see it here.
    </EmptyState>
  );
}

function Feed({ events, now }: { events: DeviceEvent[]; now: number }): ReactElement {
  const groups: Array<{ key: string; label: string; items: DeviceEvent[] }> = [];
  for (const event of events) {
    const { key, label } = dayGroup(event.occurred_at, now);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(event);
    else groups.push({ key, label, items: [event] });
  }

  return (
    <div className="dash-feed">
      {groups.map((group) => (
        <section key={group.key} className="dash-feed__day" aria-label={group.label}>
          <h3 className="dash-feed__date">{group.label}</h3>
          <ul className="dash-feed__list">
            {group.items.map((event) => {
              const severity = severityOf(event);
              return (
                <li key={event.id} className={`dash-event dash-event--${severity}`}>
                  <span className="dash-event__mark" aria-hidden="true">
                    <DashIcon name={event.type.startsWith("usb.") ? "usb" : severity === "info" ? "activity" : "alert"} />
                  </span>
                  <div className="dash-event__body">
                    <p className="dash-event__title">{event.title}</p>
                    <p className="dash-event__meta">
                      <span>{event.hostname}</span>
                      <span aria-hidden="true">·</span>
                      <time dateTime={event.occurred_at} title={formatDateTime(event.occurred_at)}>
                        {/* Under a day heading: relative for recent events, clock time for older ones. */}
                        {now - Date.parse(event.occurred_at) < 12 * 3_600_000
                          ? formatRelative(event.occurred_at, now)
                          : formatTime(event.occurred_at)}
                      </time>
                      {severity !== "info" ? (
                        <span className={`dash-sev dash-sev--${severity}`}>{SEVERITY_LABEL[severity]}</span>
                      ) : null}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
