import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type MouseEvent, type ReactElement } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cx } from "../../lib/cx";
import { MemberChatThread } from "../components/MemberChat";
import { TaggedComposer } from "../components/TaggedComposer";
import { detailOf } from "../features/alertGroups";
import { alertLabel, severityOf } from "../features/events";
import { presenceOf } from "../features/memberStatus";
import { SAMPLES_ON } from "../fixtures";
import { useShell } from "../shell/shellContext";
import { formatDateTime } from "../time";
import { ZIcon } from "../ui/ZIcon";
import type { DockWin } from "./dock";
import { avatarStyle, dotColor, firstNameOf, initialsOf, statusLine } from "./people";

const P_MIN = "M6 12h12";
const P_MAX = "M6 15l6-6 6 6";
const P_TASK = "M4 4h16v16H4zM8.5 12.5l2.5 2.5 4.5-5";

/** "/", "/t", "/ta"… "/task" on its own: the composer offers "Create a task" (board `slash`). */
function slashOf(value: string): boolean {
  const m = /^\/(\S*)$/.exec(value);
  return m !== null && "task".startsWith(m[1].toLowerCase());
}

/**
 * One docked chat window (DashFloat `.zf-win`): the person, the real thread (MemberChatThread, refreshed after each
 * send and every 20 s while open), the alert it's about if any, and the tagged composer. Minimise keeps the draft;
 * Esc closes; `/task` (or the task button) opens Tasks → New task for this person. Tasks are sample data until
 * FR-20, so production builds (SAMPLES_ON off) show neither.
 */
