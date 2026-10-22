import { useCallback, useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { usePageMeta } from "../../hooks/usePageMeta";
import { downloadReport, errorMessage, getReport, type MetricTopItem } from "../../lib/api";
import { cx } from "../../lib/cx";
import { formatDate, friendlyDuration } from "../../lib/format";
import { DashIcon } from "../components/DashIcon";
import { StatTiles } from "../components/StatTiles";
import { EmptyState, ErrorState, LoadingState, PageHeader, RefreshButton } from "../components/States";
import { appSource, mergeBySource, siteSource } from "../features/usageSources";
import { isoDay, shiftDay } from "../features/workDay";
import { useNow } from "../time";
import { useResource } from "../useResource";

type Preset = "today" | "yesterday" | "week" | "month" | "last_month" | "custom";

const PRESETS: ReadonlyArray<{ key: Preset; label: string }> = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "custom", label: "Pick dates" },
];

/** The first and last day of a preset (weeks start on Monday). */
function periodFor(preset: Exclude<Preset, "custom">, today: string): [string, string] {
  const [y, m, d] = today.split("-").map(Number);
  const now = new Date(y, m - 1, d);
  switch (preset) {
    case "today":
      return [today, today];
    case "yesterday":
      return [shiftDay(today, -1), shiftDay(today, -1)];
    case "week":
      return [shiftDay(today, -((now.getDay() + 6) % 7)), today];
    case "month":
      return [isoDay(new Date(y, m - 1, 1)), today];
    case "last_month":
      return [isoDay(new Date(y, m - 2, 1)), isoDay(new Date(y, m - 1, 0))];
  }
}

