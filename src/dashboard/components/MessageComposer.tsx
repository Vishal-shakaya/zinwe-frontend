import { useRef, useState, type FormEvent, type ReactElement } from "react";
import {
  sendMessage,
  MESSAGE_BODY_MAX,
  MESSAGE_TITLE_MAX,
  type EventSeverity,
  type MessageField,
  type MessagePayload,
} from "../../lib/api";
import { Field } from "../../components/forms/Field";
import { compactErrors, focusFirstInvalid, requiredError, type FieldErrorMap } from "../../lib/validation";
import { apiFieldErrors, apiFormError } from "../../portal/failure";
import { FormAlert } from "../../portal/components/FormAlert";
import { DashIcon } from "./DashIcon";

/** A short prefilled note the owner can tweak before sending to a member. */
export interface MessagePreset {
  title: string;
  body?: string;
  severity?: EventSeverity;
}

const MESSAGE_FIELDS: readonly MessageField[] = ["title", "body", "severity"];

const SEVERITY_OPTIONS: ReadonlyArray<{ value: EventSeverity; label: string }> = [
  { value: "info", label: "Info — a normal heads-up" },
  { value: "warning", label: "Warning — please take note" },
  { value: "critical", label: "Critical — needs attention now" },
];

function titleError(value: string): string | undefined {
  const required = requiredError(value);
  if (required) return required;
  return value.trim().length > MESSAGE_TITLE_MAX ? `Keep the title to ${MESSAGE_TITLE_MAX} characters or fewer.` : undefined;
}

function bodyError(value: string): string | undefined {
  return value.trim().length > MESSAGE_BODY_MAX ? `Keep the message to ${MESSAGE_BODY_MAX} characters or fewer.` : undefined;
}

/**
 * Compose + send a message to one member, optionally prefilled from an alert.
 * Lands in that member's Zinwe widget on their PC's next check-in.
 */
export function MessageComposer({
  memberId,
  memberName,
  preset,
  onClose,
}: {
  memberId: number;
  memberName: string;
  preset?: MessagePreset;
  onClose: () => void;
}): ReactElement {
  const [draft, setDraft] = useState<{ title: string; body: string; severity: EventSeverity }>({
    title: preset?.title ?? "",
    body: preset?.body ?? "",
    severity: preset?.severity ?? "info",
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

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const clean = { title: draft.title.trim(), body: draft.body.trim() };
    const clientErrors = compactErrors<MessageField>({ title: titleError(draft.title), body: bodyError(draft.body) });
    setErrors(clientErrors);
    setFormError(null);
    setSent(null);
    if (Object.keys(clientErrors).length > 0) return focusFirstInvalid(MESSAGE_FIELDS, clientErrors, controls.current);

    const payload: MessagePayload = { title: clean.title, severity: draft.severity };
    if (clean.body) payload.body = clean.body;

    setPending(true);
    try {
      await sendMessage(memberId, payload);
      setSent(clean.title);
      setDraft({ title: "", body: "", severity: "info" });
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
    <div className="team-msg" role="group" aria-label={`Send a message to ${memberName}`}>
      <p className="dash-note">
        Send <b>{memberName}</b> a short note. It appears in their Zinwe widget on their PC the next time it checks in
        (usually within a minute).
      </p>

      <form className="co-form" onSubmit={onSubmit} noValidate>
        <Field error={errors.title}>
          <label htmlFor={`mc-title-${memberId}`}>Title</label>
          <input
            ref={reg("title")}
            id={`mc-title-${memberId}`}
            maxLength={MESSAGE_TITLE_MAX}
            placeholder="A quick note about your work PC"
            value={draft.title}
            onChange={(e) => update({ title: e.target.value }, "title")}
            aria-invalid={errors.title ? true : undefined}
          />
        </Field>

        <Field error={errors.body}>
          <label htmlFor={`mc-body-${memberId}`}>
            Message <small>(optional)</small>
          </label>
          <textarea
            ref={reg("body")}
            id={`mc-body-${memberId}`}
            maxLength={MESSAGE_BODY_MAX}
            rows={3}
            placeholder="Add any detail you'd like them to see."
            value={draft.body}
            onChange={(e) => update({ body: e.target.value }, "body")}
            aria-invalid={errors.body ? true : undefined}
          />
        </Field>

        <Field error={errors.severity}>
          <label htmlFor={`mc-sev-${memberId}`}>Importance</label>
          <select
            ref={reg("severity")}
            id={`mc-sev-${memberId}`}
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
              Sent to <b>{memberName}</b>. "{sent}" will show in their Zinwe widget shortly.
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

export default MessageComposer;
