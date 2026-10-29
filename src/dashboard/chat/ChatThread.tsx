import { Fragment, useEffect, useLayoutEffect, useRef, useState, type ReactElement } from "react";
import { errorMessage, getMemberThread, type Message } from "../../lib/api";
import { Linkified } from "../components/Linkified";
import { CHAT_READ_EVENT } from "../features/chatEvents";
import { SAMPLES_ON } from "../fixtures";
import { isoDay, type SampleTask } from "../fixtures/tasks";
import { entryDate, sepLabel, type TaskPerson } from "../tasks/model";
import { clockTime } from "../ui/time";
import { Sk } from "../ui/States";
import { TaskCard } from "./TaskCard";
import { firstLine, quoteOf, type ReplyTarget } from "./reply";

const CHECK1 = "M2 7.5 5.5 11 12 4";
const CHECK2 = "M1 7.5 4.5 11 11 4M8 10.5l.5.5L15 4";

type Item = { kind: "msg"; key: string; at: Date; m: Message } | { kind: "task"; key: string; at: Date; t: SampleTask };

function ReplyIcon(): ReactElement {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 6 6v5" />
    </svg>
  );
}

function Receipt({ kind }: { kind: "sent" | "delivered" | "seen" | "emailed" }): ReactElement {
  const label = { sent: "Sent", delivered: "Delivered", seen: "Seen", emailed: "Emailed" }[kind];
  return (
    <span className={kind === "seen" ? "cv-rc seen" : "cv-rc"}>
      <span style={{ color: "#6B6459" }}>·</span>
      <svg width="14" height="11" viewBox="0 0 16 14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={kind === "sent" || kind === "emailed" ? CHECK1 : CHECK2} />
      </svg>
      {label}
    </span>
  );
}

const CHANNEL_NOTE: Record<NonNullable<Message["channel"]>, string> = { chat: "", chat_email: " · chat + email", email: " · email only" };

/**
 * The conversation with one person (DashChat): their real messages (getMemberThread; reading it marks their replies
 * read, then CHAT_READ_EVENT lets the menu badge catch up) with the sample task cards placed at the time each task
 * was sent. Date separators, reply quotes, receipts Sent → Delivered → Seen on every line you sent.
 */
