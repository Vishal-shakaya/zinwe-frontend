import { useCallback, useMemo, useState, type ReactElement } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { usePageMeta } from "../../hooks/usePageMeta";
import { friendlyDuration } from "../../lib/format";
import { errorMessage, getTopMetrics, markEventHandled, type DeviceEvent } from "../../lib/api";
import { ScopeBanner } from "../components/AnalyticsScope";
import { MetricsDisclosure } from "../components/MetricsDisclosure";
import { PagePlanGate, PlanLock } from "../components/PlanLock";
import { useAnalyticsScope } from "../features/analyticsScope";
import { useEntitlements } from "../features/entitlements";
import { eventTool, FEATURE_EVENT_TYPES, isHandled, severityOf } from "../features/events";
import { RemoteSoftwareCard } from "../features/policyControls";
import { appKind, appSource, isCountedApp, mergeBySource } from "../features/usageSources";
import { filterEvents, useFeatureData } from "../features/useFeatureData";
import { usePolicy } from "../features/usePolicy";
import { MiniDays, type MiniDay } from "../protection/MiniDays";
import { AskButton, AskSheet, CardError, HeaderFilters, ProtectionTabs, type AskTarget } from "../protection/parts";
import { DAY_MS, firstName, LEVEL, plural } from "../protection/helpers";
import { PageHead } from "../shell/PageHead";
import { SkRows, ZToast } from "../ui/States";
import { TipBody } from "../ui/Tooltip";
import { useTip } from "../ui/useTip";
import { ZIcon } from "../ui/ZIcon";
import { useResource } from "../useResource";
import "../../styles/dash13/protection.css";

const TYPES = FEATURE_EVENT_TYPES.remote;
const APPS_COLLECTED = [
  { label: "Apps used", detail: "Which app is open in front (e.g. chrome, winword) and for how long, rolled up by the hour." },
  { label: "Remote-control tools", detail: "When a tool like AnyDesk or TeamViewer runs, and on which PC." },
  { label: "New software", detail: "The name of software installed on a PC, and when." },
];
const APPS_NEVER = [
  "Keystrokes or anything typed",
  "Screenshots or screen recording",
  "What's inside an app — documents, chats or files",
  "Anything said or shown during a remote session",
];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAYS_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const TONES = ["#FDEBDC", "#E6EEFB", "#E3F4EA", "#F4ECFB", "#FBF0D9"];
/** Detections of the same tool on the same PC this close together are one session. */
const SESSION_GAP_MS = 30 * 60_000;
const LIST_SHOWN = 4;

const CHIP = {
  fine: { label: "Marked fine", style: { background: "#E3F4EA", color: "#17663F" } },
  asked: { label: "Asked · waiting for reply", style: { background: "#E6EEFB", color: "#1B4FB0" } },
  normal: { label: "Normal", style: { background: "#F0EDE6", color: "#4A443C" } },
  worth: { label: "Worth a look", style: { background: "#FBF0D9", color: "#8A5300" } },
  needs: { label: "Needs you", style: { background: "#FCE8E4", color: "#C0331C" } },
  blocked: { label: "Blocked", style: { background: "#141210", color: "#fff" } },
} as const;

