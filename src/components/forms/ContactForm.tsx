import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactElement } from "react";
import { contactTopicOptions, type ContactTopic } from "../../content/forms";
import { cx } from "../../lib/cx";
import {
  compactErrors,
  emailError,
  focusFirstInvalid,
  requiredError,
  type FieldErrorMap,
} from "../../lib/validation";
import { Reveal } from "../ui/Reveal";
import { ChipGroup } from "./ChipGroup";
import { Field } from "./Field";
import { FormSuccess } from "./FormSuccess";

interface Values {
  name: string;
  email: string;
  company: string;
  topic: ContactTopic;
  message: string;
}

type ContactField = keyof Values;

const INITIAL: Values = { name: "", email: "", company: "", topic: "fit", message: "" };
const FIELD_ORDER: readonly ContactField[] = ["name", "email", "company", "topic", "message"];
const STORAGE_KEY = "zinwe.contact";

function clientError(field: ContactField, v: Values): string | undefined {
  switch (field) {
    case "name":
      return requiredError(v.name);
    case "email":
      return emailError(v.email);
    case "message":
      return requiredError(v.message);
    default:
      return undefined;
  }
}

function validate(v: Values): FieldErrorMap<ContactField> {
  return compactErrors<ContactField>(Object.fromEntries(FIELD_ORDER.map((f) => [f, clientError(f, v)])));
}

/**
 * Stores the message locally, exactly like the static site did.
 * TODO: wire to backend z_main contact endpoint (add `submitContact` to
 * lib/api.ts and reuse the early-access error handling) once it exists.
 */
function saveContactLocally(values: Values): void {
  const entry = { ...values, _form: "contact", _at: new Date().toISOString() };
  try {
    const list: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    const next = Array.isArray(list) ? [...list, entry] : [entry];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — still show thanks */
  }
}

/** Contact form. No backend yet: saved to localStorage, then the thank-you shows. */
export function ContactForm(): ReactElement {
  const [values, setValues] = useState<Values>(INITIAL);
  const [errors, setErrors] = useState<FieldErrorMap<ContactField>>({});
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const controls = useRef<Partial<Record<ContactField, HTMLElement | null>>>({});
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const update = (field: ContactField, next: Values) => {
    setValues(next);
    if (errors[field] && !clientError(field, next)) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const onText =
    (field: "name" | "email" | "company" | "message") => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      update(field, { ...values, [field]: e.target.value });

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const next = validate(values);
    setErrors(next);
    if (Object.keys(next).length > 0) {
      focusFirstInvalid(FIELD_ORDER, next, controls.current);
      return;
    }

    saveContactLocally({
      ...values,
      name: values.name.trim(),
      email: values.email.trim(),
      company: values.company.trim(),
      message: values.message.trim(),
    });
    setPending(true);
    timer.current = window.setTimeout(() => {
      setPending(false);
      setSent(true);
      setValues(INITIAL);
    }, 500);
  };

  const bind = (field: ContactField) => (el: HTMLElement | null) => {
    controls.current[field] = el;
  };

  return (
    <Reveal className={cx("form", sent && "is-sent")} delay={1}>
      <form data-form="contact" noValidate onSubmit={onSubmit}>
        <div className="form__grid">
          <Field error={errors.name}>
            <label htmlFor="c-name">Your name</label>
            <input
              ref={bind("name")}
              id="c-name"
              name="name"
              type="text"
              autoComplete="name"
              required
              aria-invalid={errors.name ? true : undefined}
              value={values.name}
              onChange={onText("name")}
            />
          </Field>
          <Field error={errors.email}>
            <label htmlFor="c-email">Email</label>
            <input
              ref={bind("email")}
              id="c-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              aria-invalid={errors.email ? true : undefined}
              value={values.email}
              onChange={onText("email")}
            />
          </Field>
          <Field full error={errors.company}>
            <label htmlFor="c-company">
              Company <small>(optional)</small>
            </label>
            <input
              ref={bind("company")}
              id="c-company"
              name="company"
              type="text"
              autoComplete="organization"
              value={values.company}
              onChange={onText("company")}
            />
          </Field>
          <Field full error={errors.topic}>
            <label id="c-topic-label">What's this about?</label>
            <ChipGroup
              type="radio"
              name="topic"
              options={contactTopicOptions}
              selected={[values.topic]}
              onToggle={(value) => update("topic", { ...values, topic: value })}
              labelledBy="c-topic-label"
              firstInputRef={bind("topic")}
            />
          </Field>
          <Field full error={errors.message}>
            <label htmlFor="c-msg">Message</label>
            <textarea
              ref={bind("message")}
              id="c-msg"
              name="message"
              required
              placeholder="Tell us about your team and what you'd like to protect."
              aria-invalid={errors.message ? true : undefined}
              value={values.message}
              onChange={onText("message")}
            />
          </Field>
        </div>
        <div className="form__foot">
          <button className="btn btn--primary btn--lg btn--block" type="submit" disabled={pending} aria-busy={pending}>
            {pending ? (
              "Sending…"
            ) : (
              <>
                Send message <span className="arr">→</span>
              </>
            )}
          </button>
          <p className="form__fine">Replies come from hello@zinwe.io. We never share your details.</p>
        </div>
      </form>
      <FormSuccess active={sent} heading="Message sent." body="Expect a reply within one working day." />
    </Reveal>
  );
}
