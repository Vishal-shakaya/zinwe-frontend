import { useState, type FormEvent, type ReactElement } from "react";
import { ApiError, emailAlert, errorMessage, sendMessage, MESSAGE_BODY_MAX, type DeviceEvent } from "../../lib/api";
import { cx } from "../../lib/cx";
import { contextOf, subjectLine, tagsFor, URGENCY, type MessageTag, type Urgency } from "../features/messageTags";
import { eventMeta } from "../features/events";
import { DashIcon } from "./DashIcon";

/** How a note reaches the person. "email" (one email about an alert) exists only with an alert. */
export type Delivery = "widget" | "both" | "email";

export interface ComposerPerson {
  id: number;
  name: string;
  email?: string;
}

/**
 * The one composer for messaging a team member (chat bubble and Chat page):
 * tag chips (what it's about — becomes the subject), urgency, where it goes
 * (widget, widget + email, or email only for an alert), and the text. Picking
 * a tag fills in a draft and its usual urgency; everything stays editable.
 */
export function TaggedComposer({
  person,
  event = null,
  initialTag = null,
  initialUrgency,
  initialDelivery = "both",
  compact = false,
  onSent,
}: {
  person: ComposerPerson;
  event?: DeviceEvent | null;
  initialTag?: string | null;
  initialUrgency?: Urgency;
  initialDelivery?: Delivery;
  compact?: boolean;
  onSent: (delivery: Delivery) => void;
}): ReactElement {
  const first = person.name.trim().split(/\s+/)[0] || person.name;
  const tags = tagsFor(event);
  const ctx = contextOf(event);
  const startTag = tags.find((t) => t.id === initialTag) ?? null;

  const [tag, setTag] = useState<MessageTag | null>(startTag);
  const [urgency, setUrgency] = useState<Urgency>(initialUrgency ?? startTag?.urgency ?? "info");
  const [delivery, setDelivery] = useState<Delivery>(event ? initialDelivery : initialDelivery === "email" ? "both" : initialDelivery);
  const [text, setText] = useState(startTag ? startTag.draft(first, ctx) : "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const pickTag = (next: MessageTag) => {
    if (tag?.id === next.id) {
      setTag(null);
      return;
    }
    setTag(next);
    setUrgency(next.urgency);
    setText(next.draft(first, ctx));
    setNotice(null);
  };

  const send = async () => {
    const body = text.trim();
    if (!body || pending) return;
    setPending(true);
    setError(null);
    try {
      if (delivery === "email" && event) {
        await emailAlert(event.id, { label: subjectLine(tag, event, eventMeta(event.type).label), suggested: body.slice(0, 300) });
        setNotice(`Emailed to ${person.email ?? first}.`);
      } else {
        const fallback = body.split("\n")[0].slice(0, 80) + (body.length > 80 ? "…" : "");
        await sendMessage(person.id, {
          title: subjectLine(tag, event, fallback),
          body,
          severity: urgency,
          also_email: delivery === "both",
        });
        setNotice(delivery === "both" ? `Sent to ${first}'s PC and emailed.` : `Sent to ${first}'s PC.`);
      }
      setText("");
      setTag(null);
      onSent(delivery);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 409 ? "This alert was already emailed to them." : errorMessage(err));
    } finally {
      setPending(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send();
  };

  const deliveries: ReadonlyArray<{ value: Delivery; label: string }> = [
    { value: "widget", label: "PC" },
    { value: "both", label: "PC + email" },
    ...(event ? [{ value: "email" as const, label: "Email only" }] : []),
  ];

  return (
    <form className={cx("tc", compact && "tc--compact")} onSubmit={onSubmit} noValidate>
      <div className="tc__tags" role="group" aria-label="What's it about?">
        {tags.map((t) => (
          <button
            key={t.id}
            type="button"
            className={cx("tc__tag", tag?.id === t.id && "is-on", `tc__tag--${t.urgency}`)}
            aria-pressed={tag?.id === t.id}
            onClick={() => pickTag(t)}
          >
            <DashIcon name={t.icon} />
            {t.label}
          </button>
        ))}
      </div>

      <label className="dash-sr" htmlFor={`tc-${person.id}`}>
        Message to {person.name}
      </label>
      <textarea
        id={`tc-${person.id}`}
        className="tc__text"
        rows={compact ? 3 : 2}
        maxLength={delivery === "email" ? 300 : MESSAGE_BODY_MAX}
        placeholder={tag ? "" : `Message ${first}… or pick a tag above`}
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

      <div className="tc__bar">
        {delivery !== "email" ? (
          <div className="tc__seg" role="radiogroup" aria-label="Urgency">
            {URGENCY.map((u) => (
              <button
                key={u.value}
                type="button"
                role="radio"
                aria-checked={urgency === u.value}
                className={cx("tc__seg-opt", `tc__seg-opt--${u.value}`, urgency === u.value && "is-on")}
                onClick={() => setUrgency(u.value)}
                data-tip={u.hint}
              >
                {u.label}
              </button>
            ))}
          </div>
        ) : null}
        <div className="tc__seg" role="radiogroup" aria-label="Send to">
          {deliveries.map((d) => (
            <button
              key={d.value}
              type="button"
              role="radio"
              aria-checked={delivery === d.value}
              className={cx("tc__seg-opt", delivery === d.value && "is-on")}
              onClick={() => setDelivery(d.value)}
            >
              {d.label}
            </button>
          ))}
        </div>
        <button type="submit" className="btn btn--primary dash-btn-sm tc__send" disabled={pending || !text.trim()}>
          <DashIcon name="share" />
          {pending ? "Sending…" : "Send"}
        </button>
      </div>

      {error ? (
        <p className="form__err" role="alert">
          {error}
        </p>
      ) : notice ? (
        <p className="tc__notice" role="status">
          <DashIcon name="check" />
          {notice}
        </p>
      ) : null}
    </form>
  );
}

export default TaggedComposer;
