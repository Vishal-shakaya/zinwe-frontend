import { useCallback, useMemo, useState, type ReactElement, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { usePageMeta } from "../../hooks/usePageMeta";
import {
  EVENTS_DEFAULT_LIMIT,
  EVENTS_MAX_LIMIT,
  errorMessage,
  listDevices,
  listEvents,
  listMembers,
  type DeviceEvent,
  type Member,
} from "../../lib/api";
import { cx } from "../../lib/cx";
import { DashIcon, type DashIconName } from "../components/DashIcon";
import { eventMeta, severityOf, type FeatureKey, type Severity } from "../features/events";
import { detailOf, groupAlerts, type AlertGroup } from "../features/alertGroups";
import { SendAlertMenu } from "../components/SendAlertMenu";
import { EmptyState, ErrorState, LoadingState, PageHeader, RefreshButton, StaleBanner } from "../components/States";
import { dayGroup, formatDateTime, formatRelative, formatTime, useNow } from "../time";
import { useResource } from "../useResource";

function parseDeviceId(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

export default function AlertsPage(): ReactElement {
  usePageMeta({ title: "Alerts — Zinwe", description: "Every alert on your PCs, newest first." });

  const [params, setParams] = useSearchParams();
  const deviceId = parseDeviceId(params.get("device"));
  const [limit, setLimit] = useState(EVENTS_DEFAULT_LIMIT);
  const now = useNow();

  const loadDevices = useCallback((signal: AbortSignal) => listDevices(signal), []);
  const devices = useResource(loadDevices);
  const loadMembers = useCallback((signal: AbortSignal) => listMembers(signal), []);
  const members = useResource(loadMembers);
  const [priority, setPriority] = useState<Priority | "all">("all");
  const [type, setType] = useState<FeatureKey | "all">("all");

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

  // device → person, for the "PC · person" column and the Send mail recipient.
  const personFor = useMemo(() => {
    const byMember = new Map((members.data ?? []).map((m) => [m.id, m] as const));
    const byDevice = new Map<number, Member>();
    for (const d of devices.data ?? []) {
      // member_id from current backends; older ones only name the member.
      const person =
        d.member_id != null
          ? byMember.get(d.member_id)
          : (members.data ?? []).find((m) => m.is_active && m.name === d.member_name);
      if (person) byDevice.set(d.id, person);
    }
    return (deviceId: number) => byDevice.get(deviceId);
  }, [members.data, devices.data]);

  const counts = { high: 0, medium: 0, low: 0 } as Record<Priority, number>;
  for (const e of list) counts[PRIORITY[severityOf(e)]] += 1;
  const shown = list.filter(
    (e) =>
      (priority === "all" || PRIORITY[severityOf(e)] === priority) &&
      (type === "all" || eventMeta(e.type).feature === type),
  );
  const canLoadMore = events.data !== undefined && list.length >= limit && limit < EVENTS_MAX_LIMIT;

  return (
    <>
      <PageHeader
        title="Alerts"
        lede="Every alert on your PCs, newest first. Filter by priority or type, and alert the person on their PC, by email, or both."
        actions={<RefreshButton onClick={events.reload} pending={events.pending} />}
      />

      <section className="dash-card" aria-labelledby="feed-title">
        <div className="dash-card__head dash-card__head--split">
          <h2 className="dash-card__title" id="feed-title">
            {selectedDevice ? `Alerts on ${selectedDevice.hostname}` : "All alerts"}
          </h2>
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
            <ActivityFilters
              pcFilter={
                hasDevices || deviceId !== undefined ? (
                  <label className="dash-filter">
                    <span>PC</span>
                    <select
                      value={deviceId !== undefined ? String(deviceId) : ""}
                      onChange={(e) => onFilter(e.target.value)}
                    >
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
                ) : null
              }
              priority={priority}
              type={type}
              counts={counts}
              onPriority={setPriority}
              onType={setType}
            />
            {shown.length === 0 ? (
              <p className="dash-note">
                Nothing matches these filters.{" "}
                <button
                  type="button"
                  className="dash-link"
                  onClick={() => {
                    setPriority("all");
                    setType("all");
                  }}
                >
                  Show everything
                </button>
              </p>
            ) : (
              <AlertTable events={shown} now={now} personFor={personFor} />
            )}
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
          <Link className="btn btn--primary dash-btn-sm" to="/app/team">
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

type Priority = "high" | "medium" | "low";

const PRIORITY: Record<Severity, Priority> = { critical: "high", warning: "medium", info: "low" };
const PRIORITY_LABEL: Record<Priority, string> = { high: "High", medium: "Medium", low: "Low" };
const PRIORITY_ORDER: readonly Priority[] = ["high", "medium", "low"];

const TYPE_LABEL: Record<FeatureKey, string> = {
  internet: "Online protection",
  data: "Data safety",
  remote: "App monitoring",
  other: "System",
};
const TYPE_ORDER: readonly FeatureKey[] = ["internet", "data", "remote", "other"];

const TYPE_ICON: Record<FeatureKey, DashIconName> = {
  internet: "globe",
  data: "usb",
  remote: "screen",
  other: "shield",
};

/**
 * The alerts list: grouped by day, repeats of the same alert on the same PC
 * folded into one row, a plain detail line, who it's about, priority, when,
 * and "Send alert" to reach that person (widget, email or both).
 */
function AlertTable({
  events,
  now,
  personFor,
}: {
  events: DeviceEvent[];
  now: number;
  personFor: (deviceId: number) => Member | undefined;
}): ReactElement {
  const groups = groupAlerts(events);
  const days: Array<{ key: string; label: string; rows: AlertGroup[] }> = [];
  for (const g of groups) {
    const { key, label } = dayGroup(g.latest.occurred_at, now);
    const last = days[days.length - 1];
    if (last && last.key === key) last.rows.push(g);
    else days.push({ key, label, rows: [g] });
  }

  return (
    <div className="al-table">
      <div className="al-row al-row--head" aria-hidden="true">
        <span>Alert</span>
        <span>Person · PC</span>
        <span>Priority</span>
        <span>When</span>
        <span />
      </div>
      {days.map((day) => (
        <section key={day.key} className="al-day" aria-label={day.label}>
          <h3 className="al-day__label">
            {day.label}
            <small>
              {day.rows.reduce((n, g) => n + g.count, 0)} alert{day.rows.reduce((n, g) => n + g.count, 0) === 1 ? "" : "s"}
            </small>
          </h3>
          {day.rows.map((g) => (
            <AlertRow key={g.latest.id} group={g} now={now} person={personFor(g.latest.device_id)} />
          ))}
        </section>
      ))}
    </div>
  );
}

function AlertRow({ group, now, person }: { group: AlertGroup; now: number; person: Member | undefined }): ReactElement {
  const event = group.latest;
  const meta = eventMeta(event.type);
  const priority = PRIORITY[severityOf(event)];
  const recent = now - Date.parse(event.occurred_at) < 12 * 3_600_000;
  const spanMin = Math.max(1, Math.round((Date.parse(group.lastAt) - Date.parse(group.firstAt)) / 60_000));

  return (
    <div className={`al-row al-row--${priority}`}>
      <span className="al-alert">
        <span className={`act-mark act-mark--${priority}`} aria-hidden="true">
          <DashIcon name={priority === "low" ? TYPE_ICON[meta.feature] : "alert"} />
        </span>
        <span className="al-alert__text">
          <b>
            {meta.label}
            {group.subject ? <span className="al-subject">{group.subject}</span> : null}
          </b>
          <small className="al-detail" title={detailOf(event)}>
            {detailOf(event)}
          </small>
          <span className="al-chips">
            <span className="al-chip">
              <DashIcon name={TYPE_ICON[meta.feature]} />
              {TYPE_LABEL[meta.feature]}
            </span>
            {group.count > 1 ? (
              <span
                className="al-chip al-chip--repeat"
                data-tip={`Same alert ${group.count} times on this PC, ${formatTime(group.firstAt)}–${formatTime(group.lastAt)}`}
              >
                ×{group.count} in {spanMin < 60 ? `${spanMin} min` : `${Math.round(spanMin / 60)} h`}
              </span>
            ) : null}
          </span>
        </span>
      </span>
      <span className="al-who" data-label="Person · PC">
        {person ? <b>{person.name}</b> : <b className="al-muted">No one linked</b>}
        <small>{event.hostname || "A PC"}</small>
      </span>
      <span data-label="Priority">
        <span className={`act-pri act-pri--${priority}`}>{PRIORITY_LABEL[priority]}</span>
      </span>
      <span className="al-when" data-label="When">
        <time dateTime={event.occurred_at} title={formatDateTime(event.occurred_at)}>
          {recent ? formatRelative(event.occurred_at, now) : formatTime(event.occurred_at)}
        </time>
        {recent ? <small>{formatTime(event.occurred_at)}</small> : null}
      </span>
      <span className="al-action">
        <SendAlertMenu event={event} person={person ? { id: person.id, name: person.name, email: person.email } : undefined} />
      </span>
    </div>
  );
}

/** Priority, PC and type filters, in one row above the table. */
function ActivityFilters({
  pcFilter,
  priority,
  type,
  counts,
  onPriority,
  onType,
}: {
  /** The "which PC" picker, kept in the same row. */
  pcFilter: ReactNode;
  priority: Priority | "all";
  type: FeatureKey | "all";
  counts: Record<Priority, number>;
  onPriority: (value: Priority | "all") => void;
  onType: (value: FeatureKey | "all") => void;
}): ReactElement {
  return (
    <div className="act-filters">
      <div className="dash-range" role="group" aria-label="Filter by priority">
        {(["all", ...PRIORITY_ORDER] as const).map((value) => (
          <button
            key={value}
            type="button"
            className={cx("dash-range__btn", priority === value && "is-on")}
            aria-pressed={priority === value}
            onClick={() => onPriority(value)}
          >
            {value === "all" ? "All" : `${PRIORITY_LABEL[value]} (${counts[value]})`}
          </button>
        ))}
      </div>
      <div className="act-filters__end">
        {pcFilter}
        <label className="dash-filter">
          <span>Type</span>
          <select value={type} onChange={(e) => onType(e.target.value as FeatureKey | "all")}>
            <option value="all">All types</option>
            {TYPE_ORDER.map((key) => (
              <option key={key} value={key}>
                {TYPE_LABEL[key]}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