function TopList({
  title,
  items,
  nameOf,
}: {
  title: string;
  items: MetricTopItem[];
  nameOf: (key: string) => string;
}): ReactElement | null {
  const rows = mergeBySource(items, nameOf, 8).sort((a, b) => b.seconds - a.seconds);
  if (rows.length === 0) return null;
  return (
    <section className="dash-card rpt-top" aria-label={title}>
      <h2 className="dash-card__title">{title}</h2>
      <ol>
        {rows.map((r) => (
          <li key={r.key}>
            <span>{r.key}</span>
            <b>{friendlyDuration(r.seconds)}</b>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * Reports (FR-17): the team for any period — a day, this week, this month, last month or picked dates. Per
 * person: days worked, time worked and on breaks, breaks and log-outs, what still waits for the owner's OK, and
 * alerts; plus the top apps and websites. "Download CSV" gives the same numbers for Excel or Google Sheets.
 */
export default function ReportsPage(): ReactElement {
  usePageMeta({ title: "Reports — Zinwe", description: "Your team's work, breaks and alerts for any period." });
  const today = isoDay(new Date(useNow(60_000)));
  const [preset, setPreset] = useState<Preset>("week");
  const [custom, setCustom] = useState<[string, string]>(() => periodFor("week", today));
  const [from, to] = preset === "custom" ? custom : periodFor(preset, today);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const load = useCallback((signal: AbortSignal) => getReport(from, to, signal), [from, to]);
  const report = useResource(load, { resetKey: `${from}|${to}` });
  const r = report.data;

  const download = async () => {
    setDownloading(true);
    setDownloadError(null);
    try {
      await downloadReport(from, to);
    } catch (err) {
      setDownloadError(errorMessage(err));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Reports"
        lede="Your team's work, breaks and alerts for any period. Download it to share or keep."
        actions={
          <>
            <RefreshButton onClick={report.reload} pending={report.pending} />
            <button
              type="button"
              className="btn btn--primary dash-btn-sm"
              onClick={() => void download()}
              disabled={downloading}
            >
              <DashIcon name="download" />
              {downloading ? "Preparing…" : "Download CSV"}
            </button>
          </>
        }
      />
      {downloadError ? (
        <p className="form__err" role="alert">
          {downloadError}
        </p>
      ) : null}

      <div className="rpt-period" role="group" aria-label="Period">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            className={cx("rpt-chip", preset === p.key && "is-on")}
            aria-pressed={preset === p.key}
            onClick={() => setPreset(p.key)}
          >
            {p.label}
          </button>
        ))}
        {preset === "custom" ? (
          <span className="rpt-dates">
            <label className="dash-filter">
              <span>From</span>
              <input
                type="date"
                value={custom[0]}
                max={today}
                onChange={(e) => e.target.value && setCustom([e.target.value, custom[1]])}
              />
            </label>
            <label className="dash-filter">
              <span>To</span>
              <input
                type="date"
                value={custom[1]}
                max={today}
                onChange={(e) => e.target.value && setCustom([custom[0], e.target.value])}
              />
            </label>
          </span>
        ) : null}
      </div>
      {r ? (
        <p className="dash-note rpt-range">
          {r.from === r.to ? formatDate(r.from) : `${formatDate(r.from)} to ${formatDate(r.to)}`} · {r.days}{" "}
          {r.days === 1 ? "day" : "days"}
          {r.from !== from ? " (your plan keeps history from this day)" : ""}
        </p>
      ) : null}

      {r === undefined ? (
        report.error ? (
          <ErrorState message={errorMessage(report.error)} onRetry={report.reload} retrying={report.pending} />
        ) : (
          <LoadingState label="Preparing the report…" rows={4} />
        )
      ) : (
        <>
          <StatTiles
            wide
            label="The period at a glance"
            tiles={[
              { value: String(r.people.filter((p) => p.days_worked > 0).length), label: "people worked" },
              { value: friendlyDuration(r.totals.worked_seconds), label: "worked in total" },
              { value: friendlyDuration(r.totals.break_seconds), label: "on breaks" },
              {
                value: String(r.totals.to_review),
                label: "waiting for your OK",
                tone: r.totals.to_review > 0 ? ("warn" as const) : undefined,
              },
              { value: String(r.totals.alerts_all), label: r.totals.alerts_all === 1 ? "alert" : "alerts" },
            ]}
          />

          <section className="dash-card" aria-labelledby="rpt-people">
            <div className="dash-card__head">
              <h2 className="dash-card__title" id="rpt-people">
                By person
              </h2>
              <p className="dash-card__sub">Click a name to open their day on Activity.</p>
            </div>
            {r.people.length === 0 ? (
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
                      <th scope="col">On breaks</th>
                      <th scope="col">Breaks</th>
                      <th scope="col">Log-outs</th>
                      <th scope="col">Your OK</th>
                      <th scope="col">Alerts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.people.map((p) => (
                      <tr key={`${p.member_id ?? "pc"}-${p.name}`}>
                        <th scope="row">
                          {p.member_id ? (
                            <Link className="dash-link" to={`/app/activity?member=${p.member_id}&date=${r.to}`}>
                              {p.name}
                            </Link>
                          ) : (
                            p.name
                          )}
                        </th>
                        <td>{p.days_worked}</td>
                        <td>{friendlyDuration(p.worked_seconds)}</td>
                        <td>{friendlyDuration(p.break_seconds)}</td>
                        <td>{p.breaks}</td>
                        <td>{p.logouts}</td>
                        <td className={cx(p.to_review > 0 && "rpt-warn")}>
                          {p.to_review > 0 ? `${p.to_review} waiting` : "—"}
                        </td>
                        <td>{p.alerts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {r.no_activity.length > 0 ? (
              <p className="dash-note">
                <b>No activity:</b> {r.no_activity.join(", ")}
              </p>
            ) : null}
          </section>

          <div className="rpt-tops">
            <TopList title="Top apps" items={r.top_apps} nameOf={appSource} />
            <TopList title="Top websites" items={r.top_sites} nameOf={siteSource} />
          </div>
        </>
      )}
    </>
  );
}
