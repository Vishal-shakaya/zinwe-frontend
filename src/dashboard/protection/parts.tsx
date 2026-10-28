/**
 * Shared parts of the three Protection boards (DashOnline, DashData, DashApps): the phone sub-tabs, the board
 * tile, the header filters (desktop selects + phone "Filters" sheet), the Ask sheet and small helpers.
 */
import { useState, type ReactElement, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { errorMessage, sendMessage, type DeviceEvent, type Member } from "../../lib/api";
import { alertLabel, severityOf } from "../features/events";
import { firstName } from "./helpers";
import { useEntitlements } from "../features/entitlements";
import { useUpgrade } from "../features/upgrade";
import { Sheet, Spinner } from "../ui/States";
import type { Tip } from "../ui/useTip";
import { TipBody, type TipRow } from "../ui/Tooltip";
import { ZIcon } from "../ui/ZIcon";

/** Sub-tabs between the three Protection pages: phone only (the desktop sidebar lists them). */
export function ProtectionTabs(): ReactElement {
  const tabs = [
    ["/app/internet", "Internet usage"],
    ["/app/data", "Data safety"],
    ["/app/remote", "Apps & remote"],
  ] as const;
  return (
    <nav className="zp-subnav zn-phone-only" aria-label="Protection">
      {tabs.map(([to, label]) => (
        <NavLink key={to} to={{ pathname: to, search: "" }} className={({ isActive }) => `zp-subtab${isActive ? " on" : ""}`}>
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

/** A definition shown in the shared tooltip: title, one line, then label / value rows. */
export interface TileDef {
  title?: string;
  sub?: string;
  rows?: readonly TipRow[];
  text?: string;
}

/** One board tile: label (an info button when it has a definition), big number, small line. */
export function Tile({
  label,
  value,
  sub,
  color,
  def,
  tip,
  tipKey,
  loading = false,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  color?: string;
  def?: TileDef;
  tip?: Tip;
  tipKey?: string;
  loading?: boolean;
}): ReactElement {
  return (
    <div className="z-card zp-tile">
      {def && tip ? (
        <span>
          <button type="button" className="zp-def zp-tile__lbl" {...tip.anchor(tipKey ?? label, <TipBody title={def.title} sub={def.sub} rows={def.rows} text={def.text} />, { wide: !!def.title })}>
            {label}
            <ZIcon name="info" size={13} stroke={2} />
          </button>
        </span>
      ) : (
        <span className="zp-tile__lbl">{label}</span>
      )}
      {loading ? (
        <span className="z-sk" aria-hidden="true" style={{ width: "50%", height: 28, margin: "4px 0" }} />
      ) : (
        <b className="z-num zp-tile__val" style={color ? { color } : undefined}>
          {value}
        </b>
      )}
      {sub !== undefined ? <span className="zp-tile__sub">{loading ? " " : sub}</span> : null}
    </div>
  );
}

export interface PeriodOption {
  days: number;
  label: string;
}

/**
 * Who + when for a Protection page: desktop shows the selects in the header, a phone shows "Filters · …" that
 * opens a sheet with the same controls. A period beyond the plan's history opens the plan page instead.
 */
export function HeaderFilters({
  members,
  member,
  onMember,
  periods,
  days,
  onDays,
  periodStyle = "select",
  extra,
  sheetExtra,
}: {
  members: Member[] | undefined;
  member: number | null;
  onMember: (id: number | null) => void;
  periods?: readonly PeriodOption[];
  days?: number;
  onDays?: (days: number) => void;
  /** Online uses a select, Data uses segmented buttons. */
  periodStyle?: "select" | "segs";
  /** Extra header items after the filters (e.g. "Remote-tool rule"). */
  extra?: ReactNode;
  /** Extra controls inside the phone sheet (e.g. Data's routes). */
  sheetExtra?: ReactNode;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const { historyDays } = useEntitlements();
  const upgrade = useUpgrade();
  const locked = (d: number) => historyDays > 0 && d > historyDays;
  const pickDays = (d: number) => (locked(d) ? upgrade.open() : onDays?.(d));
  const person = member !== null ? members?.find((m) => m.id === member) : undefined;
  const period = periods?.find((p) => p.days === days);
  const filtLabel = [period?.label, person ? firstName(person.name) : "Everyone"].filter(Boolean).join(" · ");

  const personSelect = (id: string, phone: boolean) => (
    <select
      id={id}
      className={`zp-sel${phone ? " lg" : ""}`}
      value={member === null ? "all" : String(member)}
      onChange={(e) => onMember(e.target.value === "all" ? null : Number(e.target.value))}
    >
      <option value="all">Everyone</option>
      {(members ?? []).map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
        </option>
      ))}
      {member !== null && members === undefined ? <option value={member}>Loading…</option> : null}
    </select>
  );

  const periodControl = (id: string, phone: boolean) => {
    if (!periods || days === undefined) return null;
    if (periodStyle === "segs") {
      return (
        <div className="z-segs" role="group" aria-label="Period" style={phone ? { display: "flex" } : undefined}>
          {periods.map((p) => (
            <button
              key={p.days}
              type="button"
              className={`z-seg${days === p.days ? " on" : ""}`}
              style={phone ? { flex: "1 1 0", minHeight: 40, justifyContent: "center" } : undefined}
              aria-pressed={days === p.days}
              onClick={() => pickDays(p.days)}
            >
              {locked(p.days) ? <ZIcon name="lock" size={13} stroke={2} /> : null}
              {p.label}
              {locked(p.days) ? <span className="z-sr"> (upgrade to see)</span> : null}
            </button>
          ))}
        </div>
      );
    }
    return (
      <select id={id} className={`zp-sel${phone ? " lg" : ""}`} value={days} onChange={(e) => pickDays(Number(e.target.value))}>
        {periods.map((p) => (
          <option key={p.days} value={p.days}>
            {p.label}
            {locked(p.days) ? " (upgrade)" : ""}
          </option>
        ))}
      </select>
    );
  };

  return (
    <>
      <div className="zp-filt zn-desk-only">
        {periods && periodStyle === "select" ? (
          <>
            <label htmlFor="zp-period" className="z-sr">
              Period
            </label>
            {periodControl("zp-period", false)}
          </>
        ) : null}
        <label htmlFor="zp-who" className="z-sr">
          Person
        </label>
        {personSelect("zp-who", false)}
        {periods && periodStyle === "segs" ? periodControl("zp-period", false) : null}
      </div>
      <button type="button" className="z-btn sm zn-phone-only" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <ZIcon d="M4 6h16M7 12h10M10 18h4" size={14} stroke={2} />
        Filters · {filtLabel}
      </button>
      {extra}
      <Sheet open={open} title="Filters" onClose={() => setOpen(false)} labelledBy="zp-flt-h">
        {periods ? (
          periodStyle === "segs" ? (
            <div className="zp-fl">
              Period
              {periodControl("zp-period-m", true)}
            </div>
          ) : (
            <label className="zp-fl" htmlFor="zp-period-m">
              Period
              {periodControl("zp-period-m", true)}
            </label>
          )
        ) : null}
        <label className="zp-fl" htmlFor="zp-who-m">
          Person
          {personSelect("zp-who-m", true)}
        </label>
        {sheetExtra}
        <button type="button" className="z-btn dark" style={{ minHeight: 44 }} onClick={() => setOpen(false)}>
          Done
        </button>
      </Sheet>
    </>
  );
}

/** What an Ask is about: the person, a one-line "about", the pre-filled message and (if any) the alert. */
export interface AskTarget {
  key: string;
  member: { id: number; name: string };
  about: string;
  message: string;
  event?: DeviceEvent;
}

/**
 * The one Ask sheet (§6): pre-filled, editable, kind. Send goes to their Zinwe app (a chat note); a note about
 * an alert marks that alert handled on the server.
 */
export function AskSheet({ target, onClose, onSent }: { target: AskTarget | null; onClose: () => void; onSent: (t: AskTarget) => void }): ReactElement | null {
  const [msg, setMsg] = useState("");
  const [forKey, setForKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A new target resets the draft (render-time sync, no effect).
  if (target && forKey !== target.key) {
    setForKey(target.key);
    setMsg(target.message);
    setError(null);
  }
  if (!target) return null;
  const first = firstName(target.member.name);
  const send = async () => {
    const body = msg.trim();
    if (!body || busy) return;
    setBusy(true);
    setError(null);
    try {
      const fallback = body.split("\n")[0].slice(0, 80) + (body.length > 80 ? "…" : "");
      await sendMessage(target.member.id, {
        title: target.event ? alertLabel(target.event) : fallback,
        body,
        severity: target.event ? severityOf(target.event) : "info",
        channel: "chat",
        ...(target.event ? { event_id: target.event.id } : {}),
      });
      onSent(target);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet open title={`Ask ${first}`} sub={target.about} onClose={onClose} labelledBy="zp-ask-h">
      <label className="zp-fl" htmlFor="zp-ask-msg">
        Message
        <textarea id="zp-ask-msg" className="zp-ta" value={msg} maxLength={2000} onChange={(e) => setMsg(e.target.value)} />
      </label>
      <p style={{ margin: 0, fontSize: 12, color: "#6B6358" }}>Goes to {first}’s Zinwe app. Their reply shows here and in Alerts.</p>
      {error ? (
        <p className="z-err" role="alert" style={{ margin: 0 }}>
          {error}
        </p>
      ) : null}
      <div className="zn-sheet-acts zp-acts">
        <button type="button" className="z-btn" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="z-btn dark" disabled={!msg.trim() || busy} onClick={() => void send()}>
          {busy ? <Spinner size={16} tone="on-dark" /> : null}
          Send
        </button>
      </div>
    </Sheet>
  );
}

/** The Ask button, or (plan without messaging people about alerts) a link to the plan that has it. */
export function AskButton({ first, onAsk }: { first: string; onAsk: () => void }): ReactElement {
  const { has, upgradeFor } = useEntitlements();
  const upgrade = useUpgrade();
  if (has("alert_to_employee")) {
    return (
      <button type="button" className="z-btn sm dark" aria-haspopup="dialog" onClick={onAsk}>
        Ask {first}
      </button>
    );
  }
  const plan = upgradeFor("alert_to_employee");
  return (
    <button type="button" className="z-btn sm" title={`Asking people from an alert is on the ${plan?.name ?? "next"} plan`} onClick={() => upgrade.open()}>
      <ZIcon name="lock" size={13} stroke={2} />
      Ask {first}
    </button>
  );
}

/** Card-level error with a retry (the board's error state for one card). */
export function CardError({ error, onRetry }: { error: unknown; onRetry: () => void }): ReactElement {
  return (
    <div className="z-state err" role="alert" style={{ padding: "20px 16px" }}>
      <span className="z-state__mark">
        <ZIcon name="alerts" />
      </span>
      <b>We couldn&rsquo;t load this</b>
      <span style={{ maxWidth: 420 }}>{errorMessage(error)}</span>
      <button type="button" className="z-btn sm" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
