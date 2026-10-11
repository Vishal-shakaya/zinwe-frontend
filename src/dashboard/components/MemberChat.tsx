/**
 * Owner ↔ member messaging: the two-way thread (admin notes + the member's
 * replies from their Zinwe widget) and the composers. Used by the Team tile's
 * chat dialog and the Team → Chat tab.
 */
import { useEffect, useRef, useState, type FormEvent, type ReactElement } from "react";
import {
  errorMessage,
  getMemberThread,
  sendMessage,
  MESSAGE_BODY_MAX,
  MESSAGE_TITLE_MAX,
  type EventSeverity,
  type Member,
  type Message,
  type MessageField,
  type MessagePayload,
} from "../../lib/api";
import { cx } from "../../lib/cx";
import { compactErrors, focusFirstInvalid, requiredError, type FieldErrorMap } from "../../lib/validation";
import { apiFieldErrors, apiFormError } from "../../portal/failure";
import { Field } from "../../components/forms/Field";
import { FormAlert } from "../../portal/components/FormAlert";
import { formatRelative, useNow } from "../time";
import { DashIcon } from "./DashIcon";

const MESSAGE_FIELDS: readonly MessageField[] = ["title", "body", "severity"];

/** The importance levels, matched to the agent's "info" | "warning" | "critical". */
const SEVERITY_OPTIONS: ReadonlyArray<{ value: EventSeverity; label: string }> = [
  { value: "info", label: "Info — a normal heads-up" },
  { value: "warning", label: "Warning — please take note" },
  { value: "critical", label: "Critical — needs attention now" },
];

/** One-click fill for the most common notice. The owner can still edit it before sending. */
const USB_PRESET = {
  title: "USB storage is now blocked",
  body: "Your company has blocked copying to USB drives on this PC.",
  severity: "warning" as EventSeverity,
};

function titleError(value: string): string | undefined {
  const required = requiredError(value);
  if (required) return required;
  return value.trim().length > MESSAGE_TITLE_MAX
    ? `Keep the title to ${MESSAGE_TITLE_MAX} characters or fewer.`
    : undefined;
}

function bodyError(value: string): string | undefined {
  return value.trim().length > MESSAGE_BODY_MAX
    ? `Keep the message to ${MESSAGE_BODY_MAX} characters or fewer.`
    : undefined;
}

/** The two-way conversation with one member: admin alerts and the member's replies, oldest→newest. */
export function MemberChatThread({ member, reloadKey }: { member: Member; reloadKey: number }): ReactElement {
  const [thread, setThread] = useState<Message[] | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const now = useNow(30_000);

  useEffect(() => {
    let alive = true;
    // Fetching the thread also marks the member's replies read server-side.
    getMemberThread(member.id)
      .then((msgs) => {
        if (alive) setThread(msgs);
      })
      .catch((e) => {
        if (alive) setError(errorMessage(e));
      });
    return () => {
      alive = false;
    };
  }, [member.id, reloadKey]);

  if (error) {
    return <p className="form__err" role="alert">{error}</p>;
  }
  if (thread === undefined) {
    return <p className="dash-note">Loading conversation…</p>;
  }
  if (thread.length === 0) {
    return <p className="dash-note team-chat__empty">No messages yet — send the first one below.</p>;
  }

  const ordered = [...thread].reverse(); // API is newest-first; show like a chat (oldest → newest)
  const firstName = member.name.trim().split(/\s+/)[0] || "Member";
  return (
    <div className="team-chat" role="log" aria-label={`Conversation with ${member.name}`}>
      {ordered.map((m) => (
        <div
          key={m.id}
          className={cx("team-chat__msg", m.sender === "owner" ? "team-chat__msg--out" : "team-chat__msg--in")}
        >
          {/* A long chat note is sent as a cut-down title + the full text; show the text once. */}
          {m.sender === "owner" && m.title && !(m.body && m.body.startsWith(m.title.replace(/…$/, ""))) ? (
            <b className="team-chat__title">{m.title}</b>
          ) : null}
          {m.body ? <span className="team-chat__body">{m.body}</span> : m.title ? null : <span className="team-chat__body">—</span>}
          <time className="team-chat__time">
            {m.sender === "owner" ? "You" : firstName} · {formatRelative(m.created_at, now, "just now")}
          </time>
        </div>
      ))}
    </div>
  );
}

