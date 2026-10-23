import { useCallback, useState, type ReactElement } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { usePageMeta } from "../../hooks/usePageMeta";
import {
  downloadReport,
  errorMessage,
  getReport,
  listMembers,
  type MetricTopItem,
  type ReportPerson,
  type TeamReport,
} from "../../lib/api";
import { cx } from "../../lib/cx";
import { formatDate, friendlyDuration } from "../../lib/format";
import { DashIcon } from "../components/DashIcon";
import { PlanLock } from "../components/PlanLock";
import { ReportChart } from "../components/reports/ReportChart";
import { ReportDeliveries } from "../components/reports/ReportDeliveries";
import { ReportSchedules } from "../components/reports/ReportSchedules";
import { ShareReportDialog } from "../components/reports/ShareReportDialog";
import { StatTiles, type StatTile } from "../components/StatTiles";
import { EmptyState, ErrorState, LoadingState, PageHeader, RefreshButton } from "../components/States";
import { Modal } from "../components/Modal";
import { Toast } from "../components/Toast";
import { useEntitlements } from "../features/entitlements";
import { formatBytes } from "../features/metrics";
import { clockOf, dayLabel } from "../features/reportFormat";
import { appSource, mergeBySource, siteSource } from "../features/usageSources";
import { isoDay, shiftDay } from "../features/workDay";
import { useNow } from "../time";
import { useResource } from "../useResource";

type Preset = "today" | "yesterday" | "week" | "last_week" | "month" | "last_month" | "custom";
type View = "report" | "schedules" | "sent";

const PRESETS: ReadonlyArray<{ key: Preset; label: string }> = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "week", label: "This week" },
  { key: "last_week", label: "Last week" },
  { key: "month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "custom", label: "Custom dates" },
];

const VIEWS: ReadonlyArray<{ key: View; label: string; icon: "file" | "clock" | "mail" }> = [
  { key: "report", label: "Report", icon: "file" },
  { key: "schedules", label: "Scheduled", icon: "clock" },
  { key: "sent", label: "Sent", icon: "mail" },
];

