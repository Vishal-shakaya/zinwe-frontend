import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { SendAlertMenu } from "../components/SendAlertMenu";
import { UsbRestore } from "../components/UsbRestore";
import { LEVEL_DEF, LEVEL_LABEL } from "../fixtures/majorAlerts";
import { TipBody } from "../ui/Tooltip";
import type { Tip } from "../ui/useTip";
import { ZIcon } from "../ui/ZIcon";
import { KIND_ICON, LEVEL_TONE, type AlertView } from "./alertModel";

/**
 * One alert on Alerts (DashAlerts row): checkbox, level icon, person-first title (tap to open the details),
 * level pill with its legend tooltip, "N times", "Asked · …", the size against your limit, the detail, who ·
 * PC · time, their reply, and the actions: Ask + Mark as fine, or Mark as fine + Open chat once asked.
 */
export function AlertRow({
  a,
  open,
  flash,
  selected,
  busy,
  canAsk,
  tip,
  onToggleOpen,
  onToggleSelect,
  onAsk,
  onFine,
  onReopen,
  onDevicesChanged,
  onChanged,
}: {
  a: AlertView;
  open: boolean;
  flash: boolean;
  selected: boolean;
  busy: boolean;
  /** The plan includes messaging the team (else Ask links to the upgrade). */
  canAsk: boolean;
  tip: Tip;
  onToggleOpen: () => void;
  onToggleSelect: () => void;
  onAsk: () => void;
  onFine: () => void;
  onReopen: () => void;
  onDevicesChanged: () => void;
  onChanged: Parameters<typeof SendAlertMenu>[0]["onChanged"];
}): ReactElement {
  const tone = LEVEL_TONE[a.level];
  const asked = !!a.ask;
  const replied = !!a.ask?.reply;
  const active = !a.done;
  const followUp = active && asked;
  const canAskNow = active && !asked && !!a.person;
  const detailsId = `al-more-${a.id}`;
  const chatHref = a.person ? `/app/chat#m=${a.first.toLowerCase()}` : "/app/chat";

  return (
    <article
      id={`al-row-${a.id}`}
      className={`zn-al-row${open ? " open" : ""}${flash ? " flash" : ""}`}
      style={{ borderLeftColor: tone.bar }}
    >
      <div className="zn-arow">
        {active ? (
          <input
            type="checkbox"
            className="zn-al-check"
            aria-label={`Select ${a.title}`}
            checked={selected}
            onChange={onToggleSelect}
          />
        ) : null}
        <span className="zn-aicon" style={{ background: tone.bg, color: tone.fg }} aria-hidden="true">
          <ZIcon d={KIND_ICON[a.kind]} size={18} stroke={2} />
        </span>
        <div className="zn-al-main">
          <div className="zn-al-titlerow">
            <button type="button" className="zn-al-title" onClick={onToggleOpen} aria-expanded={open} aria-controls={detailsId}>
              {a.title}
            </button>
            <span
              className={`z-pill zn-help ${tone.pill}`}
              tabIndex={0}
              {...tip.anchor(`lv-${a.id}`, <TipBody text={<><b>{LEVEL_LABEL[a.level]}</b> — {LEVEL_DEF[a.level]}</>} />)}
            >
              {LEVEL_LABEL[a.level]}
            </span>
            {a.count > 1 ? <span className="z-pill">{a.count} times</span> : null}
            {active && asked ? <span className="z-pill blue">{replied ? "Asked · replied" : "Asked · waiting for reply"}</span> : null}
          </div>
          {a.limit ? (
            <span className={`z-num zn-al-limit${a.limit.over ? " over" : ""}`}>{a.limit.text}</span>
          ) : null}
          <span style={{ color: "#404040" }}>{a.body}</span>
          <span className="zn-al-meta">
            {a.person ? a.person.name : "No one linked"} · {a.pc} · {a.time}
          </span>
          {a.ask?.reply ? (
            <div className="zn-reply">
              <span style={{ fontSize: 12, fontWeight: 600, color: "#404040" }}>
                {a.first} replied at {a.ask.reply.at}
              </span>
              <span>“{a.ask.reply.text}”</span>
            </div>
          ) : null}
          {a.lockedPc ? (
            <div className="zn-al-usb">
              <UsbRestore device={a.lockedPc} onRestored={onDevicesChanged} />
            </div>
          ) : null}
          {open ? (
            <div className="zn-al-more" id={detailsId}>
              <div className="zn-al-box">
                <span className="z-lbl">What happened</span>
                {a.facts.map((f, i) => (
                  <span key={i} style={{ fontSize: 13 }}>
                    {f}
                  </span>
                ))}
              </div>
              <div className="zn-al-box">
                <span className="z-lbl">Why it matters</span>
                <span style={{ fontSize: 13 }}>{a.why}</span>
                <Link to={a.ruleHref} style={{ fontSize: 13, fontWeight: 600 }}>
                  {a.ruleLink}
                </Link>
                {/* The older "Send alert" menu stays reachable here: urgency + tags, email, block the site / tool. */}
                <div className="zn-al-more-acts">
                  <SendAlertMenu
                    event={a.latest}
                    person={a.person ? { id: a.person.id, name: a.person.name, email: a.person.email } : undefined}
                    compact
                    onChanged={onChanged}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
        <div className="zn-aact">
          {active && !followUp ? (
            <>
              {canAskNow ? (
                canAsk ? (
                  <button type="button" className="z-btn sm dark" aria-haspopup="dialog" onClick={onAsk}>
                    Ask {a.first}
                  </button>
                ) : (
                  <Link className="z-btn sm dark" to="/app/upgrade" title="Messaging your team is on a higher plan">
                    <ZIcon name="lock" size={14} />
                    Ask {a.first}
                  </Link>
                )
              ) : null}
              <button type="button" className="z-btn sm" onClick={onFine} disabled={busy}>
                Mark as fine
              </button>
            </>
          ) : null}
          {followUp ? (
            <>
              <button type="button" className="z-btn sm dark" onClick={onFine} disabled={busy}>
                Mark as fine
              </button>
              <Link className="z-btn sm" to={chatHref}>
                Open chat
              </Link>
            </>
          ) : null}
          {a.handled ? (
            <>
              <span className="z-pill green">Marked as fine</span>
              <button type="button" className="z-btn sm" onClick={onReopen} disabled={busy}>
                Reopen
              </button>
            </>
          ) : null}
          {!a.handled && a.level === "auto" ? <span className="z-pill">Nothing to do</span> : null}
        </div>
      </div>
    </article>
  );
}
