import { useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import type { Member, WorkLogEntry } from "../../lib/api";
import { firstName, formatTime } from "../alerts/alertModel";
import { formatDuration, presenceOf } from "../features/memberStatus";
import { formatRelative } from "../time";
import { Sheet, SkRows } from "../ui/States";
import { TipBody, type TipRow } from "../ui/Tooltip";
import type { Tip } from "../ui/useTip";
import { ZIcon } from "../ui/ZIcon";
import { MemberAvatar } from "../team/Avatar";

type Status = "working" | "break" | "out" | "notin" | "offline" | "nopc";
type Filter = "all" | "working" | "break" | "out";

const ST: Record<Status, readonly [string, string, string]> = {
  working: ["Working", "#E3F4EA", "#17663F"],
  break: ["On break", "#FBF0D9", "#8A5300"],
  out: ["Day ended", "#EFECE5", "#5E574D"],
  notin: ["Not in", "#EFECE5", "#5E574D"],
  offline: ["Offline", "#EFECE5", "#5E574D"],
  nopc: ["No PC yet", "#EFECE5", "#5E574D"],
};

const TINTS = ["#FDEBDC", "#E6EEFB", "#E3F4EA", "#F4ECFB", "#FBF0D9"];

interface Row {
  m: Member;
  first: string;
  status: Status;
  short: string;
  waiting: boolean;
  tip: ReactElement;
  aria: string;
  pc: string;
  pcOn: boolean;
}

/** The person's changes today (oldest first), from the work log. */
function entriesFor(m: Member, log: WorkLogEntry[] | undefined): WorkLogEntry[] {
  return (log ?? []).filter((e) => e.member_id === m.id);
}

function rowOf(m: Member, log: WorkLogEntry[] | undefined, now: number): Row {
  const first = firstName(m.name) || m.name;
  const d = m.device;
  const presence = presenceOf(d);
  const mine = entriesFor(m, log);
  const lastChange = mine[mine.length - 1];
  const started = mine.find((e) => e.state === "working");
  const pending = mine.find((e) => e.approval === "pending");
  const ended = d?.work_state === "ended";
  const status: Status =
    presence === "working"
      ? "working"
      : presence === "break"
        ? "break"
        : presence === "online"
          ? ended
            ? "out"
            : "notin"
          : presence === "offline"
            ? "offline"
            : "nopc";
  const waiting = !!pending;
  const worked = d?.worked_seconds ?? 0;
  let short: string;
  const rows: TipRow[] = [];
  if (waiting) {
    short = "Waiting for your OK";
  } else if (status === "working") {
    short = started ? `since ${formatTime(started.at)}` : worked ? `${formatDuration(worked)} today` : "Working";
  } else if (status === "break") {
    short = lastChange?.state === "on_break" ? `${lastChange.reason || "Break"} since ${formatTime(lastChange.at)}` : "On a break";
  } else if (status === "out") {
    short = lastChange?.state === "ended" ? `Ended ${formatTime(lastChange.at)}` : "Day ended";
  } else if (status === "offline") {
    short = `Seen ${formatRelative(d?.last_seen_at, now, "never")}`;
  } else if (status === "nopc") {
    short = "";
  } else {
    short = "Not started";
  }
  let tip: ReactElement;
  if (waiting && pending) {
    const isBreak = pending.state === "on_break";
    tip = (
      <TipBody
        title="Waiting for your OK"
        color="#8A5300"
        sub={m.name}
        rows={
          isBreak
            ? [
                { label: "Asking for", value: "Break OK" },
                { label: "On break since", value: formatTime(pending.at) },
              ]
            : [
                { label: "Asking for", value: "Early End day OK" },
                { label: "Pressed End day", value: formatTime(pending.at) },
              ]
        }
        text={pending.note ? `“${pending.note}”` : undefined}
        hint="Approve or Not approved in Needs you"
      />
    );
  } else if (status === "working") {
    if (started) rows.push({ label: "Started day", value: formatTime(started.at) });
    rows.push({ label: "Worked today", value: formatDuration(worked) });
    rows.push({ label: "PC", value: "Online" });
    tip = <TipBody title="Working" color="#17663F" sub={m.name} rows={rows} hint={`Click for ${first}’s day in Today’s activity`} />;
  } else {
    tip = (
      <TipBody
        title={ST[status][0]}
        color={ST[status][2]}
        sub={m.name}
        rows={[
          { label: "Today", value: short || "Not connected" },
          { label: "PC", value: d ? (d.is_online ? "Online" : "Offline") : "Not connected" },
        ]}
      />
    );
  }
  const pc = d?.hostname || "No PC yet";
  const pcState = d ? (d.is_online ? "PC online" : "PC offline") : "no PC connected";
  return {
    m,
    first,
    status,
    short,
    waiting,
    tip,
    pc,
    pcOn: !!d?.is_online,
    aria: `${m.name}, ${ST[status][0]}, ${short}. ${pc}, ${pcState}. Open ${first}’s day in Today’s activity`,
  };
}

/**
 * Team today (DashOverview): one line per person — avatar, name, PC, status pill, time — live from each person's
 * Start day, Take a break and End day buttons (device work_state + today's work log). Filter on desktop, a sheet
 * on a phone.
 */
export function TeamToday({
  members,
  log,
  now,
  tip,
}: {
  members: Member[] | undefined;
  log: WorkLogEntry[] | undefined;
  now: number;
  tip: Tip;
}): ReactElement {
  const [filter, setFilter] = useState<Filter>("all");
  const [atEnd, setAtEnd] = useState(false);
  const [sheet, setSheet] = useState(false);

  const active = (members ?? []).filter((m) => m.is_active);
  const rows = active.map((m) => rowOf(m, log, now));
  const count = (f: Filter) =>
    f === "all" ? rows.length : rows.filter((r) => (f === "out" ? !["working", "break"].includes(r.status) : r.status === f)).length;
  const visible = rows.filter((r) => filter === "all" || (filter === "out" ? !["working", "break"].includes(r.status) : r.status === filter));
  const FILTERS: ReadonlyArray<readonly [Filter, string]> = [
    ["all", "All"],
    ["working", "Working"],
    ["break", "Break"],
    ["out", "Out"],
  ];
  const now_ = FILTERS.find((f) => f[0] === filter) ?? FILTERS[0];
  const inCount = rows.filter((r) => r.status === "working" || r.status === "break").length;
  const pcs = active.filter((m) => m.device).length;
  const online = active.filter((m) => m.device?.is_online).length;
  const pick = (f: Filter) => {
    setFilter(f);
    setAtEnd(false);
  };

  return (
    <section className="z-card zn-ov-team" aria-labelledby="team-h" data-tip-bound="team">
      <div className="zn-ov-team-head">
        <div style={{ minWidth: 0 }}>
          <h2 id="team-h" className="zn-ov-h2">
            Team today
          </h2>
          <span style={{ fontSize: 13, color: "#6B6459" }}>Live from each person's Start day, Take a break and End day buttons.</span>
        </div>
        <div role="group" aria-label="Filter team" className="z-segs zn-desk-only" style={{ flexWrap: "nowrap" }}>
          {FILTERS.map(([k, label]) => (
            <button key={k} type="button" className={`z-seg${filter === k ? " on" : ""}`} aria-pressed={filter === k} onClick={() => pick(k)}>
              {label} <span className="z-num" style={{ opacity: 0.6 }}>{count(k)}</span>
            </button>
          ))}
        </div>
        <button type="button" className="z-btn sm zn-phone-only" aria-haspopup="dialog" onClick={() => setSheet(true)}>
          <ZIcon d="M4 6h16M7 12h10M10 18h4" size={15} stroke={2} />
          Show: {now_[1]} · {count(filter)}
        </button>
      </div>
      <div className="zn-ov-team-body">
        <div
          className="zn-ov-team-list"
          onScroll={(e) => {
            const el = e.currentTarget;
            const end = el.scrollTop + el.clientHeight >= el.scrollHeight - 6;
            if (end !== atEnd) setAtEnd(end);
          }}
        >
          {members === undefined ? (
            <SkRows label="Loading your team" rows={5} />
          ) : rows.length === 0 ? (
            <p className="zn-ov-empty">
              No one on your team yet. <Link to="/app/team#add=1">Add a person</Link> to see who’s working.
            </p>
          ) : visible.length === 0 ? (
            <p className="zn-ov-empty">No one here right now.</p>
          ) : (
            visible.map((r) => {
              const key = r.first.toLowerCase();
              return (
                <div key={r.m.id} className="zn-ov-person">
                  <Link className="z-row zn-ov-plink" to={`/app/activity#m=${key}`} aria-label={r.aria} {...tip.anchor(`team-${r.m.id}`, r.tip, { wide: true })}>
                    <MemberAvatar
                      member={r.m}
                      size={28}
                      className="zn-ov-avatar"
                      initials={r.m.name
                        .split(/\s+/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((w) => w[0])
                        .join("")
                        .toUpperCase()}
                      style={{ background: TINTS[r.m.id % TINTS.length], color: "#141210", fontSize: 11 }}
                    />
                    <b style={{ flex: "none", fontWeight: 600 }}>{r.m.name}</b>
                    <span className="zn-ov-pc">
                      <span className="zn-ov-dot" style={{ background: r.pcOn ? "#17663F" : "#6B6358" }} aria-hidden="true" />
                      <span className="z-mono" style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {r.pc}
                      </span>
                    </span>
                    <span data-tip-at="1" className="zn-help zn-ov-state">
                      <span className="z-pill" style={{ background: ST[r.status][1], color: ST[r.status][2] }}>
                        {ST[r.status][0]}
                      </span>
                      <span className={`z-num zn-ptime${r.waiting ? " wait" : ""}`}>{r.short}</span>
                    </span>
                  </Link>
                  <Link className="z-chatlink" to={`/app/chat#m=${key}`} aria-label={`Chat with ${r.first}`} title={`Chat with ${r.first}`} style={{ width: 30, height: 30 }}>
                    <ZIcon name="chat" size={16} />
                  </Link>
                </div>
              );
            })
          )}
        </div>
        {!atEnd && visible.length > 6 ? <div className="zn-fade" aria-hidden="true" /> : null}
      </div>
      <div className="zn-ov-foot">
        <span className="z-num" style={{ color: "#6B6459" }}>
          {members === undefined ? "" : `${inCount} of ${rows.length} in · ${online} of ${pcs} PCs online`}
        </span>
        <Link to="/app/team" style={{ fontWeight: 600 }}>
          See all on Team →
        </Link>
      </div>
      <Sheet open={sheet} title="Show in Team today" onClose={() => setSheet(false)} labelledBy="ov-sheet-h">
        <div role="group" aria-label="Show" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {FILTERS.map(([k, label]) => (
            <button
              key={k}
              type="button"
              className={`zn-opt${filter === k ? " on" : ""}`}
              aria-pressed={filter === k}
              onClick={() => {
                pick(k);
                setSheet(false);
              }}
            >
              <span>{label}</span>
              <span className="z-num" style={{ color: "#6B6358" }}>
                {count(k)}
              </span>
            </button>
          ))}
        </div>
      </Sheet>
    </section>
  );
}