export function ChatThread({
  person,
  tasks,
  reloadKey,
  openCards,
  flash,
  onToggleCard,
  onReply,
  onEditTask,
  onJump,
  onLoaded,
}: {
  person: TaskPerson & { memberId: number };
  tasks: readonly SampleTask[];
  reloadKey: number;
  openCards: ReadonlySet<number>;
  flash: string | null;
  onToggleCard: (taskId: number) => void;
  onReply: (target: ReplyTarget) => void;
  onEditTask: (t: SampleTask) => void;
  onJump: (key: string) => void;
  onLoaded: (messages: Message[]) => void;
}): ReactElement {
  const [thread, setThread] = useState<Message[] | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const lastReplyId = useRef<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const onLoadedRef = useRef(onLoaded);
  useEffect(() => {
    onLoadedRef.current = onLoaded;
  });
  const first = person.first;

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    // Fetching the thread also marks their replies read server-side.
    getMemberThread(person.memberId, controller.signal)
      .then((msgs) => {
        if (!alive) return;
        setThread(msgs);
        setError(null);
        onLoadedRef.current(msgs);
        const newest = msgs.find((m) => m.sender === "member")?.id ?? null;
        if (newest !== lastReplyId.current) {
          lastReplyId.current = newest;
          window.dispatchEvent(new Event(CHAT_READ_EVENT));
        }
      })
      .catch((e: unknown) => {
        if (alive && !controller.signal.aborted) setError(errorMessage(e));
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [person.memberId, reloadKey, retry]);

  const items: Item[] = [
    ...(thread ?? []).map((m): Item => ({ kind: "msg", key: `m${m.id}`, at: new Date(m.created_at), m })),
    ...tasks.map((t): Item => ({ kind: "task", key: `t${t.id}`, at: entryDate(t.log[0] ?? { day: t.due, time: "9:00 AM" }), t })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());
  const count = items.length;

  // Start at the newest line; follow new lines while the reader is near the bottom.
  const stick = useRef(true);
  useLayoutEffect(() => {
    const el = box.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [count, thread]);

  if (error && thread === undefined) {
    return (
      <div className="cv-thread" role="alert">
        <p style={{ margin: "auto 0", textAlign: "center", color: "#B02A15" }}>
          {error}{" "}
          <button type="button" className="zk-link" onClick={() => setRetry((r) => r + 1)}>
            Try again
          </button>
        </p>
      </div>
    );
  }
  if (thread === undefined) {
    return (
      <div className="cv-thread" role="status" aria-busy="true">
        <span className="z-sr">Loading the conversation</span>
        {[220, 300, 180, 260].map((w, i) => (
          <div key={w} style={{ display: "flex", flexDirection: "column", alignItems: i % 2 ? "flex-end" : "flex-start", gap: 6 }}>
            <Sk w={w} h={42} style={{ borderRadius: 14 }} />
            <Sk w={90} h={10} />
          </div>
        ))}
      </div>
    );
  }

  const msgs = thread;
  return (
    <div
      ref={box}
      className="cv-thread"
      role="log"
      aria-label={`Conversation with ${person.name}`}
      onScroll={(e) => {
        const el = e.currentTarget;
        stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      }}
    >
      {items.length === 0 ? (
        <p style={{ margin: "auto 0", textAlign: "center", color: "#4A443C" }}>No messages with {first} yet. Say hello below{SAMPLES_ON ? ", or use Add task to send something to tick off" : ""}.</p>
      ) : null}
      {items.map((it, i) => {
        const day = isoDay(it.at);
        const prevDay = i > 0 ? isoDay(items[i - 1].at) : null;
        const sep =
          day !== prevDay ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "4px 0" }}>
              <span className="cv-sep">{sepLabel(day)}</span>
            </div>
          ) : null;
        const time = clockTime(it.at);
        const flashCls = flash === it.key ? "msg flash" : "msg";

        if (it.kind === "task") {
          const t = it.t;
          const mine = !t.byMember;
          const rc = !mine ? null : t.status === "sent" ? (person.pcOn ? "delivered" : "sent") : "seen";
          return (
            <Fragment key={it.key}>
              {sep}
              <div id={`msg-${it.key}`} className={`${flashCls} ${mine ? "out" : "in"}`}>
                <div className="mrow">
                  <TaskCard
                    task={t}
                    first={first}
                    open={openCards.has(t.id)}
                    onToggle={() => onToggleCard(t.id)}
                    onEdit={() => onEditTask(t)}
                    onReply={(draft) => onReply({ key: it.key, head: "Replying about this task", text: `Task: ${t.title}`, subject: `About: ${t.title}`.slice(0, 120), placeholder: first, draft })}
                  />
                  <button
                    type="button"
                    className="rbtn"
                    aria-label={`Reply about this task: ${t.title}`}
                    onClick={() => onReply({ key: it.key, head: "Replying about this task", text: `Task: ${t.title}`, subject: `About: ${t.title}`.slice(0, 120), placeholder: first })}
                  >
                    <ReplyIcon />
                    Reply about this task
                  </button>
                </div>
                <span className="cv-meta">
                  {mine ? `You sent this task · ${time} · by ${t.email ? "chat + email" : "chat"}` : `${first} added this for themselves · ${time} · nothing needed from you`}
                  {rc ? <Receipt kind={rc} /> : null}
                </span>
              </div>
            </Fragment>
          );
        }

        const m = it.m;
        const mine = m.sender === "owner";
        const q = mine ? quoteOf(m, msgs, tasks, first) : null;
        // A long chat note goes out as a cut-down title + the full text: show the text once.
        const showTitle = mine && !q && !!m.title && !!m.body && !m.body.startsWith(m.title.replace(/…$/, ""));
        const rc = !mine ? null : m.channel === "email" ? "emailed" : m.read_by_member ? "seen" : m.delivered_at ? "delivered" : "sent";
        const text = firstLine(m);
        return (
          <Fragment key={it.key}>
            {sep}
            <div id={`msg-${it.key}`} className={`${flashCls} ${mine ? "out" : "in"}`}>
              <div className="mrow">
                <div className={mine ? "cv-bubble out" : "cv-bubble in"}>
                  {q ? (
                    <button type="button" className="quote" onClick={() => q.key && onJump(q.key)} aria-label={`Show the message this replies to: ${q.text}`}>
                      {q.who ? <b className="quote-who">{q.who}</b> : null}
                      <span className="qt">{q.text}</span>
                    </button>
                  ) : null}
                  {showTitle ? <b style={{ display: "block", fontSize: 13 }}>{m.title}</b> : null}
                  <span style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{m.body ? <Linkified text={m.body} /> : m.title || "—"}</span>
                </div>
                <button
                  type="button"
                  className="rbtn"
                  aria-label={mine ? "Reply to your message" : `Reply to ${first}’s message`}
                  onClick={() =>
                    onReply({
                      key: it.key,
                      head: mine ? "Replying to your message" : `Replying to ${first}`,
                      text,
                      subject: `Re: ${text.length > 100 ? `${text.slice(0, 99).trimEnd()}…` : text}`,
                      placeholder: mine ? "your message" : first,
                    })
                  }
                >
                  <ReplyIcon />
                  Reply
                </button>
              </div>
              <span className="cv-meta">
                {mine ? "You" : first} · {time}
                {mine && m.channel ? CHANNEL_NOTE[m.channel] : ""}
                {rc ? <Receipt kind={rc} /> : null}
              </span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
