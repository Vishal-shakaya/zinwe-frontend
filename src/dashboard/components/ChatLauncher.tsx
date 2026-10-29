import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import type { Member } from "../../lib/api";
import { PRESENCE_LABEL, presenceOf } from "../features/memberStatus";
import { avatarStyle, dotColor, initialsOf, statusLine } from "../float/people";
import { announcePanel, inFloat, useFloatSlot, useOtherPanel, usePanelEscape } from "../float/slots";
import { Sk } from "../ui/States";
import { ZIcon } from "../ui/ZIcon";
import "../../styles/dash13/float.css";

const P_CHAT = "M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z";

function replies(n: number): string {
  return `${n} new ${n === 1 ? "reply" : "replies"}`;
}

/**
 * The orange floating "Chat" button (board DashFloat), left of Support: the unread count, and a picker of your team,
 * people with new replies first. Picking someone opens their docked chat window (the list stays open, like the
 * board). Hidden on a phone, where Chat is a tab in the bottom bar.
 */
export function ChatLauncher({
  members,
  onPick,
}: {
  members: Member[] | undefined;
  onPick: (member: Member) => void;
}): ReactElement | null {
  const fabSlot = useFloatSlot("chat");
  const panelSlot = useFloatSlot("panel");
  const [open, setOpen] = useState(false);
  const fab = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useOtherPanel("chat", close);

  const active = (members ?? [])
    .filter((m) => m.is_active)
    .sort((a, b) => (b.unread ?? 0) - (a.unread ?? 0) || a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  const unread = active.reduce((sum, m) => sum + (m.unread ?? 0), 0);

  // A click anywhere outside the floating corner closes the list.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: globalThis.MouseEvent) => {
      if (!inFloat(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const toggle = () => {
    if (!open) announcePanel("chat");
    setOpen(!open);
  };
  const escape = useCallback(() => {
    setOpen(false);
    fab.current?.focus();
  }, []);
  usePanelEscape(open, escape);

  if (!fabSlot || !panelSlot) return null;

  const panel = open ? (
    <section className="zfl-panel zf-panel--chat" aria-label="Chat with your team">
      <header className="zf-phead">
        <b>Chat with your team</b>
        <small>{unread > 0 ? `${replies(unread)} · people with new replies first` : "Messages go to their PC, and by email if you choose."}</small>
      </header>
      {members === undefined ? (
        <div className="zf-plist" role="status" aria-busy="true">
          <span className="z-sr">Loading your team</span>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="zf-row zf-row--sk" aria-hidden="true">
              <Sk w={34} h={34} round />
              <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <Sk w={`${60 - i * 8}%`} h={12} />
                <Sk w="45%" h={10} />
              </span>
            </div>
          ))}
        </div>
      ) : active.length === 0 ? (
        <div className="zf-pempty">
          <b>No one to chat with yet.</b>
          <Link className="z-btn sm pri" to="/app/team#add=1" onClick={close}>
            Add your team
          </Link>
        </div>
      ) : (
        <ul className="zf-plist">
          {active.map((m) => {
            const status = presenceOf(m.device);
            const n = m.unread ?? 0;
            return (
              <li key={m.id}>
                <button
                  type="button"
                  className="zf-row"
                  aria-label={`Chat with ${m.name}, ${PRESENCE_LABEL[status]}${n ? `, ${n} new` : ""}`}
                  onClick={() => onPick(m)}
                >
                  <span className="zfl-av" aria-hidden="true" style={avatarStyle(m.role, 34)}>
                    {initialsOf(m.name)}
                    <span className="zfl-dot" style={{ background: dotColor(status) }} />
                  </span>
                  <span className="zf-who">
                    <b style={{ fontWeight: n ? 700 : 600 }}>{m.name}</b>
                    <small>{statusLine(m)}</small>
                  </span>
                  {n > 0 ? <span className="zf-count">{n}</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <Link className="zf-pall" to="/app/chat" onClick={close}>
        Open full chat <span aria-hidden="true">→</span>
      </Link>
    </section>
  ) : null;

  return (
    <>
      {panel ? createPortal(panel, panelSlot) : null}
      {createPortal(
        <button
          ref={fab}
          type="button"
          className="zf-fab zfl-chat"
          onClick={toggle}
          aria-expanded={open}
          aria-label={open ? "Close chat" : `Chat with your team${unread ? `, ${replies(unread)}` : ""}`}
          data-tour="chat-fab"
        >
          <ZIcon d={open ? "M6 6l12 12M18 6 6 18" : P_CHAT} size={20} stroke={2} />
          <span className="zf-label">{open ? "Close" : "Chat"}</span>
          {unread > 0 && !open ? (
            <span className="zf-badge" aria-hidden="true">
              {unread}
            </span>
          ) : null}
        </button>,
        fabSlot,
      )}
    </>
  );
}

export default ChatLauncher;
