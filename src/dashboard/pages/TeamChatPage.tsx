import { Component, createRef, useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { usePageMeta } from "../../hooks/usePageMeta";
import { copyText } from "../../lib/clipboard";
import { errorMessage, type Message } from "../../lib/api";
import { ChatComposer } from "../chat/ChatComposer";
import { ChatThread } from "../chat/ChatThread";
import type { ReplyTarget } from "../chat/reply";
import { PlanLock } from "../components/PlanLock";
import { CHAT_POLL_MS } from "../features/chatEvents";
import { useEntitlements } from "../features/entitlements";
import { PageHead } from "../shell/PageHead";
import { useShell } from "../shell/shellContext";
import { Avatar } from "../tasks/Avatar";
import { dueLabel, dueStyle, findPerson, isOpenTask, peopleOf, sepLabel, statusStyle, type TaskPerson } from "../tasks/model";
import { isoDay, TASK_STATUS, type TaskView } from "../tasks/types";
import { TaskForm, type TaskFormValues } from "../tasks/TaskForm";
import { taskActions, useTasks } from "../tasks/useTasks";
import { EmptyBlock, ErrorBlock, SkRows } from "../ui/States";
import { clockTime } from "../ui/time";
import "../../styles/dash13/tasks.css";
import "../../styles/dash13/chat.css";

/** How long a tile keeps the "just arrived" class (the highlight's length in chat.css). */
const FRESH_MS = 1400;

const LEDE = "Message your team in their Zinwe window, or send a task they can tick off.";

type ChatPerson = TaskPerson & { memberId: number };
/** One row of the conversation list: who, their latest activity, and the line it shows. */
type Tile = { person: ChatPerson; at: Date | null; text: string };

const DOT: Record<TaskPerson["presenceKind"], string> = { working: "#17663F", break: "#A84505", online: "#404040", offline: "#8A8A8A", waiting: "#8A8A8A" };

/** A tile's latest activity and line: the newest message, or a newer task (unread messages always win the line). */
function tileOf(person: ChatPerson, tasks: readonly TaskView[]): Tile {
  const last = person.member?.last_message;
  const unread = person.member?.unread ?? 0;
  const lastAt = last ? new Date(last.at) : null;
  const task = tasks.filter((t) => t.memberId === person.memberId).sort((a, b) => b.createdAt - a.createdAt)[0];
  if (task && !unread && (!lastAt || task.createdAt > lastAt.getTime())) return { person, at: new Date(task.createdAt), text: `Task: ${task.title}` };
  if (last) return { person, at: lastAt, text: `${last.sender === "owner" ? "You: " : ""}${last.text}` };
  // No line from an older backend, which still counts replies.
  if (unread) return { person, at: null, text: `${unread} new ${unread === 1 ? "reply" : "replies"}` };
  return { person, at: null, text: last === null ? `${person.presence} · no messages yet` : person.presence };
}

/** Latest activity first, as a chat app does; people with no messages yet by name at the end. */
function sortTiles(tiles: Tile[]): Tile[] {
  return [...tiles].sort((a, b) => (b.at?.getTime() ?? 0) - (a.at?.getTime() ?? 0) || a.person.name.localeCompare(b.person.name, undefined, { sensitivity: "base" }));
}

/**
 * The conversation list. A new message moves a tile to the top, and React re-inserts the other tiles to do it, which
 * also drops the browser's scroll anchoring: scrolled down, the rows you're looking at would slide by one. So the
 * row at the top of the view is measured before the update and put back after it. At the very top nothing is held:
 * the new tile just shows. (A class because only getSnapshotBeforeUpdate sees the DOM before the change.)
 */
class TileList extends Component<{ order: string; children: ReactNode }> {
  private box = createRef<HTMLElement>();

  getSnapshotBeforeUpdate(prev: { order: string }): { scroller: Element; row: Element; y: number } | null {
    const list = this.box.current;
    if (!list || prev.order === this.props.order) return null;
    // Phone: the page scrolls, not the list.
    const scroller = list.scrollTop > 0 ? list : window.scrollY > 0 ? document.scrollingElement : null;
    const viewTop = scroller === list ? list.getBoundingClientRect().top : 0;
    const row = scroller && [...list.children].find((tile) => tile.getBoundingClientRect().bottom > viewTop);
    return scroller && row ? { scroller, row, y: row.getBoundingClientRect().top } : null;
  }

  componentDidUpdate(_prev: unknown, _state: unknown, held: { scroller: Element; row: Element; y: number } | null): void {
    if (held) held.scroller.scrollTop += held.row.getBoundingClientRect().top - held.y;
  }

  render(): ReactNode {
    return (
      <aside ref={this.box} className="cv-list" aria-label="Conversations">
        {this.props.children}
      </aside>
    );
  }
}

function tileWhen(at: Date | null): string {
  if (!at) return "";
  if (Date.now() - at.getTime() < 60_000) return "Just now";
  const day = sepLabel(isoDay(at));
  return day === "Today" ? clockTime(at) : day;
}

/**
 * /app/chat and /app/chat/:member (board DashChat; #m=<first> and ?member=<id> also pick a person). Plan: team_chat
 * (chat and tasks); without it a lock card shows instead. The page fits the window: the thread scrolls inside, the
 * composer always shows (chat.css). Nothing opens by itself: fetching a thread marks it read, so messages stay unread
 * on their tiles until you open a conversation. The tiles read the shell's team list, the same one as the Chat tab.
 */
export default function TeamChatPage(): ReactElement {
  usePageMeta({ title: "Chat — Zinwe", description: "Message your team and read their replies." });
  const { has } = useEntitlements();
  if (!has("team_chat")) {
    return (
      <div className="zp-chat">
        <PageHead title="Chat" lede={LEDE} />
        <PlanLock module="team_chat">Send a note straight to an employee's PC, get their reply here, and copy it to their email when it matters.</PlanLock>
      </div>
    );
  }
  return <ChatPageContent />;
}

function ChatPageContent(): ReactElement {
  const { members, membersError, reloadMembers, setOpenChat } = useShell();
  const tasks = useTasks();
  const params = useParams<{ member?: string }>();
  const [search] = useSearchParams();
  const { hash } = useLocation();
  const navigate = useNavigate();

  const everyone = useMemo(() => peopleOf(members).filter((p): p is ChatPerson => p.memberId !== null), [members]);
  const allTasks = useMemo(() => tasks.data ?? [], [tasks.data]);
  const tiles = useMemo(() => sortTiles(everyone.map((p) => tileOf(p, allTasks))), [everyone, allTasks]);
  const hashParams = useMemo(() => new URLSearchParams(hash.slice(1)), [hash]);
  const wanted = params.member ?? hashParams.get("m") ?? search.get("member");
  const selected = findPerson(wanted, everyone) as ChatPerson | null;
  const screen = selected ? "m-thread" : "m-list";

  const [tab, setTab] = useState<"chat" | "tasks">("chat");
  const [threadKey, setThreadKey] = useState(0);
  const [fresh, setFresh] = useState<ReadonlySet<number>>(new Set());
  const [reply, setReply] = useState<ReplyTarget | null>(null);
  const [openCards, setOpenCards] = useState<ReadonlySet<number>>(new Set());
  const [flash, setFlash] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState<{ who: string; editing: TaskView | null; title?: string } | null>(null);
  // Send → the thread goes to the bottom (pin) and shows your line at once (outbox) until the next fetch has it.
  const [pin, setPin] = useState(0);
  const [outbox, setOutbox] = useState<Message[]>([]);
  const flashTimer = useRef<number | undefined>(undefined);
  const copyTimer = useRef<number | undefined>(undefined);
  useEffect(
    () => () => {
      window.clearTimeout(flashTimer.current);
      window.clearTimeout(copyTimer.current);
    },
    [],
  );

  // A deep link that isn't the route (#m=<first>, ?member=<id>): settle on /app/chat/<first>.
  useEffect(() => {
    if (params.member || !selected) return;
    const fromHash = hashParams.get("m");
    const fromQuery = search.get("member");
    if (!fromHash && !fromQuery) return;
    const rest = new URLSearchParams(hashParams);
    rest.delete("m");
    const h = rest.toString();
    navigate(`/app/chat/${selected.key}${h ? `#${h}` : ""}`, { replace: true });
  }, [params.member, selected, hashParams, search, navigate]);

  // #tab=tasks shows their tasks; #new=1 opens Add task for them.
  const [handledHash, setHandledHash] = useState<string | null>(null);
  if (selected && handledHash !== hash) {
    setHandledHash(hash);
    if (hashParams.get("tab") === "tasks") setTab("tasks");
    if (hashParams.get("new") === "1") setForm({ who: selected.key, editing: null });
  }

  // Keep the open conversation fresh while the tab is visible.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") setThreadKey((k) => k + 1);
    }, CHAT_POLL_MS);
    return () => window.clearInterval(id);
  }, []);

  // Arriving: the shell's list may be up to a minute old.
  useEffect(() => reloadMembers(), [reloadMembers]);

  // The conversation on screen is being read (its thread fetch marks it read), so the shell shows no count for it.
  const readingId = selected && tab === "chat" ? selected.memberId : null;
  useEffect(() => {
    setOpenChat(readingId);
    return () => setOpenChat(null);
  }, [readingId, setOpenChat]);

  // A new message while the page is open: its tile moves up by itself (sortTiles) and gets a short highlight.
  const [lastTeam, setLastTeam] = useState(members);
  if (members !== lastTeam) {
    setLastTeam(members);
    const before = new Map((lastTeam ?? []).map((m) => [m.id, m.unread ?? 0]));
    const rose = lastTeam ? (members ?? []).filter((m) => (m.unread ?? 0) > (before.get(m.id) ?? 0)).map((m) => m.id) : [];
    if (rose.length) setFresh(new Set(rose));
  }
  useEffect(() => {
    if (!fresh.size) return;
    const id = window.setTimeout(() => setFresh(new Set()), FRESH_MS);
    return () => window.clearTimeout(id);
  }, [fresh]);

  // A new person: start in Chat with no reply, and their newest task card open.
  const [shownFor, setShownFor] = useState<number | null>(null);
  const openId = selected?.memberId ?? null;
  if (tasks.data && shownFor !== openId) {
    setShownFor(openId);
    setReply(null);
    setCopied(false);
    setOutbox([]);
    const mine = allTasks.filter((t) => t.memberId === openId && isOpenTask(t)).sort((a, b) => b.createdAt - a.createdAt);
    setOpenCards(new Set(mine.length ? [mine[0].id] : []));
  }

  const tasksOf = (p: ChatPerson) => allTasks.filter((t) => t.memberId === p.memberId);
  const openOf = (p: ChatPerson) => tasksOf(p).filter(isOpenTask).length;

  const flashItem = (key: string) => {
    setFlash(key);
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => document.getElementById(`msg-${key}`)?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" }), 60);
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 1800);
  };
  const go = (p: ChatPerson) => {
    navigate(`/app/chat/${p.key}`);
    setTab("chat");
    // Phone: the thread opens full screen with the newest lines and the composer in view.
    if (window.matchMedia?.("(max-width: 760px)").matches) window.setTimeout(() => document.getElementById("msg")?.scrollIntoView({ block: "end" }), 80);
  };
  const startReply = (target: ReplyTarget) => {
    setTab("chat");
    setReply(target);
    window.setTimeout(() => document.getElementById("msg")?.focus(), 40);
  };

  const submitTask = async (v: TaskFormValues, editing: TaskView | null) => {
    const saved = await taskActions.submit(v, editing);
    setForm(null);
    if (editing) return;
    // The card lands in that person's chat, and the chat switches to them (their route).
    const target = everyone.find((p) => p.key === v.person.key);
    if (target && target.memberId !== selected?.memberId) navigate(`/app/chat/${target.key}`);
    setTab("chat");
    setReply(null);
    setOpenCards((s) => new Set([...s, saved.id]));
    setThreadKey((k) => k + 1);
    setPin((n) => n + 1);
    reloadMembers();
  };

  if (members === undefined) {
    return (
      <div className="zp-chat m-list">
        <PageHead title="Chat" lede={LEDE} />
        <div className="cv-box">
          {membersError ? (
            <div style={{ flex: 1 }}>
              <ErrorBlock message={errorMessage(membersError)} onRetry={reloadMembers} />
            </div>
          ) : (
            <div className="cv-list" style={{ padding: 0 }}>
              <SkRows label="Loading your team" rows={6} />
            </div>
          )}
        </div>
      </div>
    );
  }
  if (!everyone.length) {
    return (
      <div className="zp-chat m-list">
        <PageHead title="Chat" lede={LEDE} />
        <div className="z-card">
          <EmptyBlock
            icon="chat"
            title="No one to chat with yet"
            action={
              <Link className="z-btn sm pri" to="/app/team#add=1">
                Add a person
              </Link>
            }
          >
            Add your team first. Once Zinwe is on their PC, you can message them here.
          </EmptyBlock>
        </div>
      </div>
    );
  }

  const selTasks = selected ? tasksOf(selected).sort((a, b) => b.createdAt - a.createdAt) : [];
  const route = selected ? `/app/chat/${selected.key}` : "/app/chat";
  const presenceLine = selected?.member?.device ? `${selected.pc} · ${selected.role} · ${selected.presence}` : `${selected?.role} · Zinwe isn't on their PC yet: chat waits until it is, email arrives now`;

  return (
    <div className={`zp-chat ${screen}`}>
      <PageHead title="Chat" lede={LEDE} />

      <div className="cv-box">
        <TileList order={tiles.map((x) => x.person.memberId).join(" ")}>
          {tiles.map(({ person: p, at, text }) => {
            const on = p.memberId === selected?.memberId;
            const unread = p.member?.unread ?? 0;
            const open = openOf(p);
            const cls = ["conv", on && "on", unread > 0 && "un", fresh.has(p.memberId) && "new"].filter(Boolean).join(" ");
            return (
              <button key={p.memberId} type="button" className={cls} aria-pressed={on} aria-label={`${p.name}${unread ? `, ${unread} unread` : ""}`} onClick={() => go(p)}>
                <span className="conv-av">
                  <Avatar person={p} size={38} />
                  <span className="conv-dot" style={{ background: DOT[p.presenceKind] }} />
                </span>
                <span className="conv-text">
                  <span className="conv-line">
                    <b className="conv-name">{p.name}</b>
                    <span className="conv-when">{tileWhen(at)}</span>
                  </span>
                  <span className="conv-line">
                    <span className="conv-last">{text}</span>
                    {unread > 0 ? <span className="conv-unread">{unread}</span> : null}
                  </span>
                </span>
                {open > 0 ? (
                  <span className="cv-pill" style={{ background: "#FDEBDC", color: "#8A3A04", fontSize: 11 }}>
                    {open === 1 ? "1 task" : `${open} tasks`}
                  </span>
                ) : null}
              </button>
            );
          })}
        </TileList>

        <section aria-label="Conversation" className="cv-pane">
          {selected ? (
            <>
              <div className="cv-head">
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <Link className="zk-ic zk-m-only cv-back" aria-label="Back to all chats" to="/app/chat">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M15 18 9 12l6-6" />
                    </svg>
                  </Link>
                  <Avatar person={selected} size={40} />
                  <div style={{ minWidth: 0, display: "flex", flexDirection: "column", lineHeight: 1.35 }}>
                    <b style={{ fontSize: 16 }}>{selected.name}</b>
                    <span style={{ fontSize: 12, color: "#6B6B6B" }}>
                      {selected.member?.device ? (
                        <>
                          <span className="z-mono">{selected.pc}</span> · {selected.role} · {selected.presence}
                        </>
                      ) : (
                        presenceLine
                      )}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                  <button
                    type="button"
                    className="z-btn sm zk-d-only"
                    onClick={() => {
                      void copyText(`${window.location.origin}${route}`);
                      setCopied(true);
                      window.clearTimeout(copyTimer.current);
                      copyTimer.current = window.setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
                    </svg>
                    <span aria-live="polite">{copied ? "Link copied" : "Copy link to this chat"}</span>
                  </button>
                  <div role="group" aria-label="Show" className="z-segs" style={{ flexWrap: "nowrap" }}>
                    <button type="button" className={tab === "chat" ? "z-seg on" : "z-seg"} aria-pressed={tab === "chat"} onClick={() => setTab("chat")}>
                      Chat
                    </button>
                    <button type="button" className={tab === "tasks" ? "z-seg on" : "z-seg"} aria-pressed={tab === "tasks"} onClick={() => setTab("tasks")}>
                      Tasks · {openOf(selected)} open
                    </button>
                  </div>
                </div>
              </div>

              {tab === "chat" ? (
                <ChatThread
                  key={`thread-${selected.memberId}`}
                  person={selected}
                  tasks={tasks.data ? selTasks : []}
                  reloadKey={`${threadKey}:${selected.member?.last_message?.at ?? ""}`}
                  pin={pin}
                  outbox={outbox}
                  openCards={openCards}
                  flash={flash}
                  onToggleCard={(id) =>
                    setOpenCards((s) => {
                      const next = new Set(s);
                      if (next.has(id)) next.delete(id);
                      else next.add(id);
                      return next;
                    })
                  }
                  onReply={startReply}
                  onEditTask={(t) => setForm({ who: selected.key, editing: t })}
                  onJump={flashItem}
                />
              ) : (
                <div className="cv-threadwrap">
                <div className="cv-thread" style={{ gap: 8 }}>
                  <span style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "6px 12px", fontSize: 13, color: "#6B6B6B" }}>
                    Tasks with {selected.first}, newest first. Select one to open it in the chat.
                    <Link to={`/app/tasks#m=${selected.key}`} style={{ fontWeight: 600 }}>
                      See {selected.first}’s tasks on the Tasks page
                    </Link>
                  </span>
                  {selTasks.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className="cv-trow"
                      onClick={() => {
                        setTab("chat");
                        setOpenCards((s) => new Set([...s, t.id]));
                        window.setTimeout(() => flashItem(`t${t.id}`), 60);
                      }}
                    >
                      <b style={{ flex: "1 1 220px", minWidth: 0, fontWeight: 600 }}>{t.title}</b>
                      <span style={{ fontSize: 12, color: "#6B6B6B" }}>{t.byMember ? `Added by ${selected.first}` : "From you"}</span>
                      <span className="cv-pill" style={dueStyle(t)}>
                        {dueLabel(t)}
                      </span>
                      <span className="cv-pill" style={statusStyle(t.status)}>
                        {TASK_STATUS[t.status][0]}
                      </span>
                    </button>
                  ))}
                  {selTasks.length === 0 ? <p style={{ margin: 0, color: "#404040" }}>No tasks with {selected.first} yet. Use + Task below to send one.</p> : null}
                </div>
                </div>
              )}

              <ChatComposer
                key={`compose-${selected.memberId}`}
                person={selected}
                reply={reply}
                onCancelReply={() => setReply(null)}
                onJumpReply={() => reply && flashItem(reply.key)}
                onTask={(title) => setForm({ who: selected.key, editing: null, title })}
                onSent={(_delivery, message) => {
                  setReply(null);
                  if (message) setOutbox((o) => [...o, message]);
                  setPin((n) => n + 1);
                  setThreadKey((k) => k + 1);
                  reloadMembers();
                }}
              />
            </>
          ) : (
            <div className="cv-none">
              <p style={{ margin: 0 }}>
                <b>Pick a conversation</b>
                <br />
                Messages stay unread until you open them.
              </p>
            </div>
          )}
        </section>
      </div>

      {form ? (
        <TaskForm
          people={everyone}
          who={form.who}
          editing={form.editing}
          title={form.title}
          onClose={() => {
            setForm(null);
            if (hashParams.get("new")) navigate(route, { replace: true });
          }}
          onSubmit={submitTask}
        />
      ) : null}
    </div>
  );
}