function mondayOf(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

function clock(ms: number): string {
  const d = new Date(ms);
  const h = d.getHours();
  return `${((h + 11) % 12) + 1}:${String(d.getMinutes()).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** One item in a card's list: an install, a remote session (a run of detections) or a blocked start. */
interface Item {
  key: string;
  events: DeviceEvent[];
  name: string;
  note: string;
  who: string;
  memberId?: number;
  pc: string;
  start: number;
  end: number;
  /** 0 = Mon … 6 = Sun. */
  d: number;
  blocked: boolean;
  flagged: boolean;
}

/** Plan enforcement: remote tools + software are Startups; the app-usage parts are Businesses. */
export default function RemotePage(): ReactElement {
  return (
    <PagePlanGate
      module="remote_access"
      title="Apps & remote tools"
      lede="Time in apps, new software and remote control."
      lock="Get an alert when someone runs AnyDesk, TeamViewer or another remote-control tool, block the ones you don't use, and see every new program installed on your PCs."
    >
      <RemotePageContent />
    </PagePlanGate>
  );
}

function RemotePageContent(): ReactElement {
  usePageMeta({ title: "Apps & remote tools — Zinwe", description: "Time in apps, new software and remote-control tools." });
  const appsOn = useEntitlements().has("app_usage");
  const tip = useTip();
  const scope = useAnalyticsScope();
  const { member } = scope;
  const { events, now, resolveMember } = useFeatureData(7, member, TYPES);
  const { policy, commit } = usePolicy();
  // "Block AnyDesk" from an alert lands here with ?block=AnyDesk (J5-24).
  const [params] = useSearchParams();
  const focusTool = params.get("block")?.trim().slice(0, 80) || undefined;

  const loadApps = useCallback(
    (s: AbortSignal) => (appsOn ? getTopMetrics({ category: "app.foreground", days: 7, member: member ?? undefined, limit: 100 }, s) : Promise.resolve({ category: "app.foreground", items: [] })),
    [appsOn, member],
  );
  const apps = useResource(loadApps, { resetKey: `${member ?? "all"}:${appsOn}` });

  const [softW, setSoftW] = useState(0);
  const [softDay, setSoftDay] = useState(-1);
  const [softAll, setSoftAll] = useState(false);
  const [remW, setRemW] = useState(0);
  const [remDay, setRemDay] = useState(-1);
  const [remAll, setRemAll] = useState(false);
  const [ask, setAsk] = useState<AskTarget | null>(null);
  const [asked, setAsked] = useState<Record<string, true>>({});
  // Handled here: show it at once, before the next poll.
  const [handled, setHandled] = useState<Record<number, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; undo?: () => void } | null>(null);
  const closeToast = useCallback(() => setToast(null), []);

  const who = scope.person;
  const thisMonday = mondayOf(now);
  const todayD = (new Date(now).getDay() + 6) % 7;
  const weekStart = (w: number) => thisMonday - w * 7 * DAY_MS;
  const dateOf = (w: number, d: number) => {
    const x = new Date(weekStart(w) + d * DAY_MS + 3_600_000 * 12);
    return `${x.getDate()} ${MON[x.getMonth()]}`;
  };
  const isFuture = (w: number, d: number) => w === 0 && d > todayD;
  const dayWord = (w: number, d: number) => (w === 0 && d === todayD ? "Today" : w === 0 && d === todayD - 1 ? "Yesterday" : `${DAYS[d]} ${dateOf(w, d)}`);
  const dayFull = (w: number, d: number) =>
    `${DAYS_FULL[d]} ${dateOf(w, d)}${w === 0 && d === todayD ? " (today)" : w === 0 && d === todayD - 1 ? " (yesterday)" : isFuture(w, d) ? " (still to come)" : ""}`;
  const isDone = (e: DeviceEvent) => handled[e.id] ?? isHandled(e);

  const all = useMemo(() => filterEvents(events.data, TYPES), [events.data]);

  /** The items of one kind in week `w`. */
  const itemsFor = (w: number, kind: "soft" | "rem"): Item[] => {
    const from = weekStart(w);
    const to = from + 7 * DAY_MS;
    const inWeek = all
      .filter((e) => (kind === "soft" ? e.type === "software.installed" : e.type !== "software.installed"))
      .map((e) => ({ e, at: Date.parse(e.occurred_at) }))
      .filter((x) => x.at >= from && x.at < to)
      .sort((a, b) => a.at - b.at);
    const out: Item[] = [];
    for (const { e, at } of inWeek) {
      const person = resolveMember(e.device_id);
      const blocked = e.type === "remote.blocked";
      const name = kind === "soft" ? str(e.data.product) || "Software" : eventTool(e) || "Remote tool";
      const prev = kind === "rem" ? out.findLast((x) => x.name === name && x.pc === e.hostname && x.blocked === blocked) : undefined;
      if (prev && at - prev.end < SESSION_GAP_MS) {
        prev.events.push(e);
        prev.end = at;
        prev.flagged = prev.flagged || severityOf(e) !== "info";
        continue;
      }
      out.push({
        key: `${kind}-${e.id}`,
        events: [e],
        name,
        note: kind === "soft" ? (str(e.data.publisher) ? `By ${str(e.data.publisher)}` : "") : "",
        who: person?.name ?? e.hostname,
        memberId: person?.id,
        pc: e.hostname,
        start: at,
        end: at,
        d: (new Date(at).getDay() + 6) % 7,
        blocked,
        flagged: severityOf(e) !== "info",
      });
    }
    return out;
  };
  const softWeek = itemsFor(softW, "soft");
  const remWeek = itemsFor(remW, "rem");

  const statusOf = (x: Item): "fine" | "asked" | "open" => (asked[x.key] ? "asked" : x.events.every(isDone) ? "fine" : "open");

  const setDone = async (x: Item, done: boolean) => {
    setBusy(x.key);
    try {
      const results = await Promise.all(x.events.map((e) => markEventHandled(e.id, done)));
      setHandled((h) => ({ ...h, ...Object.fromEntries(results.map((r) => [r.id, done])) }));
      setToast(done ? { text: `${x.name} marked as fine.`, undo: () => void setDone(x, false) } : { text: `${x.name} is open again.` });
    } catch (err) {
      setToast({ text: errorMessage(err) });
    } finally {
      setBusy(null);
    }
  };

  const askFor = (x: Item, label: string, when: string) => {
    if (x.memberId === undefined) return;
    const first = firstName(x.who);
    setAsk({
      key: x.key,
      member: { id: x.memberId, name: x.who },
      about: `${label} · ${x.who} · ${when}`,
      message: x.blocked
        ? `Hi ${first}, Zinwe closed ${label} on your PC (${when}). Were you trying to get help with something? Happy to set it up another way.`
        : `Hi ${first}, quick check about ${label} on your PC (${when}). Anything I should know?`,
      event: x.events[0],
    });
  };

  /** Chip + Mark as fine / Ask / Undo for one row. */
  const rowActs = (x: Item, label: string, when: string) => {
    const st = statusOf(x);
    const first = firstName(x.who);
    const chip = st === "fine" ? CHIP.fine : st === "asked" ? CHIP.asked : x.blocked ? CHIP.blocked : x.flagged ? (severityOf(x.events[0]) === "critical" ? CHIP.needs : CHIP.worth) : CHIP.normal;
    const lv = chip === CHIP.worth ? LEVEL.warning : chip === CHIP.needs ? LEVEL.critical : null;
    return {
      chip: lv ? (
        <button
          type="button"
          className="zp-def z-pill"
          style={{ ...chip.style, cursor: "help" }}
          {...tip.anchor(
            `chip-${x.key}`,
            <TipBody
              text={
                <>
                  <b>{lv.label}</b> — {lv.def}
                </>
              }
            />,
          )}
        >
          {chip.label}
        </button>
      ) : (
        <span className="z-pill" style={chip.style}>
          {chip.label}
        </span>
      ),
      buttons: (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {(x.flagged || x.blocked) && st !== "fine" ? (
            <button type="button" className="z-btn sm" aria-label={`Mark ${label} on ${first}’s PC as fine`} disabled={busy === x.key} onClick={() => void setDone(x, true)}>
              Mark as fine
            </button>
          ) : null}
          {(x.flagged || x.blocked) && st === "open" && x.memberId !== undefined ? <AskButton first={first} onAsk={() => askFor(x, label, when)} /> : null}
          {st === "fine" ? (
            <button type="button" className="z-btn sm" disabled={busy === x.key} onClick={() => void setDone(x, false)}>
              Undo
            </button>
          ) : null}
        </div>
      ),
    };
  };

  // ---- Top 5 apps (last 7 days, apps in front only; Windows and Zinwe aren't counted) ----
  const appRows = useMemo(() => mergeBySource((apps.data?.items ?? []).filter((i) => isCountedApp(i.key, false)), appSource, 500).sort((a, b) => b.seconds - a.seconds), [apps.data]);
  const appTotal = appRows.reduce((a, r) => a + r.seconds, 0);
  const top5 = appRows.filter((r) => r.seconds > 0).slice(0, 5);

  // ---- New software ----
  const softPerDay = DAYS.map((_, i) => softWeek.filter((x) => x.d === i));
  const softDays: MiniDay[] = softPerDay.map((l, i) => {
    const n = l.length;
    const wl = l.filter((x) => x.flagged).length;
    const names = l.map((x) => x.name + (x.flagged ? " (worth a look)" : "")).join(", ");
    const fut = isFuture(softW, i);
    return {
      key: `${softW}-${i}`,
      day: DAYS[i],
      value: n,
      flagged: wl,
      val: n ? String(n) : "",
      aria: `${dayFull(softW, i)}${fut ? "" : `. Installs ${n}, worth a look ${wl}${n ? `. ${names}` : ""}`}. ${softDay === i ? "Show whole week." : "Show this day."}`,
      tip: (
        <TipBody
          title={dayFull(softW, i)}
          color={wl ? "#8A5300" : "#141210"}
          rows={[
            { label: "Installs", value: n },
            { label: "Worth a look", value: wl },
          ]}
          text={fut ? "Still to come" : n ? names : "No installs"}
          hint={softDay === i ? "Click to show the whole week" : "Click to show this day"}
        />
      ),
    };
  });
  const softList = softWeek.filter((x) => softDay < 0 || x.d === softDay).sort((a, b) => b.start - a.start);
  const softShown = softDay >= 0 || softAll ? softList : softList.slice(0, LIST_SHOWN);
  const softFlagged = softWeek.filter((x) => x.flagged).length;
  const softWaiting = softWeek.filter((x) => x.flagged && statusOf(x) === "open").length;
  const softWord = softW ? "Last week" : "This week";

  // ---- Remote control ----
  const remPerDay = DAYS.map((_, i) => remWeek.filter((x) => x.d === i));
  const remDays: MiniDay[] = remPerDay.map((l, i) => {
    const nb = l.filter((x) => x.blocked).length;
    const n = l.length - nb;
    const mj = l.filter((x) => x.flagged && !x.blocked).length;
    const tools = [...new Set(l.map((x) => x.name + (x.blocked ? " (blocked)" : "")))].join(", ");
    const fut = isFuture(remW, i);
    const parts = [n ? plural(n, "session", "sessions") : "", nb ? `${nb} blocked` : ""].filter(Boolean);
    return {
      key: `${remW}-${i}`,
      day: DAYS[i],
      sub: parts.join(" · "),
      value: n,
      flagged: mj,
      val: n ? String(n) : "",
      aria: `${dayFull(remW, i)}${fut ? "" : `. Sessions ${n}, blocked starts ${nb}, worth a look ${mj}${l.length ? `. ${tools}` : ""}`}. ${remDay === i ? "Show whole week." : "Show this day."}`,
      tip: (
        <TipBody
          title={dayFull(remW, i)}
          color={mj ? "#C0331C" : "#141210"}
          rows={[
            { label: "Sessions", value: n },
            { label: "Blocked starts", value: nb },
            { label: "Worth a look", value: mj },
          ]}
          text={fut ? "Still to come" : l.length ? tools : "No sessions"}
          hint={remDay === i ? "Click to show the whole week" : "Click to show this day"}
        />
      ),
    };
  });
  const remList = remWeek.filter((x) => remDay < 0 || x.d === remDay).sort((a, b) => b.start - a.start);
  const remShown = remDay >= 0 || remAll ? remList : remList.slice(0, LIST_SHOWN);
  const remBlocked = remWeek.filter((x) => x.blocked).length;
  const remSessions = remWeek.length - remBlocked;
  const remWaiting = remWeek.filter((x) => (x.flagged || x.blocked) && statusOf(x) === "open").length;
  const remWord = remW ? "Last week" : "This week";
  const remCountLine = `${remBlocked ? `${remBlocked} blocked · ` : ""}${plural(remSessions, "session", "sessions")}`;

  const loadingEvents = events.data === undefined && !events.error;
  const weekToggle = (value: number, set: (w: number) => void, label: string) => (
    <div className="zp-seg sm" role="group" aria-label={label}>
      {[
        [0, "This week"],
        [1, "Last week"],
      ].map(([w, l]) => (
        <button key={w} type="button" aria-pressed={value === w} onClick={() => set(Number(w))}>
          {l}
        </button>
      ))}
    </div>
  );

  return (
    <div className="zp-prot zp-apps">
      <ProtectionTabs />
      <PageHead
        title="Apps & remote tools"
        lede={`Time in apps, new software and remote control. Today is ${DAYS[todayD]} ${dateOf(0, todayD)}.`}
        actions={
          <HeaderFilters
            members={scope.members}
            member={member}
            onMember={(id) => {
              scope.setMember(id);
              setSoftDay(-1);
              setRemDay(-1);
            }}
            extra={
              <Link className="z-btn sm" to="/app/rules#remote">
                Remote-tool rule
              </Link>
            }
          />
        }
      />
      <ScopeBanner scope={scope} />

      <p className="zp-privacy">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#17663F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none", marginTop: 2 }}>
          <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        <span>
          <b style={{ color: "#141210" }}>What Zinwe sees here:</b> app names and how long they&rsquo;re open. It never sees what&rsquo;s inside an app, what you type, or your screen.
        </span>
      </p>

      <section className="zp-tiles" aria-label="Summary">
        <div className="z-card zp-tile">
          <span className="zp-tile__lbl">Time in apps</span>
          {appsOn ? (
            apps.data === undefined && !apps.error ? (
              <span className="z-sk" aria-hidden="true" style={{ width: "50%", height: 28, margin: "4px 0" }} />
            ) : (
              <b className="z-num zp-tile__val">{apps.data ? friendlyDuration(appTotal) : "–"}</b>
            )
          ) : (
            <b className="zp-tile__val" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#6B6459" }}>
              <ZIcon name="lock" size={20} stroke={2} />
              <span style={{ fontSize: 15 }}>Not on your plan</span>
            </b>
          )}
          <span className="zp-tile__sub">
            {who ? who.name : scope.members ? plural(scope.members.length, "person", "people") : "Whole team"}, last 7 days, apps in front only
          </span>
        </div>
        <div className="z-card zp-tile">
          <span className="zp-tile__lbl">New software</span>
          {loadingEvents ? <span className="z-sk" aria-hidden="true" style={{ width: "30%", height: 28, margin: "4px 0" }} /> : <b className="z-num zp-tile__val">{events.data ? softWeek.length : "–"}</b>}
          <span className="zp-tile__sub">
            {softWord} · {softWaiting ? `${softWaiting} waiting for your call` : "all reviewed"}
          </span>
        </div>
        <div className="z-card zp-tile">
          <span>
            <button
              type="button"
              className="zp-def zp-tile__lbl"
              {...tip.anchor("t-rem", <TipBody text="Someone connected to this PC with a remote-control tool. A blocked start, closed by your rule in a second, is not a session." />)}
            >
              Remote sessions
              <ZIcon name="info" size={13} stroke={2} />
            </button>
          </span>
          {loadingEvents ? <span className="z-sk" aria-hidden="true" style={{ width: "30%", height: 28, margin: "4px 0" }} /> : <b className="z-num zp-tile__val">{events.data ? remSessions : "–"}</b>}
          <span className="zp-tile__sub">
            {remWord} · {remCountLine} · {remWaiting ? `${remWaiting} need you` : "all reviewed"}
          </span>
        </div>
      </section>

      {appsOn ? (
        <section className="z-card zp-top5card" aria-labelledby="zp-top-h">
          <div style={{ paddingBottom: 8, minWidth: 0 }}>
            <h2 id="zp-top-h" className="zp-h2">
              Top 5 apps
            </h2>
            <span className="zp-note">{who ? `${who.name}, last 7 days` : "Whole team, last 7 days"}</span>
          </div>
          {apps.error ? (
            <CardError error={apps.error} onRetry={apps.reload} />
          ) : apps.data === undefined ? (
            <SkRows label="Loading top apps" rows={5} />
          ) : top5.length === 0 ? (
            <p className="zp-empty-line" style={{ padding: "10px 0", borderTop: "1px solid #F0EDE6" }}>
              {who ? `No app use from ${who.name} in the last 7 days.` : "No app use in the last 7 days. It shows once a connected PC is used."}
            </p>
          ) : (
            <>
              <div className="zp-t5 head" aria-hidden="true">
                <span>App</span>
                <span style={{ textAlign: "right" }}>Time in front</span>
                <span style={{ textAlign: "right" }}>Share</span>
              </div>
              <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {top5.map((a, i) => {
                  const share = appTotal ? Math.round((a.seconds / appTotal) * 100) : 0;
                  const kind = appKind(a.key);
                  return (
                    <li key={a.key} className="zp-t5" aria-label={`${a.key}, ${kind}. ${friendlyDuration(a.seconds)} in front, last 7 days. ${share}% of ${who ? `${firstName(who.name)}’s` : "the team’s"} app time.`}>
                      <span style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
                        <span className="zp-badge" aria-hidden="true" style={{ background: TONES[i % TONES.length] }}>
                          {a.key
                            .split(/\s+/)
                            .map((w) => w[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </span>
                        <span style={{ minWidth: 0 }}>
                          <b className="z-ell" style={{ display: "block", fontWeight: 600 }}>
                            {a.key}
                          </b>
                          <span style={{ fontSize: 12, color: "#6B6358" }}>{kind}</span>
                        </span>
                      </span>
                      <span className="z-num" style={{ textAlign: "right", whiteSpace: "nowrap", fontWeight: 600 }}>
                        {friendlyDuration(a.seconds)}
                        <span className="zp-bar t5bar" aria-hidden="true">
                          <span style={{ width: `${((a.seconds / top5[0].seconds) * 100).toFixed(2)}%`, background: i === 0 ? "#F26A0A" : "#141210" }} />
                        </span>
                      </span>
                      <span className="z-num" style={{ textAlign: "right", whiteSpace: "nowrap", color: "#4A443C" }}>
                        {share}%
                      </span>
                    </li>
                  );
                })}
              </ol>
            </>
          )}
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "#6B6459" }}>Last 7 days, apps in front only. Windows and Zinwe itself aren&rsquo;t counted.</p>
        </section>
      ) : (
        <PlanLock module="app_usage" compact title="Top 5 apps">
          See which apps your team works in and for how long, per person and across the company.
        </PlanLock>
      )}

      <div className="zp-duo">
        <section className="z-card" aria-labelledby="zp-soft-h">
          <div className="zp-chart-head">
            <div style={{ minWidth: 0 }}>
              <h2 id="zp-soft-h" className="zp-h2">
                New software
              </h2>
              <span className="zp-note">Installs per day. Pick a day to filter.</span>
            </div>
            {weekToggle(softW, (w) => {
              setSoftW(w);
              setSoftDay(-1);
              setSoftAll(false);
            }, "New software period")}
          </div>
          <div className="zp-lgrow">
            <b className="z-num" style={{ color: "#141210" }}>
              {plural(softWeek.length, "install", "installs")} · {softFlagged} worth a look
            </b>
            <span className="zp-lg">
              <span style={{ display: "inline-block", width: 6, height: 12, borderRadius: 3, background: "#141210" }} />
              Normal
            </span>
            <span className="zp-lg">
              <span style={{ display: "inline-block", width: 6, height: 12, borderRadius: 3, background: "#8A5300" }} />
              Worth a look
            </span>
          </div>
          {events.data === undefined && events.error ? (
            <CardError error={events.error} onRetry={events.reload} />
          ) : loadingEvents ? (
            <SkRows label="Loading new software" rows={3} avatar={false} />
          ) : (
            <>
              <MiniDays
                days={softDays}
                steps={[1, 2, 5, 10, 20]}
                minTop={1}
                flagColor="#8A5300"
                baseColor="#141210"
                picked={softDay}
                onPick={setSoftDay}
                label={`New software installs per day, ${softWord.toLowerCase()}`}
                tip={tip}
              />
              <div>
                <div className="zp-listhead">
                  <h3>{softDay >= 0 ? dayFull(softW, softDay) : "Latest installs"}</h3>
                  {softDay >= 0 ? (
                    <button type="button" className="z-btn sm" onClick={() => setSoftDay(-1)}>
                      Whole week
                    </button>
                  ) : null}
                </div>
                {softShown.map((x) => {
                  const when = `${dayWord(softW, x.d)} ${clock(x.start)}`;
                  const a = rowActs(x, x.name, when);
                  return (
                    <div key={x.key} className="zp-ev">
                      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <b>{x.name}</b>
                          {a.chip}
                        </span>
                        {x.note ? <span style={{ fontSize: 13, color: "#4A443C" }}>{x.note}</span> : null}
                        <span className="m">
                          {x.who} · <span className="z-mono">{x.pc}</span> · {when}
                        </span>
                      </div>
                      {a.buttons}
                    </div>
                  );
                })}
                {softList.length === 0 ? <p className="zp-ev" style={{ margin: 0, color: "#6B6459", fontSize: 13 }}>No new software in this period.</p> : null}
                {softDay < 0 && softList.length > LIST_SHOWN ? (
                  <button type="button" className="z-btn sm" style={{ marginTop: 4 }} onClick={() => setSoftAll((v) => !v)}>
                    {softAll ? "Show fewer" : `Show all ${softList.length}`}
                  </button>
                ) : null}
              </div>
            </>
          )}
        </section>

        <section className="z-card" aria-labelledby="zp-rem-h" id="remote-title">
          <div className="zp-chart-head">
            <div style={{ minWidth: 0 }}>
              <h2 id="zp-rem-h" className="zp-h2">
                Remote control
              </h2>
              <span className="zp-note">Sessions per day. A blocked start (closed in a second) is not a session. Pick a day to filter.</span>
            </div>
            {weekToggle(remW, (w) => {
              setRemW(w);
              setRemDay(-1);
              setRemAll(false);
            }, "Remote control period")}
          </div>
          <div className="zp-lgrow">
            <b className="z-num" style={{ color: "#141210" }}>
              {remCountLine}
            </b>
            <span className="zp-lg">
              <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "#141210" }} />
              Normal
            </span>
            <span className="zp-lg">
              <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "#C0331C" }} />
              Worth a look or against your rule
            </span>
          </div>
          {events.data === undefined && events.error ? (
            <CardError error={events.error} onRetry={events.reload} />
          ) : loadingEvents ? (
            <SkRows label="Loading remote control" rows={3} avatar={false} />
          ) : (
            <>
              <MiniDays
                days={remDays}
                steps={[1, 2, 5, 10, 20, 50]}
                minTop={2}
                flagColor="#C0331C"
                baseColor="#141210"
                dot
                picked={remDay}
                onPick={setRemDay}
                label={`Remote-control sessions per day, ${remWord.toLowerCase()}`}
                tip={tip}
              />
              <div>
                <div className="zp-listhead">
                  <h3>{remDay >= 0 ? dayFull(remW, remDay) : "Latest sessions and blocked starts"}</h3>
                  {remDay >= 0 ? (
                    <button type="button" className="z-btn sm" onClick={() => setRemDay(-1)}>
                      Whole week
                    </button>
                  ) : null}
                </div>
                {remShown.map((x) => {
                  const when = `${dayWord(remW, x.d)} ${clock(x.start)}`;
                  const a = rowActs(x, x.name, when);
                  const span = x.end - x.start;
                  const how = str(x.events[0].data.detected_by) === "port" ? "listening for connections" : "running";
                  return (
                    <div key={x.key} className="zp-ev">
                      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <b>{x.name}</b>
                          {a.chip}
                        </span>
                        <span className="m">
                          {x.who} · <span className="z-mono">{x.pc}</span>
                        </span>
                        <span className="m">
                          <span className="z-num">
                            {x.blocked
                              ? `${when} · blocked start, closed by your rule (not a session)`
                              : `${dayWord(remW, x.d)} ${span > 60_000 ? `${clock(x.start)}–${clock(x.end)} · seen for ${friendlyDuration(span / 1000)}` : clock(x.start)}`}
                          </span>
                          {" · "}
                          <span style={x.blocked || x.flagged ? { color: "#C0331C", fontWeight: 600 } : { color: "#4A443C" }}>
                            {x.blocked ? "Against your rule" : `Seen ${how}${x.events.length > 1 ? `, ${x.events.length} times` : ""}`}
                          </span>
                        </span>
                      </div>
                      {a.buttons}
                    </div>
                  );
                })}
                {remList.length === 0 ? <p className="zp-ev" style={{ margin: 0, color: "#6B6459", fontSize: 13 }}>No remote sessions in this period.</p> : null}
                {remDay < 0 && remList.length > LIST_SHOWN ? (
                  <button type="button" className="z-btn sm" style={{ marginTop: 4 }} onClick={() => setRemAll((v) => !v)}>
                    {remAll ? "Show fewer" : `Show all ${remList.length}`}
                  </button>
                ) : null}
              </div>
            </>
          )}
          <p style={{ margin: "auto 0 0", fontSize: 12, color: "#6B6459" }}>
            Sessions over your rule or from outside also appear in <Link to="/app/alerts">Alerts</Link>.
          </p>
        </section>
      </div>

      {focusTool && policy.data ? <RemoteSoftwareCard block={policy.data.remote_software} commit={commit} focusTool={focusTool} /> : null}

      <MetricsDisclosure
        title="What Zinwe shares with you"
        sub="Everything on this page comes from the metrics below. They're visible only to your company's admin."
        collected={APPS_COLLECTED}
        never={APPS_NEVER}
      />

      <AskSheet
        target={ask}
        onClose={() => setAsk(null)}
        onSent={(t) => {
          setAsk(null);
          setAsked((a) => ({ ...a, [t.key]: true }));
          setToast({ text: `Sent to ${firstName(t.member.name)}’s Zinwe app.` });
          events.reload();
        }}
      />
      {toast ? <ZToast text={toast.text} onUndo={toast.undo} onDone={closeToast} /> : null}
      {tip.node}
    </div>
  );
}
