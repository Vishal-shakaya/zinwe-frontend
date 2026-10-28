import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { errorMessage, markEventHandled, type DeviceEvent } from "../../lib/api";
import { cx } from "../../lib/cx";
import { useChatBubble } from "../features/chatBubble";
import { useEntitlements } from "../features/entitlements";
import { eventDomain, eventMeta, eventTool, isHandled, severityOf } from "../features/events";
import { contextOf, tagsFor, URGENCY, type Urgency } from "../features/messageTags";
import type { ComposerPerson } from "./TaggedComposer";
import { DashIcon } from "./DashIcon";

/**
 * "Send alert ▾": choose how urgent it is and what the note is for (tags made
 * for this kind of alert), and a chat bubble opens with the draft ready — send
 * it to their PC, by email, or both from there. The menu also offers the next
 * step: block the site or the remote tool, review the rule, or mark the alert
 * handled. Arrow keys move through the items; Escape closes.
 */
interface SendAlertMenuProps {
  event: DeviceEvent;
  person: ComposerPerson | undefined;
  hostname?: string;
  /** Smaller button for dense tables. */
  compact?: boolean;
  /** The alert was marked handled (or opened again), or the person was messaged about it. */
  onChanged?: (event: DeviceEvent) => void;
}

/** Plan enforcement: alerting the employee (their PC + email) is a Businesses feature. */
export function SendAlertMenu(props: SendAlertMenuProps): ReactElement {
  const { has, upgradeFor } = useEntitlements();
  if (has("alert_to_employee")) return <SendAlertMenuInner {...props} />;
  const plan = upgradeFor("alert_to_employee");
  return (
    <Link
      className={cx("z-btn sm sam__btn", props.compact && "sam__btn--compact")}
      to={plan ? `/app/upgrade?plan=${encodeURIComponent(plan.code)}` : "/app/upgrade"}
      data-tip={`Emailing an alert to the employee is on the ${plan?.name ?? "next"} plan`}
    >
      <DashIcon name="lock" />
      <span>Send alert</span>
    </Link>
  );
}