/** The first and last day of a preset (weeks start on Monday). */
function periodFor(preset: Exclude<Preset, "custom">, today: string): [string, string] {
  const [y, m, d] = today.split("-").map(Number);
  const now = new Date(y, m - 1, d);
  const monday = shiftDay(today, -((now.getDay() + 6) % 7));
  switch (preset) {
    case "today":
      return [today, today];
    case "yesterday":
      return [shiftDay(today, -1), shiftDay(today, -1)];
    case "week":
      return [monday, today];
    case "last_week":
      return [shiftDay(monday, -7), shiftDay(monday, -1)];
    case "month":
      return [isoDay(new Date(y, m - 1, 1)), today];
    case "last_month":
      return [isoDay(new Date(y, m - 2, 1)), isoDay(new Date(y, m - 1, 0))];
  }
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function periodText(r: TeamReport): string {
  return r.from === r.to ? formatDate(r.from) : `${formatDate(r.from)} to ${formatDate(r.to)}`;
}

function TopList({
  title,
  items,
  nameOf,
  value,
}: {
  title: string;
  items: MetricTopItem[];
  nameOf?: (key: string) => string;
  value: (item: MetricTopItem & { bytes?: number }) => string;
}): ReactElement | null {
  const rows = nameOf
    ? mergeBySource(items, nameOf, 8)
        .sort((a, b) => b.seconds - a.seconds)
        .map((r) => ({ key: r.key, text: friendlyDuration(r.seconds) }))
    : items.slice(0, 8).map((i) => ({ key: i.key, text: value(i) }));
  if (rows.length === 0) return null;
  return (
    <section className="dash-card rpt-top" aria-label={title}>
      <h2 className="dash-card__title">{title}</h2>
      <ol>
        {rows.map((r) => (
          <li key={r.key}>
            <span>{r.key}</span>
            <b>{r.text}</b>
          </li>
        ))}
      </ol>
    </section>
  );
}

function PeopleTable({
  report,
  onOpen,
}: {
  report: TeamReport;
  onOpen: (person: ReportPerson) => void;
}): ReactElement {
  const showActive = report.totals.active_seconds > 0;
  const showData = report.totals.data_bytes > 0;
  return (
    <section className="dash-card" aria-labelledby="rpt-people">
      <div className="dash-card__head">
        <h2 className="dash-card__title" id="rpt-people">
          By person
        </h2>
        <p className="dash-card__sub">Click a name to see that person's own report.</p>
      </div>
      {report.people.length === 0 ? (
        <EmptyState icon="clock" title="Nothing in this period">
          No one logged in from their Zinwe widget, and there were no alerts. Try a longer period.
        </EmptyState>
      ) : (
        <div className="rpt-scroll">
          <table className="rpt-table">
            <thead>
              <tr>
                <th scope="col">Person</th>
                <th scope="col">Days</th>
                <th scope="col">Worked</th>
                <th scope="col">A day</th>
                <th scope="col">On breaks</th>
                <th scope="col">Usual start</th>
                <th scope="col">Usual finish</th>
                {showActive ? <th scope="col">Active on PC</th> : null}
                {showData ? <th scope="col">Internet data</th> : null}
                <th scope="col">Your OK</th>
                <th scope="col">Alerts</th>
              </tr>
            </thead>
            <tbody>
              {report.people.map((p) => (
                <tr key={`${p.member_id ?? "pc"}-${p.name}`}>
                  <th scope="row">
                    {p.member_id ? (
                      <button type="button" className="rpt-name" onClick={() => onOpen(p)}>
                        {p.name}
                        <DashIcon name="chevron" />
                      </button>
                    ) : (
                      <span title="This PC isn't linked to a team member">{p.name}</span>
                    )}
                  </th>
                  <td>{p.days_worked}</td>
                  <td>{friendlyDuration(p.worked_seconds)}</td>
                  <td>{p.days_worked ? friendlyDuration(p.worked_seconds / p.days_worked) : "—"}</td>
                  <td>
                    {friendlyDuration(p.break_seconds)}
                    {p.breaks ? <small> ({p.breaks})</small> : null}
                  </td>
                  <td>{clockOf(p.first_in)}</td>
                  <td>{clockOf(p.last_out)}</td>
                  {showActive ? <td>{friendlyDuration(p.active_seconds)}</td> : null}
                  {showData ? <td>{p.data_bytes ? formatBytes(p.data_bytes) : "—"}</td> : null}
                  <td className={cx(p.to_review > 0 && "rpt-warn")}>{p.to_review > 0 ? `${p.to_review} waiting` : "—"}</td>
                  <td>{p.alerts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {report.no_activity.length > 0 ? (
        <p className="dash-note">
          <b>No activity:</b> {report.no_activity.join(", ")}
        </p>
      ) : null}
    </section>
  );
}

function PersonDays({ report }: { report: TeamReport }): ReactElement {
  const days = report.person_days ?? [];
  const member = report.member;
  return (
    <section className="dash-card" aria-labelledby="rpt-days">
      <div className="dash-card__head">
        <h2 className="dash-card__title" id="rpt-days">
          Each day
        </h2>
        <p className="dash-card__sub">Open a day to see every log-in, break and log-out on Activity.</p>
      </div>
      {days.length === 0 ? (
        <EmptyState icon="clock" title="Nothing recorded in this period">
          {member?.name ?? "They"} didn't log in from the Zinwe widget on these days. Try a longer period.
        </EmptyState>
      ) : (
        <div className="rpt-scroll">
          <table className="rpt-table">
            <thead>
              <tr>
                <th scope="col">Day</th>
                <th scope="col">Started</th>
                <th scope="col">Finished</th>
                <th scope="col">Worked</th>
                <th scope="col">On breaks</th>
                <th scope="col">Active on PC</th>
                <th scope="col">Alerts</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <tr key={d.date}>
                  <th scope="row">
                    {member ? (
                      <Link className="dash-link" to={`/app/activity?member=${member.id}&date=${d.date}`}>
                        {dayLabel(d.date)}
                      </Link>
                    ) : (
                      dayLabel(d.date)
                    )}
                  </th>
                  <td>{clockOf(d.first_in)}</td>
                  <td>{clockOf(d.last_out)}</td>
                  <td>{friendlyDuration(d.worked_seconds)}</td>
                  <td>
                    {friendlyDuration(d.break_seconds)}
                    {d.breaks ? <small> ({d.breaks})</small> : null}
                  </td>
                  <td>{d.active_seconds ? friendlyDuration(d.active_seconds) : "—"}</td>
                  <td>{d.alerts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function tilesFor(r: TeamReport): StatTile[] {
  const t = r.totals;
  const avg = t.person_days ? t.worked_seconds / t.person_days : 0;
  if (r.member) {
    const p = r.people[0];
    return [
      { value: String(t.person_days), label: t.person_days === 1 ? "day worked" : "days worked", icon: "clock" },
      { value: friendlyDuration(t.worked_seconds), label: "worked in total" },
      { value: friendlyDuration(avg), label: "average a day" },
      { value: friendlyDuration(t.break_seconds), label: `on breaks (${t.breaks})` },
      { value: clockOf(p?.first_in), label: "usual start", hint: "The average time of their first log-in" },
      { value: clockOf(p?.last_out), label: "usual finish", hint: "The average time they logged out" },
      ...(t.active_seconds ? [{ value: friendlyDuration(t.active_seconds), label: "active on the PC" }] : []),
      ...(t.data_bytes ? [{ value: formatBytes(t.data_bytes), label: "internet data" }] : []),
      { value: String(t.alerts_all), label: t.alerts_all === 1 ? "alert" : "alerts", tone: t.alerts_all ? "warn" : undefined },
    ];
  }
  return [
    { value: String(t.people_worked), label: t.people_worked === 1 ? "person worked" : "people worked", icon: "team" },
    { value: friendlyDuration(t.worked_seconds), label: "worked in total" },
    { value: friendlyDuration(avg), label: "average a person-day", hint: "Time worked divided by the days people worked" },
    { value: friendlyDuration(t.break_seconds), label: "on breaks" },
    ...(t.active_seconds ? [{ value: friendlyDuration(t.active_seconds), label: "active on the PC" }] : []),
    ...(t.data_bytes ? [{ value: formatBytes(t.data_bytes), label: "internet data" }] : []),
    { value: String(t.to_review), label: "waiting for your OK", tone: t.to_review > 0 ? "warn" : undefined },
    { value: String(t.alerts_all), label: t.alerts_all === 1 ? "alert" : "alerts" },
  ];
}

/**
 * Reports (FR-17, FR-22): the team, or one person, for any period. Click a name for that person's own report
 * (their days, usual start and finish, top apps). Download as CSV (every plan) or PDF, email it now, or have
 * Zinwe email it daily / weekly / monthly (reports_pro). "Sent" lists every report that went out.
 */
export default function ReportsPage(): ReactElement {
  usePageMeta({ title: "Reports — Zinwe", description: "Your team's work, breaks and alerts for any period." });
  const { user } = useAuth();
  const ownerEmail = user?.email ?? "";
  const { has } = useEntitlements();
  const pro = has("reports_pro");
  const today = isoDay(new Date(useNow(60_000)));
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const view: View = params.get("view") === "schedules" ? "schedules" : params.get("view") === "sent" ? "sent" : "report";
  const memberParam = Number(params.get("member"));
  const memberId = Number.isInteger(memberParam) && memberParam > 0 ? memberParam : null;
  // A link from a report email carries its period.
  const linked: [string, string] | null =
    ISO.test(params.get("from") ?? "") && ISO.test(params.get("to") ?? "") ? [params.get("from")!, params.get("to")!] : null;
  const [preset, setPreset] = useState<Preset>(linked ? "custom" : "week");
  const [custom, setCustom] = useState<[string, string]>(() => linked ?? periodFor("week", today));
  const [from, to] = preset === "custom" ? custom : periodFor(preset, today);
  // Custom dates start from the period on screen, so the calendar opens on what you were looking at.
  const pickPreset = (next: Preset) => {
    if (next === "custom" && preset !== "custom") setCustom([from, to]);
    setPreset(next);
  };
  const [downloading, setDownloading] = useState<"csv" | "pdf" | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [locked, setLocked] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [scheduleNew, setScheduleNew] = useState(false);
  const [sentKey, setSentKey] = useState(0);

  const loadMembers = useCallback((signal: AbortSignal) => listMembers(signal), []);
  const members = useResource(loadMembers);
  const activeMembers = (members.data ?? []).filter((m) => m.is_active);

  const load = useCallback((signal: AbortSignal) => getReport(from, to, signal, memberId), [from, to, memberId]);
  const report = useResource(load, { resetKey: `${from}|${to}|${memberId ?? ""}` });
  const r = report.data;
  const title = r?.member ? `${r.member.name}'s report` : "Team report";

  const setView = (next: View) => {
    const p = new URLSearchParams(params);
    if (next === "report") p.delete("view");
    else p.set("view", next);
    setParams(p);
  };
  const setMember = (id: number | null) => {
    const p = new URLSearchParams(params);
    if (id) p.set("member", String(id));
    else p.delete("member");
    p.delete("view");
    setParams(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const download = async (format: "csv" | "pdf") => {
    if (format === "pdf" && !pro) return setLocked(true);
    setDownloading(format);
    setDownloadError(null);
    try {
      await downloadReport(from, to, memberId, format);
    } catch (err) {
      setDownloadError(errorMessage(err));
    } finally {
      setDownloading(null);
    }
  };

  const clearToast = useCallback(() => setToast(null), []);

  return (
    <>
      <PageHeader
        title="Reports"
        lede="Your team's work, breaks and alerts for any period. Download it, email it, or get it on a schedule."
        actions={
          view === "report" ? (
            <>
              <RefreshButton onClick={report.reload} pending={report.pending} />
              <button
                type="button"
                className="btn btn--ghost dash-btn-sm"
                onClick={() => void download("csv")}
                disabled={downloading !== null}
              >
                <DashIcon name="download" />
                {downloading === "csv" ? "Preparing…" : "CSV"}
              </button>
              <button
                type="button"
                className="btn btn--ghost dash-btn-sm"
                onClick={() => void download("pdf")}
                disabled={downloading !== null}
              >
                {pro ? <DashIcon name="file" /> : <DashIcon name="lock" />}
                {downloading === "pdf" ? "Preparing…" : "PDF"}
              </button>
              <button
                type="button"
                className="btn btn--primary dash-btn-sm"
                onClick={() => (pro ? setSharing(true) : setLocked(true))}
                disabled={!r}
              >
                {pro ? <DashIcon name="send" /> : <DashIcon name="lock" />}
                Email report
              </button>
            </>
          ) : null
        }
      />

      <nav className="dash-tabs rpt-views" aria-label="Reports">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            className={cx("dash-tabs__link", view === v.key && "active")}
            aria-current={view === v.key ? "page" : undefined}
            onClick={() => setView(v.key)}
          >
            <DashIcon name={v.icon} />
            <span>{v.label}</span>
          </button>
        ))}
      </nav>

      {view === "schedules" ? (
        <ReportSchedules
          members={activeMembers}
          ownerEmail={ownerEmail}
          onToast={(message) => {
            setToast(message);
            setSentKey((k) => k + 1);
          }}
          openNew={scheduleNew}
          onNewHandled={() => setScheduleNew(false)}
          seedMember={memberId}
        />
      ) : view === "sent" ? (
        <ReportDeliveries refreshKey={sentKey} />
      ) : (
        <>
          {downloadError ? (
            <p className="form__err" role="alert">
              {downloadError}
            </p>
          ) : null}

          <div className="rpt-controls">
            <label className="dash-filter rpt-who">
              <span>Report about</span>
              <select value={memberId ?? ""} onChange={(e) => setMember(e.target.value ? Number(e.target.value) : null)}>
                <option value="">Everyone</option>
                {activeMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
                {memberId && !activeMembers.some((m) => m.id === memberId) && r?.member ? (
                  <option value={memberId}>{r.member.name}</option>
                ) : null}
              </select>
            </label>
            <div className="rpt-when">
              <label className="dash-filter rpt-period-pick">
                <span>Period</span>
                <select value={preset} onChange={(e) => pickPreset(e.target.value as Preset)}>
                  {PRESETS.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className={cx("rpt-cal", preset === "custom" && "is-on")}
                aria-pressed={preset === "custom"}
                aria-label="Pick your own dates"
                title="Pick your own dates"
                onClick={() => pickPreset(preset === "custom" ? "week" : "custom")}
              >
                <DashIcon name="calendar" />
              </button>
            </div>
            {preset === "custom" ? (
              <span className="rpt-dates">
                <label className="dash-filter">
                  <span>From</span>
                  <input type="date" value={custom[0]} max={custom[1]} onChange={(e) => e.target.value && setCustom([e.target.value, custom[1]])} />
                </label>
                <label className="dash-filter">
                  <span>To</span>
                  <input type="date" value={custom[1]} min={custom[0]} max={today} onChange={(e) => e.target.value && setCustom([custom[0], e.target.value])} />
                </label>
              </span>
            ) : null}
            {r ? (
              <p className="rpt-range">
                {periodText(r)} · {r.days} {r.days === 1 ? "day" : "days"}
                {r.from !== from ? " (your plan keeps history from this day)" : ""}
              </p>
            ) : null}
          </div>

          {memberId && r?.member ? (
            <div className="rpt-person">
              <button type="button" className="btn btn--ghost dash-btn-sm" onClick={() => setMember(null)}>
                <DashIcon name="back" />
                Everyone
              </button>
              <div className="rpt-person__who">
                <h2>{r.member.name}</h2>
                <p className="dash-note">{r.member.email}</p>
              </div>
              <Link className="dash-link" to={`/app/activity?member=${r.member.id}&date=${r.to}`}>
                Open their day on Activity
              </Link>
            </div>
          ) : null}

          {r === undefined ? (
            report.error ? (
              <ErrorState message={errorMessage(report.error)} onRetry={report.reload} retrying={report.pending} />
            ) : (
              <LoadingState label="Preparing the report…" rows={4} />
            )
          ) : (
            <>
              <StatTiles wide className="rpt-tiles" label="The period at a glance" tiles={tilesFor(r)} />
              <ReportChart
                report={r}
                onPerson={(id) => setMember(id)}
                onDay={(date) => r.member && navigate(`/app/activity?member=${r.member.id}&date=${date}`)}
              />
              {r.member ? <PersonDays report={r} /> : <PeopleTable report={r} onOpen={(p) => setMember(p.member_id)} />}
              <div className="rpt-tops">
                <TopList title="Top apps" items={r.top_apps} nameOf={appSource} value={(i) => friendlyDuration(i.seconds)} />
                <TopList title="Top websites" items={r.top_sites} nameOf={siteSource} value={(i) => friendlyDuration(i.seconds)} />
                <TopList title="Most internet data" items={r.top_data} value={(i) => formatBytes(i.bytes ?? 0)} />
              </div>
            </>
          )}
        </>
      )}

      {sharing && r ? (
        <ShareReportDialog
          open
          onClose={() => setSharing(false)}
          onSent={(d) => {
            setSharing(false);
            setSentKey((k) => k + 1);
            setToast(d.status === "skipped" || d.status === "failed" ? d.detail : `Report sent. ${d.detail}`);
          }}
          onSchedule={() => {
            setSharing(false);
            setScheduleNew(true);
            setView("schedules");
          }}
          from={r.from}
          to={r.to}
          title={title}
          period={periodText(r)}
          memberId={r.member?.id ?? null}
          personName={r.member?.name ?? null}
          ownerEmail={ownerEmail}
        />
      ) : null}

      <Modal open={locked} onClose={() => setLocked(false)} title="PDF, emailed and scheduled reports" size="sm">
        <PlanLock module="reports_pro" compact>
          Download reports as a PDF, email them to yourself, a manager or each person, and have Zinwe send them every
          day, week or month.
        </PlanLock>
      </Modal>

      <Toast message={toast} onDone={clearToast} />
    </>
  );
}
