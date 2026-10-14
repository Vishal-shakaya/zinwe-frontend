import { useEffect, useRef, useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import type { Member } from "../../lib/api";
import { cx } from "../../lib/cx";
import { PRESENCE_CLASS, PRESENCE_LABEL, presenceOf } from "../features/memberStatus";
import { DashIcon } from "./DashIcon";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

/**
 * Floating "Chat" button (beside Support): shows unread replies, and opens a
 * small picker of your team — people with new replies first. Picking someone
 * opens the chat bubble with them.
 */
export function ChatLauncher({
  members,
  onPick,
}: {
  members: Member[] | undefined;
  onPick: (member: Member) => void;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const active = (members ?? [])
    .filter((m) => m.is_active)
    .sort((a, b) => (b.unread ?? 0) - (a.unread ?? 0) || a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  const unread = active.reduce((sum, m) => sum + (m.unread ?? 0), 0);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={cx("cl", open && "is-open")} ref={wrap}>
      {open ? (
        <section className="cl__panel" aria-label="Chat with your team">
          <header className="cl__head">
            <b>Chat with your team</b>
            <small>{unread > 0 ? `${unread} new ${unread === 1 ? "reply" : "replies"}` : "Messages go to their PC, and by email if you choose."}</small>
          </header>
          {members === undefined ? (
            <p className="dash-note cl__empty">Loading…</p>
          ) : active.length === 0 ? (
            <p className="dash-note cl__empty">
              No one to chat with yet.{" "}
              <Link className="dash-link" to="/app/team" onClick={() => setOpen(false)}>
                Add your team
              </Link>
            </p>
          ) : (
            <ul className="cl__list">
              {active.map((m) => {
                const status = presenceOf(m.device);
                const count = m.unread ?? 0;
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      className={cx("cl__person", count > 0 && "is-unread")}
                      onClick={() => {
                        setOpen(false);
                        onPick(m);
                      }}
                    >
                      <span className="cb-avatar cl__avatar" aria-hidden="true">
                        {initialsOf(m.name)}
                        <i className={`tchat__dot tchat__dot--${PRESENCE_CLASS[status]}`} />
                      </span>
                      <span className="cl__who">
                        <b>{m.name}</b>
                        <small>
                          {PRESENCE_LABEL[status]}
                          {m.device?.hostname ? ` · ${m.device.hostname}` : ""}
                        </small>
                      </span>
                      {count > 0 ? <span className="sup__badge sup__badge--inline">{count}</span> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <Link className="cl__all" to="/app/chat" onClick={() => setOpen(false)}>
            Open full chat <DashIcon name="arrow" />
          </Link>
        </section>
      ) : null}

      <button
        type="button"
        className="sup__fab cl__fab"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={unread > 0 ? `Chat with your team, ${unread} new replies` : "Chat with your team"}
        data-tour="chat-fab"
      >
        <DashIcon name={open ? "close" : "team"} />
        <span className="sup__fab-label">{open ? "Close" : "Chat"}</span>
        {unread > 0 && !open ? <span className="sup__badge">{unread}</span> : null}
      </button>
    </div>
  );
}

export default ChatLauncher;
