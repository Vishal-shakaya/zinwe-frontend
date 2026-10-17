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
  type Device,
  type DeviceEvent,
  type Member,
} from "../../lib/api";
import { cx } from "../../lib/cx";
import { DashIcon, type DashIconName } from "../components/DashIcon";
import {
  alertLabel,
  alertsOnly,
  eventMeta,
  isHandled,
  needsAttention,
  severityOf,
  SEVERITY_LABEL,
  SEVERITY_ORDER,
  type FeatureKey,
  type Severity,
} from "../features/events";
import { detailOf, groupAlerts, type AlertGroup } from "../features/alertGroups";
import { SendAlertMenu } from "../components/SendAlertMenu";
import { UsbRestore } from "../components/UsbRestore";
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
  // Overview's "alerts to check today" tile opens this page on ?show=check (same count, J5-11).
  const [priority, setPriority] = useState<Priority>(() => (params.get("show") === "check" ? "check" : "all"));
  const [type, setType] = useState<FeatureKey | "all">("all");
  const [changed, setChanged] = useState<Record<number, DeviceEvent>>({});

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

  // Rule confirmations aren't alerts (J5-01); handled / messaged here shows at once.
  const list = alertsOnly(events.data).map((e) => changed[e.id] ?? e);
  const onChanged = (next: DeviceEvent) => setChanged((c) => ({ ...c, [next.id]: next }));

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

  const counts: Record<Priority, number> = { all: list.length, check: 0, critical: 0, warning: 0, info: 0 };
  for (const e of list) {
    counts[severityOf(e)] += 1;
    if (needsAttention(e)) counts.check += 1;
  }
  const shown = list.filter(
    (e) =>
      (priority === "all" || (priority === "check" ? needsAttention(e) : severityOf(e) === priority)) &&
      (type === "all" || eventMeta(e.type).feature === type),
  );
  const canLoadMore = events.data !== undefined && (events.data?.length ?? 0) >= limit && limit < EVENTS_MAX_LIMIT;

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
              <AlertTable
                events={shown}
                now={now}
                personFor={personFor}
                devices={devices.data}
                onDevicesChanged={devices.reload}
                onChanged={onChanged}
              />
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
        Alerts appear here once Zinwe is installed on a PC and the person has agreed.
      </EmptyState>
    );
  }
  return (
    <EmptyState icon="shield" title="All quiet">
      Nothing has happened on your PCs yet. When someone plugs in a USB drive or a rule changes, you'll see it here.
    </EmptyState>
  );
}

/** The filter chips: everything, what's still to check, or one severity (same words as everywhere, J5-11). */
type Priority = "all" | "check" | Severity;

const PRIORITY_CLASS: Record<Severity, string> = { critical: "high", warning: "medium", info: "low" };
const FILTERS: readonly Priority[] = ["all", "check", ...SEVERITY_ORDER];
const FILTER_LABEL: Record<Priority, string> = { all: "All", check: "To check", ...SEVERITY_LABEL };

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
  devices,
  onDevicesChanged,
  onChanged,
}: {
  events: DeviceEvent[];
  now: number;
  personFor: (deviceId: number) => Member | undefined;
  devices: Device[] | undefined;
  onDevicesChanged: () => void;
  onChanged: (event: DeviceEvent) => void;
}): ReactElement {
  const [open, setOpen] = useState<number | null>(null);
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
        <span>Status</span>
        <span>When</span>
        <span />
      </div>
      {days.map((day) => (
        <section key={day.key} className="al-day" aria-label={day.label}>
          <h3 className="al-day__label">
            {day.label}
            <small>
              {dayCount(day.rows)} alert{dayCount(day.rows) === 1 ? "" : "s"}
              {dayToCheck(day.rows) > 0 ? ` · ${dayToCheck(day.rows)} to check` : ""}
            </small>
          </h3>
          {day.rows.map((g) => (
            <AlertRow
              key={g.latest.id}
              group={g}
              now={now}
              person={personFor(g.latest.device_id)}
              device={devices?.find((d) => d.id === g.latest.device_id)}
              onDevicesChanged={onDevicesChanged}
              onChanged={onChanged}
              open={open === g.latest.id}
              onToggle={() => setOpen(open === g.latest.id ? null : g.latest.id)}
            />
          ))}
        </section>
      ))}
    </div>
  );
}

function dayCount(rows: AlertGroup[]): number {
  return rows.reduce((n, g) => n + g.count, 0);
}

/** Same rule as Overview's "alerts to check today": Worth a look / Needs attention, not handled. */
function dayToCheck(rows: AlertGroup[]): number {
  return rows.reduce((n, g) => n + g.events.filter(needsAttention).length, 0);
}

