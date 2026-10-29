import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { usePageMeta } from "../../hooks/usePageMeta";
import { copyText } from "../../lib/clipboard";
import { errorMessage, listMembers, type Member, type Message } from "../../lib/api";
import { ChatComposer } from "../chat/ChatComposer";
import { ChatThread } from "../chat/ChatThread";
import { firstLine, type ReplyTarget } from "../chat/reply";
import { PlanLock } from "../components/PlanLock";
import { useEntitlements } from "../features/entitlements";
import { SAMPLES_ON } from "../fixtures";
import { isoDay, TASK_STATUS, type SampleTask } from "../fixtures/tasks";
import { PageHead } from "../shell/PageHead";
import { Avatar } from "../tasks/Avatar";
import { dueLabel, dueStyle, entryDate, findPerson, isOpenTask, peopleOf, sepLabel, statusStyle, type TaskPerson } from "../tasks/model";
import { TaskForm, type TaskFormValues } from "../tasks/TaskForm";
import { taskActions, useTasks } from "../tasks/useTasks";
import { EmptyBlock, ErrorBlock, SkRows } from "../ui/States";
import { clockTime } from "../ui/time";
import { useResource } from "../useResource";
import "../../styles/dash13/tasks.css";
import "../../styles/dash13/chat.css";

/** How often the open conversation checks for new replies and receipts. */
const THREAD_POLL_MS = 15_000;

// Tasks are sample data until FR-20 (fixtures/tasks.ts): production builds (SAMPLES_ON off) don't offer them here.
const LEDE = SAMPLES_ON
  ? "Message your team in their Zinwe window, or send a task they can tick off. Tasks are free on every plan."
  : "Message your team in their Zinwe window.";

type ChatPerson = TaskPerson & { memberId: number };

const DOT: Record<TaskPerson["presenceKind"], string> = { working: "#17663F", break: "#8A5300", online: "#1B4FB0", offline: "#A79E90", waiting: "#A79E90" };

