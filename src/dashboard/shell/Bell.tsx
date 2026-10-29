import { useEffect, useRef, useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { SAMPLES_ON } from "../fixtures";
import type { NoteKind } from "../fixtures/notifications";
import { ZIcon, type IconName } from "../ui/ZIcon";
import { useShell } from "./shellContext";

const KIND_ICON: Record<NoteKind, IconName> = {
  chat: "chat",
  task: "tasks",
  break: "break",
  alert: "alerts",
  payment: "payment",
};

/**
 * DashTopBar: the bell and its popover. Pages put it LAST in their header row (PageHead does that);
 * placement="nav" is the copy in the phone top bar. The bell shows an orange dot only (no number) when anything is
 * unread; the counts live in the menu badges.
 * The history is sample data (fixtures/notifications.ts) until the notification centre API ships, so production
 * builds (SAMPLES_ON off) show no bell at all; browser notifications (Settings → Notifications) are unaffected.
 */
export function Bell({ placement = "page" }: { placement?: "page" | "nav" }): ReactElement | null {
  return SAMPLES_ON ? <BellPanel placement={placement} /> : null;
}

function BellPanel({ placement }: { placement: "page" | "nav" }): ReactElement {
  const { notes, markNotesRead } = useShell();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const panel = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = `zn-bell-panel-${placement}`;
  const list = notes ?? [];
  const unreadCount = list.filter((n) => !n.read).length;
  const shown = list.filter((n) => filter === "all" || !n.read);

  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className={`zn-tb ${placement === "nav" ? "zn-tb-nav" : "zn-tb-page"}`}>
      <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
        <button
          ref={button}
          type="button"
          className={`zn-bell${open ? " open" : ""}`}
          aria-label={unreadCount ? "Notifications, new items" : "Notifications, all read"}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
        >
          <ZIcon name="bell" size={20} />
          {unreadCount ? <span className="zn-bell__dot" aria-hidden="true" /> : null}
        </button>

        {open ? (
          <>
            <button type="button" className="zn-closer" style={{ zIndex: 90 }} aria-label="Close notifications" onClick={() => setOpen(false)} />
            <div ref={panel} id={panelId} role="dialog" aria-label="Notifications" tabIndex={-1} className="zn-bell-panel">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "14px 14px 10px" }}>
                <b style={{ fontSize: 16 }}>Notifications</b>
                <button
                  type="button"
                  onClick={() => markNotesRead("all")}
                  disabled={unreadCount === 0}
                  style={{
                    border: 0,
                    background: "none",
                    padding: "4px 2px",
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: "underline",
                    cursor: unreadCount ? "pointer" : "default",
                    color: unreadCount ? "#A84505" : "#6B6358",
                  }}
                >
                  Mark all as read
                </button>
              </div>
              <div role="group" aria-label="Show" className="z-segs" style={{ margin: "0 14px 10px", alignSelf: "flex-start" }}>
                <button type="button" className="z-seg" aria-pressed={filter === "all"} onClick={() => setFilter("all")} style={{ minHeight: 30 }}>
                  All · {list.length}
                </button>
                <button type="button" className="z-seg" aria-pressed={filter === "unread"} onClick={() => setFilter("unread")} style={{ minHeight: 30 }}>
                  Unread · {unreadCount}
                </button>
              </div>
              <div className="zn-tb-list">
                {shown.map((n) => (
                  <Link
                    key={n.id}
                    to={n.href}
                    className="zn-note"
                    onClick={() => {
                      markNotesRead([n.id]);
                      setOpen(false);
                    }}
                  >
                    <span className="zn-note__ico" aria-hidden="true">
                      <ZIcon name={KIND_ICON[n.kind]} size={15} stroke={2} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2, lineHeight: 1.35 }}>
                      <span style={{ fontSize: 14, color: "#141210", fontWeight: n.read ? 500 : 700 }}>
                        {!n.read ? <span className="z-sr">Unread: </span> : null}
                        {n.title}
                      </span>
                      <span style={{ fontSize: 13, color: "#4A443C" }}>{n.body}</span>
                      <span style={{ fontSize: 12, color: "#6B6459" }}>
                        {n.ago} · Opens {n.opens}
                      </span>
                    </span>
                    {!n.read ? (
                      <span aria-hidden="true" style={{ flex: "none", width: 9, height: 9, marginTop: 6, borderRadius: "50%", background: "#F26A0A" }} />
                    ) : null}
                  </Link>
                ))}
                {notes === undefined ? (
                  <p style={{ margin: 0, padding: "28px 14px", textAlign: "center", color: "#4A443C" }}>Loading…</p>
                ) : shown.length === 0 ? (
                  <p style={{ margin: 0, padding: "28px 14px", textAlign: "center", color: "#4A443C" }}>You're all caught up.</p>
                ) : null}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "10px 14px 12px", background: "#FBFAF7", fontSize: 12, color: "#4A443C" }}>
                <span>The bell keeps your notification history. In the menu, Alerts counts what needs you and Chat counts unread messages.</span>
                <Link to="/app/settings/notifications" style={{ color: "#A84505", fontWeight: 600 }} onClick={() => setOpen(false)}>
                  Notification settings
                </Link>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
