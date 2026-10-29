import { useRef, useState, type KeyboardEvent, type ReactElement } from "react";
import { errorMessage, MESSAGE_BODY_MAX, sendMessage, type MessageChannel } from "../../lib/api";
import { ComposerMenu } from "../components/TaggedComposer";
import { DashIcon } from "../components/DashIcon";
import { DELIVERIES, deliveryFor, draftPreview, subjectLine, tagsFor, URGENCY, type MessageTag, type Urgency } from "../features/messageTags";
import type { TaskPerson } from "../tasks/model";
import { TaskMark } from "../tasks/icons";
import type { ReplyTarget } from "./reply";

/**
 * The Chat page composer (DashChat): the task button, the message box and the round Send inside one box; "/" opens
 * the actions menu ("/task Send the deck" opens the task form with the title filled in). Under it, the same
 * Suggestions / Priority / Send via (Chat, Chat + email, Email only) as the chat bubble. Enter sends,
 * Shift + Enter starts a new line. Without `onTask` (production builds: tasks are sample data until FR-20) there is
 * no task button and no "/" menu.
 */
export function ChatComposer({
  person,
  reply,
  onCancelReply,
  onJumpReply,
  onTask,
  onSent,
}: {
  person: TaskPerson & { memberId: number };
  reply: ReplyTarget | null;
  onCancelReply: () => void;
  onJumpReply: () => void;
  /** Open the task form for this person, optionally with a title. Leave out to hide every task control. */
  onTask?: (title?: string) => void;
  onSent: (delivery: MessageChannel) => void;
}): ReactElement {
  const first = person.first;
  const email = person.member?.email ?? "their email";
  const tags = tagsFor(null);
  const [text, setText] = useState("");
  const [tag, setTag] = useState<MessageTag | null>(null);
  const [urgency, setUrgencyState] = useState<Urgency>("info");
  const [delivery, setDelivery] = useState<MessageChannel>("chat");
  const [deliveryPicked, setDeliveryPicked] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [slashClosed, setSlashClosed] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  // A reply that comes with a draft ("Done, you have edit access now. ") fills the box once.
  const [seenReply, setSeenReply] = useState<ReplyTarget | null>(null);
  if (reply !== seenReply) {
    setSeenReply(reply);
    if (reply?.draft) setText(reply.draft);
  }

  const setUrgency = (next: Urgency) => {
    setUrgencyState(next);
    if (!deliveryPicked) setDelivery(deliveryFor(next));
  };
  const priority = URGENCY.find((u) => u.value === urgency) ?? URGENCY[0];
  const via = DELIVERIES.find((d) => d.value === delivery) ?? DELIVERIES[0];

  const slashWord = /^\/(\S*)/.exec(text)?.[1];
  const slashOpen = onTask !== undefined && slashWord !== undefined && !slashClosed && "task".startsWith(slashWord.toLowerCase()) && !/^\/\S*\n/.test(text);
  const slashTitle = text.replace(/^\/\S*\s*/, "").trim();
  const pickSlash = () => {
    onTask?.(slashTitle || undefined);
    setText("");
    setSlashClosed(false);
  };

  const send = async () => {
    const body = text.trim();
    if (!body || pending || slashOpen) return;
    setPending(true);
    setError(null);
    try {
      const fallback = body.split("\n")[0].slice(0, 80) + (body.length > 80 ? "…" : "");
      await sendMessage(person.memberId, {
        title: reply ? reply.subject : subjectLine(tag, null, fallback),
        body,
        severity: urgency,
        channel: delivery,
      });
      setNotice(delivery === "email" ? `Emailed to ${email}.` : delivery === "chat_email" ? `Sent to ${first}'s PC and emailed.` : null);
      setText("");
      setTag(null);
      onSent(delivery);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (slashOpen) {
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        pickSlash();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setSlashClosed(true);
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        return;
      }
    }
    if (e.key === "Escape" && reply) {
      e.preventDefault();
      onCancelReply();
      return;
    }
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send();
    }
  };

  const replyWho = reply ? reply.placeholder : "";
  return (
    <div className="cv-compose">
      {reply ? (
        <div className="cv-replying">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A84505" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none" }}>
            <path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 6 6v5" />
          </svg>
          <button type="button" onClick={onJumpReply} className="cv-replying__what">
            <span style={{ fontSize: 12, fontWeight: 600, color: "#A84505" }}>{reply.head}</span>
            <span className="qt" style={{ fontSize: 13, color: "#3A352E" }}>
              {reply.text}
            </span>
          </button>
          <button type="button" aria-label="Cancel reply" onClick={onCancelReply} className="cv-replying__x">
            ×
          </button>
        </div>
      ) : null}
      <div style={{ position: "relative" }}>
        {slashOpen ? (
          <div id="slash-menu" role="listbox" aria-label="Actions" className="cv-slash">
            <span className="cv-slash__head">ACTIONS</span>
            <button
              type="button"
              role="option"
              aria-selected="true"
              className="slash-opt"
              onMouseDown={(e) => {
                e.preventDefault();
                pickSlash();
              }}
            >
              <span aria-hidden="true" className="cv-slash__mark">
                <TaskMark />
              </span>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", lineHeight: 1.3, textAlign: "left" }}>
                <b style={{ fontSize: 14 }}>Create a task for {first}</b>
                <small style={{ fontSize: 12, color: "#6B6358", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {slashTitle ? `“${slashTitle}”` : `Opens the task form with ${first} filled in`}
                </small>
              </span>
              <span className="z-mono" style={{ flex: "none", fontSize: 12, color: "#6B6358" }}>
                /task
              </span>
            </button>
            <span style={{ fontSize: 11.5, color: "#6B6358", padding: "4px 8px" }}>↑ ↓ to choose · Enter to open · Esc to close</span>
          </div>
        ) : null}
        <div className="cbox">
          {onTask ? (
            <button type="button" id="new-task" className="cicon" aria-label={`Add a task for ${first} (or type /task)`} title="Add a task · or type /task" aria-haspopup="dialog" onClick={() => onTask()}>
              <TaskMark size={18} stroke={2} />
            </button>
          ) : null}
          <label htmlFor="msg" className="z-sr">
            Message {first}
          </label>
          <textarea
            ref={textRef}
            id="msg"
            rows={1}
            maxLength={MESSAGE_BODY_MAX}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setSlashClosed(false);
              setNotice(null);
            }}
            onKeyDown={onKey}
            placeholder={reply ? `Reply to ${replyWho}…` : `Message ${first}…`}
            aria-autocomplete="list"
            aria-controls={slashOpen ? "slash-menu" : undefined}
            aria-expanded={slashOpen}
            disabled={pending}
            className="cv-text"
          />
          <button type="button" className="csend" aria-label={`Send message to ${first}`} disabled={!text.trim() || slashOpen || pending} onClick={() => void send()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h13M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>
      <div className="cv-tools">
        <ComposerMenu
          label="Suggestions"
          current={tag?.id ?? null}
          options={tags.map((t) => ({ value: t.id, label: t.label, icon: t.icon, note: draftPreview(t.draft(first, { subject: null, detail: null, suggested: "", feature: null })) }))}
          onPick={(id) => {
            const next = tags.find((t) => t.id === id) ?? null;
            if (!next || tag?.id === next.id) {
              setTag(null);
              return;
            }
            setTag(next);
            setUrgency(next.urgency);
            setText(next.draft(first, { subject: null, detail: null, suggested: "", feature: null }));
            setNotice(null);
            textRef.current?.focus();
          }}
          trigger={
            <>
              <DashIcon name={tag?.icon ?? "book"} />
              <span className="tc-dd__label tc-dd__label--suggest">{tag?.label ?? "Suggestions"}</span>
            </>
          }
        />
        <ComposerMenu
          label="Priority"
          current={urgency}
          options={URGENCY.map((u) => ({ value: u.value, label: u.label, note: u.hint, dot: u.value }))}
          onPick={setUrgency}
          trigger={
            <>
              <i className={`tc-dot tc-dot--${priority.value}`} aria-hidden="true" />
              <span className="tc-dd__label">{priority.label}</span>
            </>
          }
        />
        <ComposerMenu
          label="Send via"
          current={delivery}
          options={DELIVERIES}
          onPick={(value) => {
            setDelivery(value);
            setDeliveryPicked(true);
            setNotice(null);
          }}
          trigger={
            <>
              <DashIcon name={via.icon} />
              <span className="tc-dd__label">{via.label}</span>
            </>
          }
        />
      </div>
      {error ? (
        <p className="cv-err" role="alert">
          {error}
        </p>
      ) : notice ? (
        <p className="cv-ok" role="status">
          {notice}
        </p>
      ) : (
        <span className="cv-hint">
          {onTask ? (
            <>
              Type <b className="z-mono">/</b> for actions, like <b className="z-mono">/task</b> ·{" "}
            </>
          ) : null}
          Enter sends · Shift + Enter for a new line ·{" "}
          {delivery === "email" ? `Goes to ${email} only` : `Lands in the Zinwe window on ${first}’s PC`}
        </span>
      )}
    </div>
  );
}