/** People with unread replies first, then by name (the existing Chat order). */
function sortForChat(people: ChatPerson[]): ChatPerson[] {
  return [...people].sort((a, b) => (b.member?.unread ?? 0) - (a.member?.unread ?? 0) || a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

/**
 * /app/chat and /app/chat/:member (board DashChat; #m=<first> and ?member=<id> also pick a person). Plan: team_chat;
 * without it a lock card shows instead (tasks stay free on the Tasks page).
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
  const loadMembers = useCallback((signal: AbortSignal) => listMembers(signal), []);
  const members = useResource(loadMembers, { pollMs: 30_000 });
  const tasks = useTasks(members.data);
  const params = useParams<{ member?: string }>();
  const [search] = useSearchParams();
  const { hash } = useLocation();
  const navigate = useNavigate();

  const everyone = useMemo(() => peopleOf(members.data).filter((p): p is ChatPerson => p.memberId !== null), [members.data]);
  const people = useMemo(() => sortForChat(everyone), [everyone]);
  const hashParams = useMemo(() => new URLSearchParams(hash.slice(1)), [hash]);
  const wanted = params.member ?? hashParams.get("m") ?? search.get("member");
  const picked = findPerson(wanted, people) as ChatPerson | null;
  const selected = picked ?? people[0];
  const screen = wanted ? "m-thread" : "m-list";

  const [tab, setTab] = useState<"chat" | "tasks">("chat");
  const [threadKey, setThreadKey] = useState(0);
  const [reply, setReply] = useState<ReplyTarget | null>(null);
  const [openCards, setOpenCards] = useState<ReadonlySet<number>>(new Set());
  const [flash, setFlash] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState<{ who: string; editing: SampleTask | null; title?: string } | null>(null);
  const [previews, setPreviews] = useState<Record<number, { text: string; at: Date; mine: boolean } | null>>({});
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
    if (params.member || !picked) return;
    const fromHash = hashParams.get("m");
    const fromQuery = search.get("member");
    if (!fromHash && !fromQuery) return;
    const rest = new URLSearchParams(hashParams);
    rest.delete("m");
    const h = rest.toString();
    navigate(`/app/chat/${picked.key}${h ? `#${h}` : ""}`, { replace: true });
  }, [params.member, picked, hashParams, search, navigate]);

  // #tab=tasks shows their tasks; #new=1 opens Add task for them.
  const [handledHash, setHandledHash] = useState<string | null>(null);
  if (selected && handledHash !== hash) {
    setHandledHash(hash);
    if (SAMPLES_ON && hashParams.get("tab") === "tasks") setTab("tasks");
    if (SAMPLES_ON && hashParams.get("new") === "1") setForm({ who: selected.key, editing: null });
  }

  // Keep the open conversation fresh while the tab is visible.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") setThreadKey((k) => k + 1);
    }, THREAD_POLL_MS);
    return () => window.clearInterval(id);
  }, []);

  // Opening a conversation reads it server-side: clear its badge locally too.
  const selectedId = selected?.memberId;
  useEffect(() => {
    if (selectedId == null || !members.data) return;
    const m = members.data.find((x) => x.id === selectedId);
    if (!m || !(m.unread ?? 0)) return;
    members.setData(members.data.map((x): Member => (x.id === selectedId ? { ...x, unread: 0 } : x)));
  }, [selectedId, members]);

  // A new person: start in Chat with no reply, and their newest task card open.
  const allTasks = useMemo(() => tasks.data ?? [], [tasks.data]);
  const [shownFor, setShownFor] = useState<number | null>(null);
  if (selected && tasks.data && shownFor !== selected.memberId) {
    setShownFor(selected.memberId);
    setReply(null);
    setCopied(false);
    const mine = allTasks.filter((t) => t.memberId === selected.memberId).sort((a, b) => entryTime(b) - entryTime(a));
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
  const onLoaded = useCallback((msgs: Message[]) => {
    if (selectedId == null) return;
    const newest = msgs[0];
    setPreviews((p) => ({ ...p, [selectedId]: newest ? { text: firstLine(newest), at: new Date(newest.created_at), mine: newest.sender === "owner" } : null }));
  }, [selectedId]);

  const submitTask = (v: TaskFormValues, editing: SampleTask | null) => {
    const saved = taskActions.submit(v, editing);
    setForm(null);
    if (!saved || editing) return;
    // The card lands in that person's chat, and the chat switches to them (their route).
    const target = everyone.find((p) => p.key === v.person.key);
    if (target && target.memberId !== selected?.memberId) navigate(`/app/chat/${target.key}`);
    setTab("chat");
    setReply(null);
    setOpenCards((s) => new Set([...s, saved.id]));
    window.setTimeout(() => flashItem(`t${saved.id}`), 300);
  };

  if (members.data === undefined) {
    return (
      <div className="zp-chat m-list">
        <PageHead title="Chat" lede={LEDE} />
        <div className="cv-box">
          {members.error ? (
            <div style={{ flex: 1 }}>
              <ErrorBlock message={errorMessage(members.error)} onRetry={members.reload} />
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
  if (!selected) {
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

  const selTasks = tasksOf(selected).sort((a, b) => entryTime(b) - entryTime(a));
  const route = `/app/chat/${selected.key}`;
  const presenceLine = selected.member?.device ? `${selected.pc} · ${selected.role} · ${selected.presence}` : `${selected.role} · Zinwe isn't on their PC yet: chat waits until it is, email arrives now`;

  return (
    <div className={`zp-chat ${screen}`}>
      <PageHead title="Chat" lede={LEDE} />

      <div className="cv-box">
        <aside className="cv-list" aria-label="Conversations">
          {people.map((p) => {
            const on = p.memberId === selected.memberId;
            const unread = p.member?.unread ?? 0;
            const open = openOf(p);
            const pv = previews[p.memberId];
            const lastTask = tasksOf(p).sort((a, b) => entryTime(b) - entryTime(a))[0];
            const taskAt = lastTask ? entryTime(lastTask) : 0;
            const useTask = lastTask && (!pv || taskAt > pv.at.getTime());
            const lastAt = useTask ? new Date(taskAt) : pv ? pv.at : null;
            const last = useTask && lastTask ? `Task: ${lastTask.title}` : pv ? `${pv.mine ? "You: " : ""}${pv.text}` : unread ? `${unread} new ${unread === 1 ? "reply" : "replies"}` : pv === null ? `${p.presence} · no messages yet` : p.presence;
            const when = lastAt ? (sepLabel(isoDay(lastAt)) === "Today" ? clockTime(lastAt) : sepLabel(isoDay(lastAt))) : "";
            return (
              <button key={p.memberId} type="button" className={on ? "conv on" : "conv"} aria-pressed={on} aria-label={`${p.name}${unread ? `, ${unread} unread` : ""}`} onClick={() => go(p)}>
                <span className="conv-av">
                  <Avatar person={p} size={38} />
                  <span className="conv-dot" style={{ background: DOT[p.presenceKind] }} />
                </span>
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                  <span style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                    <b style={{ fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</b>
                    <span style={{ fontSize: 11, color: "#6B6459", flex: "none" }}>{when}</span>
                  </span>
                  <span style={{ fontSize: 12, color: "#6B6459", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{last}</span>
                </span>
                <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  {unread > 0 ? <span className="conv-unread">{unread}</span> : null}
                  {open > 0 ? (
                    <span className="cv-pill" style={{ background: "#FDEBDC", color: "#8A3A04", fontSize: 11 }}>
                      {open === 1 ? "1 task" : `${open} tasks`}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </aside>

        <section aria-label="Conversation" className="cv-pane">
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
                <span style={{ fontSize: 12, color: "#6B6459" }}>
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
              {SAMPLES_ON ? (
                <div role="group" aria-label="Show" className="z-segs" style={{ flexWrap: "nowrap" }}>
                  <button type="button" className={tab === "chat" ? "z-seg on" : "z-seg"} aria-pressed={tab === "chat"} onClick={() => setTab("chat")}>
                    Chat
                  </button>
                  <button type="button" className={tab === "tasks" ? "z-seg on" : "z-seg"} aria-pressed={tab === "tasks"} onClick={() => setTab("tasks")}>
                    Tasks · {openOf(selected)} open
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {tab === "chat" ? (
            <ChatThread
              key={`thread-${selected.memberId}`}
              person={selected}
              tasks={tasks.data ? selTasks : []}
              reloadKey={threadKey}
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
              onLoaded={onLoaded}
            />
          ) : (
            <div className="cv-thread" style={{ gap: 8 }}>
              <span style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "6px 12px", fontSize: 13, color: "#6B6459" }}>
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
                  <span style={{ fontSize: 12, color: "#6B6459" }}>{t.byMember ? `Added by ${selected.first}` : "From you"}</span>
                  <span className="cv-pill" style={dueStyle(t)}>
                    {dueLabel(t)}
                  </span>
                  <span className="cv-pill" style={statusStyle(t.status)}>
                    {TASK_STATUS[t.status][0]}
                  </span>
                </button>
              ))}
              {selTasks.length === 0 ? <p style={{ margin: 0, color: "#4A443C" }}>No tasks with {selected.first} yet. Use Add task below to send one.</p> : null}
            </div>
          )}

          <ChatComposer
            key={`compose-${selected.memberId}`}
            person={selected}
            reply={reply}
            onCancelReply={() => setReply(null)}
            onJumpReply={() => reply && flashItem(reply.key)}
            onTask={SAMPLES_ON ? (title) => setForm({ who: selected.key, editing: null, title }) : undefined}
            onSent={() => {
              setReply(null);
              setThreadKey((k) => k + 1);
            }}
          />
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

function entryTime(t: SampleTask): number {
  return entryDate(t.log[0] ?? { day: t.due, time: "9:00 AM" }).getTime();
}
