import { useCallback, useMemo, useState, type FocusEvent, type MouseEvent, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { usePageMeta } from "../../hooks/usePageMeta";
import { getTopMetrics, type DeviceEvent, type MetricCategory, type MetricTopItem, type UsbMode } from "../../lib/api";
import { ScopeBanner } from "../components/AnalyticsScope";
import { MetricsDisclosure } from "../components/MetricsDisclosure";
import { PlanLock } from "../components/PlanLock";
import { UsbRestore } from "../components/UsbRestore";
import { useAnalyticsScope } from "../features/analyticsScope";
import { useEntitlements } from "../features/entitlements";
import { FEATURE_EVENT_TYPES, isHandled, severityOf } from "../features/events";
import { formatBytes, totalFor, toChartRows, type SeriesSpec } from "../features/metrics";
import { filterEvents, useFeatureData } from "../features/useFeatureData";
import { usePolicy } from "../features/usePolicy";
import { AskButton, AskSheet, CardError, HeaderFilters, ProtectionTabs, Tile, type AskTarget } from "../protection/parts";
import { firstName, LEVEL, plural, whenText, withinDays } from "../protection/helpers";
import { PageHead } from "../shell/PageHead";
import { EmptyBlock, SkRows, ZToast } from "../ui/States";
import { TipBody } from "../ui/Tooltip";
import { useTip } from "../ui/useTip";
import { useResource } from "../useResource";
import "../../styles/dash13/protection.css";

const DATA_COLLECTED = [
  { label: "USB copies", detail: "When files are copied to a pen drive — how many and the total size, plus which drive." },
  { label: "Network-share copies", detail: "Files copied to another PC or shared folder — count, size and the destination." },
  { label: "Email attachments", detail: "Attachments sent from classic desktop Outlook — count and total size." },
  { label: "Web uploads", detail: "Data sent from browsers and mail apps to websites and webmail (Gmail, New Outlook, Drive…) — the site name and size only, while Online protection is on. A large upload to one site shows under Data alerts." },
  { label: "USB rule in force", detail: "Whether USB drives are allowed, read-only, or blocked on each PC." },
];
const DATA_NEVER = [
  "The contents of any file copied or sent",
  "Keystrokes or screenshots",
  "File names or email subjects (unless you turn that on in Rules)",
  "Personal drives of people outside your team",
];

type Route = "usb" | "net" | "web" | "email";
const ROUTES: readonly Route[] = ["usb", "net", "web", "email"];
const R: Record<Route, { label: string; color: string; category: MetricCategory; phrase: string }> = {
  usb: { label: "USB drives", color: "#F26A0A", category: "transfer.usb", phrase: "copy to a pen drive" },
  net: { label: "Shared folders", color: "#141210", category: "transfer.lan", phrase: "copy to a shared folder" },
  web: { label: "Web uploads", color: "#1B6FB0", category: "net.upload", phrase: "upload" },
  email: { label: "Email", color: "#8F877A", category: "transfer.email", phrase: "email attachment" },
};
const SPECS: SeriesSpec[] = ROUTES.map((k) => ({ category: R[k].category, field: "bytes", label: k }));
const TYPES = FEATURE_EVENT_TYPES.data;
/** The alert types that are one transfer (a size, a destination). */
const TRANSFER_TYPES: Record<string, Route> = {
  "data.usb_copy": "usb",
  "data.usb_locked_down": "usb",
  "data.share_copy": "net",
  "data.email_attachment": "email",
  "net.upload_over_limit": "web",
};
const PERIODS = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
] as const;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const ROWS_SHOWN = 8;
const USB_WORD: Record<UsbMode, string> = { allow: "Allowed, noted", read_only: "Read-only", block: "Blocked" };

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}
function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** A share path stored with doubled backslashes (four before the server name) reads as Windows shows it. */
function sharePath(key: string): string {
  return key.startsWith("\\\\\\\\") ? key.replace(/\\\\/g, "\\") : key;
}

