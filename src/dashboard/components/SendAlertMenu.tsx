import { useEffect, useId, useRef, useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import type { DeviceEvent } from "../../lib/api";
import { cx } from "../../lib/cx";
import { useChatBubble } from "../features/chatBubble";
import { eventDomain, eventMeta, severityOf } from "../features/events";
import { contextOf, tagsFor, URGENCY, type Urgency } from "../features/messageTags";
import type { ComposerPerson } from "./TaggedComposer";
import { DashIcon } from "./DashIcon";

/**
 * "Send alert ▾": choose how urgent it is and what the note is for (tags made
 * for this kind of alert), and a chat bubble opens with the draft ready — send
 * it to their PC, by email, or both from there. The menu also offers the next
 * step: block the site, or review the rule.
 */
export function SendAlertMenu({
  event,
  person,
  hostname,
  compact = false,
}: {
  event: DeviceEvent;
  person: ComposerPerson | undefined;
  hostname?: string;
  /** Smaller button for dense tables. */
  compact?: boolean;
}): ReactElement {
  const meta = eventMeta(event.type);
  const domain = eventDomain(event);
  const bubble = useChatBubble();
  const menuId = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [urgency, setUrgency] = useState<Urgency>(severityOf(event));
  const [sent, setSent] = useState(Boolean(event.emailed_at));
  const first = person ? person.name.trim().split(/\s+/)[0] || person.name : "";
  const ctx = contextOf(event);

  // Close the menu on an outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const openChat = (tag: string | null) => {
    if (!person) return;
    setMenuOpen(false);
    bubble.open({
      person: { ...person, hostname: hostname ?? event.hostname },
      event,
      tag,
      urgency,
      delivery: "both",
      onSent: () => setSent(true),
    });
  };

  return (
    <div className={cx("sam", menuOpen && "is-open")} ref={wrap}>
      <button
        type="button"
        className={cx("btn dash-btn-sm sam__btn", sent ? "btn--ghost is-sent" : "btn--ink", compact && "sam__btn--compact")}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-controls={menuId}
        onClick={() => setMenuOpen((o) => !o)}
      >
        <DashIcon name={sent ? "check" : "alert"} />
        <span>{sent ? "Sent" : "Send alert"}</span>
        <span className="sam__caret" aria-hidden="true">
          ▾
        </span>
      </button>

      {menuOpen ? (
        <div className="sam__menu" role="menu" id={menuId}>
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
          <Link role="menuitem" className="sam__item" to={meta.reviewTo}>
            <DashIcon name="settings" />
            <span>
              <b>Review the rule</b>
              <small>Open the feature's settings</small>
            </span>
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export default SendAlertMenu;