/** Compose + send a short message to one member; it lands in their Zinwe widget. */
export function SendMessageForm({ member, onClose, onSent }: { member: Member; onClose: () => void; onSent?: () => void }): ReactElement {
  const [draft, setDraft] = useState<{ title: string; body: string; severity: EventSeverity }>({
    title: "",
    body: "",
    severity: "info",
  });
  const [errors, setErrors] = useState<FieldErrorMap<MessageField>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const controls = useRef<Partial<Record<MessageField, HTMLElement | null>>>({});

  const reg = (field: MessageField) => (el: HTMLElement | null) => {
    controls.current[field] = el;
  };
  const update = (patch: Partial<typeof draft>, clear?: MessageField) => {
    setDraft((d) => ({ ...d, ...patch }));
    if (clear) setErrors((e) => (e[clear] ? { ...e, [clear]: undefined } : e));
    setSent(null);
  };

  const fillPreset = () => {
    setDraft({ ...USB_PRESET });
    setErrors({});
    setFormError(null);
    setSent(null);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const clean = { title: draft.title.trim(), body: draft.body.trim() };
    const clientErrors = compactErrors<MessageField>({
      title: titleError(draft.title),
      body: bodyError(draft.body),
    });
    setErrors(clientErrors);
    setFormError(null);
    setSent(null);
    if (Object.keys(clientErrors).length > 0) return focusFirstInvalid(MESSAGE_FIELDS, clientErrors, controls.current);

    const payload: MessagePayload = { title: clean.title, severity: draft.severity };
    if (clean.body) payload.body = clean.body;

    setPending(true);
    try {
      await sendMessage(member.id, payload);
      setDraft({ title: "", body: "", severity: "info" });
      setSent(clean.title);
      onSent?.();
    } catch (error) {
      const fieldErrors = apiFieldErrors(error, MESSAGE_FIELDS);
      setErrors(fieldErrors);
      setFormError(apiFormError(error, MESSAGE_FIELDS));
      focusFirstInvalid(MESSAGE_FIELDS, fieldErrors, controls.current);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="team-msg" role="group" aria-label={`Send a message to ${member.name}`}>

      <button
        type="button"
        className="btn btn--ghost dash-btn-sm team-msg__preset"
        onClick={fillPreset}
        disabled={pending}
      >
        <DashIcon name="usb" />
        Use the "USB blocked" message
      </button>

      <form className="co-form" onSubmit={onSubmit} noValidate>
        <Field error={errors.title}>
          <label htmlFor={`msg-title-${member.id}`}>Title</label>
          <input
            ref={reg("title")}
            id={`msg-title-${member.id}`}
            maxLength={MESSAGE_TITLE_MAX}
            placeholder="USB storage is now blocked"
            value={draft.title}
            onChange={(e) => update({ title: e.target.value }, "title")}
            aria-invalid={errors.title ? true : undefined}
          />
        </Field>

        <Field error={errors.body}>
          <label htmlFor={`msg-body-${member.id}`}>
            Message <small>(optional)</small>
          </label>
          <textarea
            ref={reg("body")}
            id={`msg-body-${member.id}`}
            maxLength={MESSAGE_BODY_MAX}
            rows={3}
            placeholder="Your company has blocked copying to USB drives on this PC."
            value={draft.body}
            onChange={(e) => update({ body: e.target.value }, "body")}
            aria-invalid={errors.body ? true : undefined}
          />
        </Field>

        <Field error={errors.severity}>
          <label htmlFor={`msg-sev-${member.id}`}>Importance</label>
          <select
            ref={reg("severity")}
            id={`msg-sev-${member.id}`}
            value={draft.severity}
            onChange={(e) => update({ severity: e.target.value as EventSeverity })}
          >
            {SEVERITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <FormAlert message={formError} />
        {sent ? (
          <p className="dash-banner dash-banner--ok" role="status">
            <DashIcon name="check" />
            <span>
              Sent to <b>{member.name}</b>. "{sent}" will show in their Zinwe widget shortly.
            </span>
          </p>
        ) : null}

        <div className="co-form__foot">
          <button type="submit" className="btn btn--primary dash-btn-sm" disabled={pending}>
            {pending ? "Sending…" : "Send to widget"}
          </button>
          <button type="button" className="btn btn--ghost dash-btn-sm" onClick={onClose} disabled={pending}>
            Close
          </button>
        </div>
      </form>
    </div>
  );
}

/** A note as the widget shows it: the API needs a title, so short notes are the title and long ones are cut into one. */
function toPayload(text: string, severity: EventSeverity): MessagePayload {
  if (text.length <= MESSAGE_TITLE_MAX && !text.includes("\n")) return { title: text, severity };
  const firstLine = text.split("\n")[0].trim();
  const title = firstLine.length <= 80 ? firstLine : `${firstLine.slice(0, 79).trimEnd()}…`;
  return { title, body: text.slice(0, MESSAGE_BODY_MAX), severity };
}

/**
 * Chat-style composer for the Team → Chat tab: one box, Enter to send
 * (Shift+Enter for a new line), and the importance as a small picker.
 */
export function ChatComposer({ member, onSent }: { member: Member; onSent: () => void }): ReactElement {
  const [text, setText] = useState("");
  const [severity, setSeverity] = useState<EventSeverity>("info");
  // On by default: the email reaches them even when their PC is off.
  const [alsoEmail, setAlsoEmail] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const send = async () => {
    const clean = text.trim();
    if (!clean || pending) return;
    setPending(true);
    setError(null);
    try {
      await sendMessage(member.id, { ...toPayload(clean, severity), also_email: alsoEmail });
      setText("");
      setSeverity("info");
      setNotice(alsoEmail ? `Sent to their widget and emailed to ${member.email}.` : "Sent to their widget.");
      onSent();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void send();
  };

  return (
    <form className="tchat__compose" onSubmit={onSubmit} noValidate>
      {error ? (
        <p className="form__err" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="tchat__notice" role="status">
          {notice}
        </p>
      ) : null}
      <label className="dash-sr" htmlFor={`chat-input-${member.id}`}>
        Message to {member.name}
      </label>
      <textarea
        id={`chat-input-${member.id}`}
        rows={2}
        maxLength={MESSAGE_BODY_MAX}
        placeholder={`Message ${member.name.split(/\s+/)[0] || member.name}…`}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setNotice(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void send();
          }
        }}
        disabled={pending}
      />
      <div className="tchat__compose-bar">
        <label className="tchat__sev">
          <span className="dash-sr">Importance</span>
          <select value={severity} onChange={(e) => setSeverity(e.target.value as EventSeverity)} disabled={pending}>
            <option value="info">Normal</option>
            <option value="warning">Important</option>
            <option value="critical">Urgent</option>
          </select>
        </label>
        <label className="tchat__email">
          <input type="checkbox" checked={alsoEmail} onChange={(e) => setAlsoEmail(e.target.checked)} disabled={pending} />
          <span>Also email</span>
        </label>
        <small className="tchat__hint">Enter to send · Shift+Enter for a new line</small>
        <button type="submit" className="btn btn--primary dash-btn-sm" disabled={pending || !text.trim()}>
          {pending ? "Sending…" : "Send"}
        </button>
      </div>
    </form>
  );
}