interface Bucket {
  key: string;
  l: string;
  full: string;
  v: Record<Route, number>;
}

interface TransferRow {
  key: string;
  route: Route;
  who: string;
  pc: string;
  dest: string;
  bytes: number;
  when: string;
  event?: DeviceEvent;
  memberId?: number;
}

function useTop(category: MetricCategory, days: number, member: number | null) {
  const load = useCallback((s: AbortSignal) => getTopMetrics({ category, days, member: member ?? undefined, limit: 20 }, s), [category, days, member]);
  return useResource(load, { resetKey: `${days}:${member ?? "all"}` });
}

/**
 * DashData. USB drive and file-copy alerts are on every plan. Plan enforcement: blocking USB drives (usb_control)
 * and files leaving by network, Outlook or upload (data_transfer) are Startups.
 */
export default function DataPage(): ReactElement {
  usePageMeta({ title: "Data safety — Zinwe", description: "Where data leaves your PCs: pen drives, shared folders, email and uploads." });
  const { has } = useEntitlements();
  const usbControl = has("usb_control");
  const transfersOn = has("data_transfer");
  const tip = useTip();

  const scope = useAnalyticsScope();
  const { member } = scope;
  const days = scope.days === 30 ? 30 : 7;
  const { metrics, events, devices, now, resolveMember } = useFeatureData(days, member, TYPES);
  const { policy } = usePolicy();
  const usbTop = useTop("transfer.usb", days, member);
  const lanTop = useTop("transfer.lan", days, member);
  const emailTop = useTop("transfer.email", days, member);
  const webTop = useTop("net.upload", days, member);

  const [hidden, setHidden] = useState<Route[]>([]);
  const [hov, setHov] = useState<number | null>(null);
  const [allRows, setAllRows] = useState(false);
  const [ask, setAsk] = useState<AskTarget | null>(null);
  const [asked, setAsked] = useState<Record<number, true>>({});
  const [toast, setToast] = useState<string | null>(null);
  const closeToast = useCallback(() => setToast(null), []);

  const who = scope.person;
  const shown = ROUTES.filter((k) => !hidden.includes(k));
  const loadingMetrics = metrics.data === undefined && !metrics.error;
  const cat = (k: Route) => (metrics.data ? totalFor(metrics.data.categories, [R[k].category], "total_bytes") : 0);
  const routeTotal: Record<Route, number> = { usb: cat("usb"), net: cat("net"), web: cat("web"), email: cat("email") };
  const total = ROUTES.reduce((a, k) => a + routeTotal[k], 0);

  // Chart buckets: one per day (7 days) or per week (30 days), newest last.
  const buckets: Bucket[] = useMemo(() => {
    if (!metrics.data) return [];
    const rows = toChartRows(metrics.data.series, SPECS, days).slice(-days);
    const val = (r: (typeof rows)[number]) => Object.fromEntries(ROUTES.map((k) => [k, Number(r[k]) || 0])) as Record<Route, number>;
    if (days <= 7) {
      return rows.map((r, i) => {
        const d = new Date(r.t);
        const last = i === rows.length - 1;
        const yest = i === rows.length - 2;
        return {
          key: String(r.t),
          l: last ? "Today" : `${DOW[d.getDay()]} ${d.getDate()}`,
          full: `${DOW_LONG[d.getDay()]}, ${d.getDate()} ${MON_LONG[d.getMonth()]}${last ? " (today)" : yest ? " (yesterday)" : ""}`,
          v: val(r),
        };
      });
    }
    // Weeks of 7 days, counted back from today (the oldest may be shorter).
    const out: Bucket[] = [];
    for (let end = rows.length; end > 0; end -= 7) {
      const part = rows.slice(Math.max(0, end - 7), end);
      const v = { usb: 0, net: 0, web: 0, email: 0 };
      for (const r of part) for (const k of ROUTES) v[k] += Number(r[k]) || 0;
      const a = new Date(part[0].t);
      const b = new Date(part[part.length - 1].t);
      out.unshift({ key: String(part[0].t), l: "", full: `${a.getDate()} ${MON[a.getMonth()]} to ${b.getDate()} ${MON[b.getMonth()]}`, v });
    }
    return out.map((b, i) => ({ ...b, l: `Wk ${i + 1}`, full: `Week ${i + 1} (${b.full})` }));
  }, [metrics.data, days]);
  const dayTotal = (b: Bucket) => shown.reduce((a, k) => a + b.v[k], 0);
  const max = Math.max(1, ...buckets.map(dayTotal));
  const chartEmpty = buckets.every((b) => ROUTES.every((k) => b.v[k] <= 0));
  const sz = (v: number) => (v > 0 ? formatBytes(v) : "0");

  // Transfers: every transfer alert in the period, then each destination's total that had no alert.
  const alerts = useMemo(() => withinDays(filterEvents(events.data, TYPES), days, now), [events.data, days, now]);
  const transferAlerts = useMemo(() => {
    const list = alerts.filter((e) => TRANSFER_TYPES[e.type]);
    // A copy that locked USB also sent its "large copy" alert: show the lock (it says more) once.
    return list.filter(
      (e) =>
        e.type !== "data.usb_copy" ||
        !list.some(
          (x) =>
            x.type === "data.usb_locked_down" &&
            x.device_id === e.device_id &&
            num(x.data.total_bytes) === num(e.data.total_bytes) &&
            Math.abs(Date.parse(x.occurred_at) - Date.parse(e.occurred_at)) < 600_000,
        ),
    );
  }, [alerts]);
  const overLimit = transferAlerts.filter((e) => severityOf(e) !== "info");

  const rows: TransferRow[] = useMemo(() => {
    const out: TransferRow[] = transferAlerts.map((e) => {
      const route = TRANSFER_TYPES[e.type];
      const person = resolveMember(e.device_id);
      const d = e.data ?? {};
      const dest =
        route === "usb"
          ? str(d.device) || "USB drive"
          : route === "net"
            ? sharePath(str(d.share)) || "Shared folder"
            : route === "web"
              ? str(d.host) || "Website"
              : `Outlook · ${plural(num(d.attachment_count) || 1, "attachment", "attachments")}`;
      return {
        key: `e${e.id}`,
        route,
        who: person?.name ?? e.hostname,
        pc: e.hostname,
        dest,
        bytes: num(d.total_bytes),
        when: whenText(e.occurred_at, now),
        event: e,
        memberId: person?.id,
      };
    });
    const tops: [Route, MetricTopItem[] | undefined][] = [
      ["usb", usbTop.data?.items],
      ["net", lanTop.data?.items],
      ["email", emailTop.data?.items],
      ["web", webTop.data?.items],
    ];
    for (const [route, items] of tops) {
      for (const it of items ?? []) {
        if (it.bytes <= 0 || out.some((r) => r.route === route && r.dest === sharePath(it.key))) continue;
        out.push({
          key: `t${route}${it.key}`,
          route,
          who: who ? who.name : "Whole team",
          pc: "Total for this period",
          dest: route === "email" && /^outlook$/i.test(it.key) ? "Outlook" : route === "net" ? sharePath(it.key) : it.key,
          bytes: it.bytes,
          when: days === 7 ? "Last 7 days" : "Last 30 days",
        });
      }
    }
    return out.filter((r) => !hidden.includes(r.route)).sort((a, b) => b.bytes - a.bytes);
  }, [transferAlerts, usbTop.data, lanTop.data, emailTop.data, webTop.data, resolveMember, now, who, days, hidden]);
  const shownRows = allRows ? rows : rows.slice(0, ROWS_SHOWN);
  const tablesLoading = (events.data === undefined && !events.error) || usbTop.data === undefined || lanTop.data === undefined;
  const tableError = (events.data === undefined && events.error) || usbTop.error || lanTop.error || emailTop.error || webTop.error;

  // Tiles
  const drives = new Set<string>([
    ...(usbTop.data?.items ?? []).map((i) => i.key),
    ...alerts.filter((e) => e.type === "usb.connected" || e.type === "usb.blocked").map((e) => str(e.data.device) || str(e.data.label) || `${e.device_id}`),
  ]);
  const overNames = overLimit.slice(0, 3).map((e) => {
    const p = resolveMember(e.device_id);
    const name = p ? firstName(p.name) : e.hostname;
    const word = { usb: "USB copy", net: "shared-folder copy", web: "upload", email: "email" }[TRANSFER_TYPES[e.type]];
    return `${name}’s ${word}`;
  });
  const dt = policy.data?.data_transfer;
  const uploadLimit = alerts.map((e) => (e.type === "net.upload_over_limit" ? num(e.data.limit_bytes) : 0)).find((v) => v > 0);
  const limitRows = dt
    ? [
        { label: "USB drive", value: formatBytes(dt.usb_warn_bytes) },
        { label: "Shared folder", value: formatBytes(dt.lan_warn_bytes) },
        { label: "Email attachment", value: formatBytes(dt.email_warn_bytes) },
        ...(uploadLimit ? [{ label: "Upload", value: formatBytes(uploadLimit) }] : []),
      ]
    : [];

  const enterDay = (i: number) => (e: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>) => {
    setHov(i);
    const b = buckets[i];
    const tot = dayTotal(b);
    const at = e.currentTarget.querySelector<HTMLElement>("[data-tip-at]") ?? e.currentTarget;
    tip.showAt(
      `day-${b.key}`,
      <TipBody
        title={b.full}
        sub="Data moved out, by route"
        rows={[...shown.map((k) => ({ label: R[k].label, value: sz(b.v[k]), color: R[k].color })), { label: "Total", value: sz(tot), total: true }]}
      />,
      at.getBoundingClientRect(),
      { wide: true },
    );
  };
  const leaveDay = () => {
    setHov(null);
    tip.hide();
  };

  const legend = (phone: boolean) =>
    ROUTES.map((k) => {
      const on = !hidden.includes(k);
      return (
        <button
          key={k}
          type="button"
          className={`zp-leg${on ? "" : " off"}`}
          style={phone ? { minHeight: 44 } : undefined}
          aria-pressed={on}
          onClick={() => setHidden((h) => (h.includes(k) ? h.filter((x) => x !== k) : [...h, k]))}
        >
          <span className="zp-sw" style={{ background: R[k].color }} />
          {R[k].label}
          {phone ? null : (
            <>
              {" · "}
              <span className="z-num">{loadingMetrics ? "…" : sz(routeTotal[k])}</span>
            </>
          )}
        </button>
      );
    });

  const askFor = (r: TransferRow) => {
    if (!r.event || r.memberId === undefined) return;
    const first = firstName(r.who);
    const size = formatBytes(r.bytes);
    setAsk({
      key: r.key,
      member: { id: r.memberId, name: r.who },
      about: `${R[r.route].label} · ${size} · ${r.when}`,
      message: `Hi ${first}, Zinwe saw a ${size} ${R[r.route].phrase} (${r.dest}) ${r.when.toLowerCase().startsWith("today") || r.when.toLowerCase().startsWith("yesterday") ? r.when.toLowerCase() : `on ${r.when}`}. Just checking it was for work.`,
      event: r.event,
    });
  };

  return (
    <div className="zp-prot zp-data">
      <ProtectionTabs />
      <PageHead
        title="Data safety"
        lede="Where data leaves your PCs: pen drives, shared folders, email and uploads. Sizes and destinations, never file contents."
        actions={
          <HeaderFilters
            members={scope.members}
            member={member}
            onMember={scope.setMember}
            periods={PERIODS}
            days={days}
            onDays={scope.setDays}
            periodStyle="segs"
            sheetExtra={
              <div className="zp-fl">
                Routes
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{legend(true)}</div>
              </div>
            }
          />
        }
      />
      <ScopeBanner scope={scope} />

      <section className="zp-tiles" aria-label="Summary">
        <Tile label="Data moved out" value={metrics.data ? formatBytes(total) : "–"} sub={who ? `All routes, ${who.name}` : "All routes, all PCs"} loading={loadingMetrics} />
        <Tile
          label="Copied to USB"
          value={metrics.data ? formatBytes(routeTotal.usb) : "–"}
          sub={usbTop.data ? (usbTop.data.items.length ? `To ${plural(usbTop.data.items.length, "drive", "drives")}` : "No USB copies") : " "}
          color="#A84505"
          loading={loadingMetrics}
        />
        <Tile
          label="Over a limit"
          value={events.data ? String(overLimit.length) : "–"}
          sub={overLimit.length ? overNames.join(", ") + (overLimit.length > 3 ? ` and ${overLimit.length - 3} more` : "") : "Nothing over a limit"}
          color="#C0331C"
          loading={events.data === undefined && !events.error}
          tip={tip}
          tipKey="t-over"
          def={{ title: "Over a limit", sub: "One copy bigger than your limit in Rules", rows: limitRows.length ? limitRows : undefined }}
        />
        <Tile label="USB drives seen" value={usbTop.data ? String(drives.size) : "–"} sub="Pen drives and phones" loading={usbTop.data === undefined && !usbTop.error} />
      </section>

      <section className="z-card zp-where" aria-labelledby="zp-where-h">
        <div className="zp-chart-head">
          <h2 id="zp-where-h" className="zp-h2">
            Where data went
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{legend(false)}</div>
        </div>
        {metrics.data === undefined && metrics.error ? (
          <CardError error={metrics.error} onRetry={metrics.reload} />
        ) : loadingMetrics ? (
          <div role="status" aria-busy="true" className="zp-drow" style={{ height: 200 }}>
            <span className="z-sr">Loading the chart</span>
            {[30, 12, 4, 4, 22, 80, 64].map((h, i) => (
              <span key={i} className="z-sk" style={{ flex: 1, maxWidth: 56, height: `${h}%`, alignSelf: "flex-end" }} />
            ))}
          </div>
        ) : chartEmpty ? (
          <EmptyBlock icon="data" title="No data moved out in this period">
            {who ? `Nothing left ${who.name}'s PC by USB, shared folder, email or upload.` : "USB, shared-folder, email and upload transfers show here once they happen."}
          </EmptyBlock>
        ) : (
          <>
            <div
              className="zp-drow"
              role="group"
              aria-label={`Data moved out by ${days === 7 ? "day" : "week"}: ${buckets.map((b) => `${b.full} ${sz(dayTotal(b))}`).join(", ")}`}
              onMouseLeave={leaveDay}
              style={{ height: 200, borderBottom: "1px solid #E7E3DA" }}
            >
              {buckets.map((b, i) => {
                const tot = dayTotal(b);
                return (
                  <div
                    key={b.key}
                    className={`zp-dcol${hov !== null && hov !== i ? " dim" : ""}`}
                    tabIndex={0}
                    aria-label={`${b.full}. ${shown.map((k) => `${R[k].label} ${sz(b.v[k])}`).join(", ")}. Total ${sz(tot)}.`}
                    onMouseEnter={enterDay(i)}
                    onFocus={enterDay(i)}
                    onBlur={leaveDay}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") leaveDay();
                    }}
                  >
                    <span className="z-num" style={{ fontSize: 11, color: "#4A443C" }}>
                      {sz(tot)}
                    </span>
                    <div data-tip-at="1" className="zp-dstack">
                      {shown
                        .filter((k) => b.v[k] > 0)
                        .map((k) => (
                          <span key={k} style={{ display: "block", width: "100%", background: R[k].color, height: Math.max(2, Math.round((b.v[k] / max) * 150)) }} />
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="zp-drow" aria-hidden="true">
              {buckets.map((b) => (
                <span key={b.key} style={{ flex: 1, minWidth: 0, textAlign: "center", fontSize: 12, color: "#6B6459" }}>
                  {b.l}
                </span>
              ))}
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "#6B6459" }}>Hover or tab to a {days === 7 ? "day" : "week"} to see each route.</p>
          </>
        )}
      </section>

      <div className="zp-split">
        <section className="z-card zp-tablecard" aria-labelledby="zp-big-h">
          <div style={{ padding: "14px 16px" }}>
            <h2 id="zp-big-h" className="zp-h2">
              Biggest transfers
            </h2>
          </div>
          {tableError ? (
            <CardError
              error={tableError}
              onRetry={() => {
                events.reload();
                usbTop.reload();
                lanTop.reload();
                emailTop.reload();
                webTop.reload();
              }}
            />
          ) : tablesLoading ? (
            <SkRows label="Loading transfers" rows={5} avatar={false} />
          ) : rows.length === 0 ? (
            <EmptyBlock icon="data" title="No transfers in this period">
              {who ? `Nothing left ${who.name}'s PC in this period.` : "Copies to pen drives, shared folders, email and uploads show here."}
            </EmptyBlock>
          ) : (
            <>
              <div className="zp-tbl-wrap">
                <table className="zp-tbl">
                  <caption className="z-sr">Biggest transfers, {days === 7 ? "last 7 days" : "last 30 days"}</caption>
                  <thead>
                    <tr>
                      <th scope="col">What</th>
                      <th scope="col">Who</th>
                      <th scope="col">Where to</th>
                      <th scope="col" style={{ textAlign: "right" }}>
                        Size
                      </th>
                      <th scope="col">When</th>
                      <th scope="col">Level</th>
                      <th scope="col">Follow-up</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shownRows.map((r) => {
                      const e = r.event;
                      const sev = e ? severityOf(e) : null;
                      const lv = sev ? LEVEL[sev] : null;
                      const over = sev !== null && sev !== "info";
                      const st = e ? (asked[e.id] ? "asked" : isHandled(e) ? "handled" : "open") : null;
                      const first = firstName(r.who);
                      const dev = e?.type === "data.usb_locked_down" ? devices.data?.find((d) => d.id === e.device_id) : undefined;
                      return (
                        <tr key={r.key}>
                          <td data-label="What">
                            <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <span className="zp-sw" style={{ background: R[r.route].color }} />
                              {R[r.route].label}
                            </span>
                          </td>
                          <td data-label="Who">
                            <span>
                              {r.who}
                              <br />
                              <span className={e ? "z-mono" : undefined} style={{ fontSize: 12, color: "#6B6459" }}>
                                {r.pc}
                              </span>
                            </span>
                          </td>
                          <td data-label="Where to" className="z-mono" style={{ fontSize: 13, overflowWrap: "anywhere" }}>
                            {r.dest}
                          </td>
                          <td data-label="Size" className="z-num" style={{ textAlign: "right", fontWeight: 600 }}>
                            {formatBytes(r.bytes)}
                          </td>
                          <td data-label="When" style={{ color: "#4A443C" }}>
                            {r.when}
                          </td>
                          <td data-label="Level">
                            {lv && e ? (
                              <button
                                type="button"
                                className={`zp-def z-pill ${lv.cls}`}
                                style={{ cursor: "help" }}
                                {...tip.anchor(
                                  `lvl-${e.id}`,
                                  <TipBody
                                    text={
                                      <>
                                        <b>{lv.label}</b> — {lv.def}
                                      </>
                                    }
                                  />,
                                )}
                              >
                                {lv.label}
                                {over ? " · over limit" : ""}
                              </button>
                            ) : (
                              <span style={{ fontSize: 12, color: "#6B6459" }}>—</span>
                            )}
                          </td>
                          <td data-label="Follow-up" className="fu">
                            {e ? (
                              <span className="zp-fu">
                                {st === "open" && r.memberId !== undefined ? <AskButton first={first} onAsk={() => askFor(r)} /> : null}
                                {st === "asked" ? <span className="zp-st" style={{ color: "#1B4FB0" }}>Asked · waiting for reply</span> : null}
                                {st === "handled" ? <span className="zp-st" style={{ color: "#17663F" }}>Handled</span> : null}
                                {dev ? <UsbRestore device={dev} onRestored={devices.reload} /> : null}
                                <Link to={`/app/alerts#alert=${e.id}`} style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }} aria-label={`See the alert for ${first}’s ${formatBytes(r.bytes)} transfer`}>
                                  See alert →
                                </Link>
                              </span>
                            ) : (
                              <span style={{ fontSize: 12, color: "#6B6459" }}>No alert</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {rows.length > ROWS_SHOWN ? (
                <div style={{ padding: "0 16px 12px" }}>
                  <button type="button" className="z-btn sm" onClick={() => setAllRows((v) => !v)}>
                    {allRows ? "Show fewer" : `Show all ${rows.length}`}
                  </button>
                </div>
              ) : null}
            </>
          )}
          <p className="zp-foot">
            {dt?.include_details
              ? "File names are on. Your team should know; turn them off in Rules any time."
              : "File names are off. Turn them on in Rules only if your team knows and your policy allows it."}
          </p>
        </section>

        <div className="zp-side">
          <section className="z-card zp-rules" aria-labelledby="zp-rules-h">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <h2 id="zp-rules-h" className="zp-h2">
                Current rules
              </h2>
              <Link to="/app/rules#limits" style={{ fontSize: 13, fontWeight: 600 }}>
                Change
              </Link>
            </div>
            {policy.data === undefined && policy.error ? (
              <CardError error={policy.error} onRetry={policy.reload} />
            ) : !policy.data ? (
              <SkRows label="Loading rules" rows={4} avatar={false} />
            ) : (
              [
                { k: "USB drives", v: USB_WORD[policy.data.usb.mode] },
                { k: "Alert on a USB copy over", v: dt?.enabled ? formatBytes(dt.usb_warn_bytes) : "Off" },
                { k: "Alert on a shared-folder copy over", v: dt?.enabled ? formatBytes(dt.lan_warn_bytes) : "Off" },
                { k: "Alert on an email attachment over", v: dt?.enabled ? formatBytes(dt.email_warn_bytes) : "Off" },
                ...(uploadLimit ? [{ k: "Alert on an upload over", v: formatBytes(uploadLimit) }] : []),
                ...(dt?.usb_lockdown ? [{ k: "After a USB copy over the limit", v: "USB goes read-only" }] : []),
              ].map((r) => (
                <div key={r.k} className="zp-rule">
                  <span style={{ color: "#4A443C" }}>{r.k}</span>
                  <b style={{ textAlign: "right", whiteSpace: "nowrap" }}>{r.v}</b>
                </div>
              ))
            )}
          </section>
          {!usbControl ? (
            <PlanLock module="usb_control" compact title="Block USB drives">
              Make pen drives read-only or block them completely on every PC, and lock a PC&rsquo;s USB ports after a large copy.
            </PlanLock>
          ) : null}
          {!transfersOn ? (
            <PlanLock module="data_transfer" compact title="Files leaving by network, Outlook or upload">
              Get flagged when large amounts of data go to another PC or shared folder, leave as Outlook attachments, or are uploaded to websites and webmail.
            </PlanLock>
          ) : null}
        </div>
      </div>

      <MetricsDisclosure
        title="What Zinwe shares with you"
        sub="Everything on this page comes from the metrics below — counts and sizes only, visible just to your company's admin."
        collected={DATA_COLLECTED}
        never={DATA_NEVER}
      />

      <AskSheet
        target={ask}
        onClose={() => setAsk(null)}
        onSent={(t) => {
          setAsk(null);
          const ev = t.event;
          if (ev) setAsked((a) => ({ ...a, [ev.id]: true }));
          setToast(`Sent to ${firstName(t.member.name)}’s Zinwe app.`);
          events.reload();
        }}
      />
      {toast ? <ZToast text={toast} onDone={closeToast} /> : null}
      {tip.node}
    </div>
  );
}