function AlertRow({
  group,
  now,
  person,
  device,
  onDevicesChanged,
  onChanged,
  open,
  onToggle,
}: {
  group: AlertGroup;
  now: number;
  person: Member | undefined;
  device: Device | undefined;
  onDevicesChanged: () => void;
  onChanged: (event: DeviceEvent) => void;
  open: boolean;
  onToggle: () => void;
}): ReactElement {
  const event = group.latest;
  const meta = eventMeta(event.type);
  const severity = severityOf(event);
  const priority = PRIORITY_CLASS[severity];
  const handled = isHandled(event);
  const recent = now - Date.parse(event.occurred_at) < 12 * 3_600_000;
  const spanMin = Math.max(1, Math.round((Date.parse(group.lastAt) - Date.parse(group.firstAt)) / 60_000));
  const detail = detailOf(event);
  // The drive / tool / site shows once: as a chip only when the sentence doesn't already name it.
  const subjectChip =
    group.subject && !detail.toLowerCase().includes(group.subject.toLowerCase()) ? group.subject : null;
  const detailId = `al-detail-${event.id}`;

  return (
    <div className={cx("al-item", open && "is-open", handled && "is-handled")}>
    <div className={`al-row al-row--${priority}`}>
      <span className="al-alert">
        <span className={`act-mark act-mark--${priority}`} aria-hidden="true">
          <DashIcon name={priority === "low" ? TYPE_ICON[meta.feature] : "alert"} />
        </span>
        <span className="al-alert__text">
          <button type="button" className="al-toggle" aria-expanded={open} aria-controls={detailId} onClick={onToggle}>
            <b>
              {alertLabel(event)}
              {subjectChip ? <span className="al-subject">{subjectChip}</span> : null}
            </b>
            <small className="al-detail">{detail}</small>
          </button>
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
      <span data-label="Status" className="al-status">
        <span className={`act-pri act-pri--${priority}`}>{SEVERITY_LABEL[severity]}</span>
        {handled ? (
          <small className="dash-alerts__handled">
            <DashIcon name="check" />
            Handled
          </small>
        ) : null}
      </span>
      <span className="al-when" data-label="When">
        <time dateTime={event.occurred_at} title={formatDateTime(event.occurred_at)}>
          {recent ? formatRelative(event.occurred_at, now) : formatTime(event.occurred_at)}
        </time>
        {recent ? <small>{formatTime(event.occurred_at)}</small> : null}
      </span>
      <span className="al-action">
        <SendAlertMenu
          event={event}
          person={person ? { id: person.id, name: person.name, email: person.email } : undefined}
          onChanged={onChanged}
        />
      </span>
    </div>
      {event.type === "data.usb_locked_down" && device?.usb_locked_at ? (
        <div className="al-usb">
          <UsbRestore device={device} onRestored={onDevicesChanged} />
        </div>
      ) : null}
      {open ? (
        <div className="dash-alerts__detail al-more" id={detailId}>
          <p className="dash-alerts__full">{detail}</p>
          {meta.meaning ? (
            <p className="dash-alerts__meaning">
              <b>What it means</b> {meta.meaning}
            </p>
          ) : null}
          {meta.suggested ? (
            <p className="dash-alerts__meaning">
              <b>Suggested message</b> {meta.suggested}
            </p>
          ) : null}
          <p className="dash-alerts__when">
            {formatDateTime(event.occurred_at)} · {event.hostname || "a PC"}
            {person ? ` · ${person.name}` : ""}
            {handled && event.handled_by ? ` · handled by ${event.handled_by}` : ""}
          </p>
          <p className="dash-alerts__links">
            <Link className="dash-link" to={meta.reviewTo}>
              {meta.reviewTo === "/app/team" ? "Restore USB on Team & devices" : "Review the rule"} <DashIcon name="arrow" />
            </Link>
          </p>
        </div>
      ) : null}
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
  priority: Priority;
  type: FeatureKey | "all";
  counts: Record<Priority, number>;
  onPriority: (value: Priority) => void;
  onType: (value: FeatureKey | "all") => void;
}): ReactElement {
  return (
    <div className="act-filters">
      <div className="dash-range" role="group" aria-label="Filter by priority">
        {FILTERS.map((value) => (
          <button
            key={value}
            type="button"
            className={cx("dash-range__btn", priority === value && "is-on")}
            aria-pressed={priority === value}
            onClick={() => onPriority(value)}
          >
            {value === "all" ? "All" : `${FILTER_LABEL[value]} (${counts[value]})`}
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