export function ChatWindow({
  win,
  onToggle,
  onClose,
}: {
  win: DockWin;
  onToggle: () => void;
  onClose: () => void;
}): ReactElement {
  const { request } = win;
  const { person, event = null } = request;
  const expanded = !win.min;
  const navigate = useNavigate();
  const member = useShell().members?.find((m) => m.id === person.id);
  const first = firstNameOf(person.name);
  const slug = first.toLowerCase();
  const sub = member ? statusLine(member) : [person.hostname, person.email].filter(Boolean).join(" · ") || "Team member";
  const taskHref = `/app/tasks#new=1&m=${encodeURIComponent(slug)}`;
  // `?member=` keeps the older Chat page on the right person too.
  const fullHref = `/app/chat/${person.id}?member=${person.id}`;

  const [threadKey, setThreadKey] = useState(0);
  const [composerKey, setComposerKey] = useState(0);
  const [showContext, setShowContext] = useState(true);
  const [slash, setSlash] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Fresh replies while the window is open.
  useEffect(() => {
    if (!expanded) return;
    const id = window.setInterval(() => setThreadKey((k) => k + 1), 20_000);
    return () => window.clearInterval(id);
  }, [expanded]);

  // Keep the newest message in view, and put the cursor in the message box when the window opens.
  useEffect(() => {
    const log = logRef.current;
    if (!expanded || !log) return;
    const toEnd = () => {
      log.scrollTop = log.scrollHeight;
    };
    toEnd();
    const watch = new MutationObserver(toEnd);
    watch.observe(log, { childList: true, subtree: true });
    bodyRef.current?.querySelector<HTMLTextAreaElement>("textarea")?.focus({ preventScroll: true });
    return () => watch.disconnect();
  }, [expanded]);

  const clearSlash = () => {
    setSlash(false);
    setComposerKey((k) => k + 1);
  };
  const goTask = () => {
    clearSlash();
    navigate(taskHref);
  };

  const onInput = (e: FormEvent<HTMLDivElement>) => {
    if (SAMPLES_ON && e.target instanceof HTMLTextAreaElement) setSlash(slashOf(e.target.value));
  };
  // While "/task" is offered: Enter or Tab picks it, Esc hides it (the composer never sends "/task" as a message).
  const onComposerKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!slash) return;
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      e.stopPropagation();
      goTask();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setSlash(false);
    }
  };
  const onComposerClick = (e: MouseEvent<HTMLDivElement>) => {
    if (slash && e.target instanceof Element && e.target.closest('button[type="submit"]')) {
      e.preventDefault();
      e.stopPropagation();
      goTask();
    }
  };
  // Esc closes the window, unless it's closing one of the composer's menus.
  const onKey = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== "Escape" || e.defaultPrevented) return;
    if (e.target instanceof Element && e.target.closest('[role="menu"], [role="listbox"], [aria-expanded="true"]')) return;
    e.stopPropagation();
    onClose();
  };

  const toggleLabel = expanded ? `Minimise chat with ${first}` : `Open chat with ${first}`;
  const severity = event ? severityOf(event) : null;

  return (
    <section className={cx("zf-win", win.min && "is-min")} aria-label={`Chat with ${person.name}`} onKeyDown={onKey}>
      <header className="zf-whd">
        <button type="button" className="zf-whead" aria-expanded={expanded} aria-label={toggleLabel} onClick={onToggle}>
          <span className="zfl-av" aria-hidden="true" style={avatarStyle(member?.role, 30)}>
            {initialsOf(person.name)}
            <span className="zfl-dot" style={{ background: dotColor(presenceOf(member?.device)) }} />
          </span>
          <span className="zf-who">
            <b>{person.name}</b>
            <small>{sub}</small>
          </span>
        </button>
        <button type="button" className="zf-ib" aria-label={toggleLabel} title={expanded ? "Minimise" : "Open"} onClick={onToggle}>
          <ZIcon d={expanded ? P_MIN : P_MAX} size={16} stroke={2.2} />
        </button>
        {SAMPLES_ON ? (
          <Link className="zf-ib" to={taskHref} aria-label={`Add a task for ${first} (or type /task)`} title="Add a task · or type /task">
            <ZIcon d={P_TASK} size={16} stroke={2} />
          </Link>
        ) : null}
        <Link className="zf-ib" to={fullHref} aria-label={`Open the full chat with ${first}`} title="Open full chat">
          <ZIcon name="external" size={15} stroke={2} />
        </Link>
        <button type="button" className="zf-ib" aria-label={`Close chat with ${first}`} title="Close" onClick={onClose}>
          <ZIcon name="close" size={15} stroke={2.2} />
        </button>
      </header>

      <div className="zf-wbody" ref={bodyRef} hidden={win.min}>
        {event ? (
          <button
            type="button"
            className={cx("zf-wctx", `is-${severity}`, !showContext && "is-folded")}
            onClick={() => setShowContext((s) => !s)}
            aria-expanded={showContext}
          >
            <ZIcon name="alerts" size={15} stroke={2} />
            <span>
              <b>{alertLabel(event)}</b>
              {showContext ? (
                <>
                  <small>{detailOf(event)}</small>
                  <small>
                    {event.hostname} · {formatDateTime(event.occurred_at)}
                  </small>
                </>
              ) : null}
            </span>
          </button>
        ) : null}

        <div className="zf-log" ref={logRef}>
          <MemberChatThread member={person} reloadKey={threadKey} online={member?.device?.is_online} />
        </div>

        <div className="zf-wcomp" onInput={onInput} onKeyDownCapture={onComposerKey} onClickCapture={onComposerClick}>
          {slash ? (
            <div role="listbox" aria-label="Actions" className="zf-slash">
              <Link role="option" aria-selected="true" to={taskHref} onClick={clearSlash}>
                <span className="zf-slash__ico" aria-hidden="true">
                  <ZIcon d={P_TASK} size={15} stroke={2.2} />
                </span>
                <span className="zf-slash__txt">
                  <b>Create a task for {first}</b>
                  <small>Opens the task form</small>
                </span>
                <span className="zf-slash__cmd">/task</span>
              </Link>
            </div>
          ) : null}
          <TaggedComposer
            key={`${composerKey}-${event?.id ?? "chat"}-${request.tag ?? ""}-${request.urgency ?? ""}-${request.delivery ?? ""}-${request.draft ?? ""}`}
            person={person}
            event={event}
            initialTag={request.tag ?? null}
            initialText={request.draft}
            initialUrgency={request.urgency}
            initialDelivery={request.delivery}
            compact
            onSent={(d) => {
              setThreadKey((k) => k + 1);
              request.onSent?.(d);
            }}
          />
        </div>
      </div>
    </section>
  );
}