function SendAlertMenuInner({ event, person, hostname, compact = false, onChanged }: SendAlertMenuProps): ReactElement {
  const meta = eventMeta(event.type);
  const domain = eventDomain(event);
  const tool = eventTool(event);
  const bubble = useChatBubble();
  const menuId = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [urgency, setUrgency] = useState<Urgency>(severityOf(event));
  const [sent, setSent] = useState(Boolean(event.emailed_at));
  const [handled, setHandled] = useState(isHandled(event));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const first = person ? person.name.trim().split(/\s+/)[0] || person.name : "";
  const ctx = contextOf(event);

  // Close the menu on an outside click or Escape; start the keyboard on the first item.
  useEffect(() => {
    if (!menuOpen) return;
    wrap.current?.querySelector<HTMLElement>('[role="menuitem"], [role="radio"]')?.focus();
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // Up / Down (and Home / End) move between the menu's items (J5-26).
  const onMenuKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = [...(wrap.current?.querySelectorAll<HTMLElement>('[role="menuitem"], [role="radio"]') ?? [])];
    const at = items.indexOf(document.activeElement as HTMLElement);
    const go = (i: number) => {
      e.preventDefault();
      items[(i + items.length) % items.length]?.focus();
    };
    if (e.key === "ArrowDown") go(at + 1);
    else if (e.key === "ArrowUp") go(at - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(items.length - 1);
    else if (e.key === "Tab") setMenuOpen(false);
  };

  const openChat = (tag: string | null) => {
    if (!person) return;
    setMenuOpen(false);
    bubble.open({
      person: { ...person, hostname: hostname ?? event.hostname },
      event,
      tag,
      urgency,
      // Normal → their PC only; Important / Urgent → their PC and email (the owner can still change it).
      onSent: () => {
        setSent(true);
        setHandled(true);
        onChanged?.({ ...event, handled_at: event.handled_at ?? new Date().toISOString() });
      },
    });
  };

  const toggleHandled = async () => {
    setBusy(true);
    setError(null);
    try {
      const next = await markEventHandled(event.id, !handled);
      setHandled(isHandled(next));
      setMenuOpen(false);
      onChanged?.(next);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const label = sent ? (first ? `Messaged ${first}` : "Sent") : handled ? "Handled" : "Send alert";

  return (
    <div className={cx("sam", menuOpen && "is-open")} ref={wrap}>
      <button
        ref={button}
        type="button"
        className={cx("z-btn sm sam__btn", sent || handled ? "is-sent" : "dark", compact && "sam__btn--compact")}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-controls={menuId}
        onClick={() => setMenuOpen((o) => !o)}
      >
        <DashIcon name={sent || handled ? "check" : "alert"} />
        <span>{label}</span>
        <span className="sam__caret" aria-hidden="true">
          ▾
        </span>
      </button>

      {menuOpen ? (
        <div className="sam__menu" role="menu" id={menuId} aria-label="Alert actions" onKeyDown={onMenuKey}>
          {person ? (
            <>
              <p className="sam__head">How urgent?</p>
              <div className="sam__urgency" role="radiogroup" aria-label="Urgency">
                {URGENCY.map((u) => (
                  <button
                    key={u.value}
                    type="button"
                    role="radio"
                    aria-checked={urgency === u.value}
                    className={cx("tc__seg-opt", `tc__seg-opt--${u.value}`, urgency === u.value && "is-on")}
                    onClick={() => setUrgency(u.value)}
                  >
                    {u.label}
                  </button>
                ))}
              </div>

              <p className="sam__head">Message {first} about…</p>
              {tagsFor(event).map((t) => (
                <button key={t.id} type="button" role="menuitem" className="sam__item" onClick={() => openChat(t.id)}>
                  <DashIcon name={t.icon} />
                  <span>
                    <b>{t.label}</b>
                    <small>{t.draft(first, ctx)}</small>
                  </span>
                </button>
              ))}
              <button type="button" role="menuitem" className="sam__item" onClick={() => openChat(null)}>
                <DashIcon name="chat" />
                <span>
                  <b>Write my own</b>
                  <small>Open the chat with a blank note</small>
                </span>
              </button>
            </>
          ) : (
            <p className="sam__none">This PC isn't linked to a team member, so there's no one to alert.</p>
          )}
          <hr className="sam__rule" />
          {meta.action === "block-domain" && domain ? (
            <Link role="menuitem" className="sam__item" to={`/app/internet?block=${encodeURIComponent(domain)}`}>
              <DashIcon name="shield" />
              <span>
                <b>Block {domain}</b>
                <small>Add it to your blocked sites</small>
              </span>
            </Link>
          ) : null}
          {meta.action === "block-tool" && tool ? (
            <Link role="menuitem" className="sam__item" to={`/app/remote?block=${encodeURIComponent(tool)}#remote-title`}>
              <DashIcon name="shield" />
              <span>
                <b>Block {tool}</b>
                <small>Close it whenever it starts on any PC</small>
              </span>
            </Link>
          ) : null}
          <Link role="menuitem" className="sam__item" to={meta.reviewTo}>
            <DashIcon name="settings" />
            <span>
              <b>{meta.reviewTo === "/app/team" ? "Open Team & devices" : "Review the rule"}</b>
              <small>{meta.reviewTo === "/app/team" ? "Restore USB on their card" : "Open the feature's settings"}</small>
            </span>
          </Link>
          <button
            type="button"
            role="menuitem"
            className="sam__item"
            onClick={() => void toggleHandled()}
            disabled={busy}
          >
            <DashIcon name={handled ? "refresh" : "check"} />
            <span>
              <b>{handled ? "Not handled yet" : "Mark as handled"}</b>
              <small>{handled ? "Put it back on your list to check" : "Take it off your list to check"}</small>
            </span>
          </button>
          {error ? (
            <p className="form__err sam__err" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default SendAlertMenu;
