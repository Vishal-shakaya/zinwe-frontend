import { useRef, useState, type ChangeEvent, type FormEvent, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { COMPANY_EMAIL } from "../../content/company";
import { contactTopicOptions, type ContactTopic } from "../../content/forms";
import { submitContact } from "../../lib/api/contact";
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
import { trackEvent } from "../../lib/analytics";

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

/** A mailto: link carrying what was typed, for when the form can't reach us. */
function mailtoFor(v: Values): string {
  const subject = `Zinwe: message from ${v.name.trim() || "the website"}`;
  const body = [v.message.trim(), "", v.name.trim(), v.company.trim()].filter((line, i) => i < 2 || line).join("\n");
  return `mailto:${COMPANY_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Contact form, posted to POST /api/contact/: the team gets an email (reply-to = the visitor) and the
 * visitor gets a "we got your message" email. If it can't be sent, everything typed stays and the
 * visitor can email us instead (nothing is ever "sent" that wasn't).
 */
export function ContactForm(): ReactElement {
  const [values, setValues] = useState<Values>(INITIAL);
  const [errors, setErrors] = useState<FieldErrorMap<ContactField>>({});
  const [formError, setFormError] = useState<{ text: string; mailto: string | null } | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const controls = useRef<Partial<Record<ContactField, HTMLElement | null>>>({});

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

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    setFormError(null);
    const next = validate(values);
    setErrors(next);
    if (Object.keys(next).length > 0) {
      focusFirstInvalid(FIELD_ORDER, next, controls.current);
      return;
    }

    const email = values.email.trim();
    setPending(true);
    const result = await submitContact({
      name: values.name.trim(),
      email,
      company: values.company.trim(),
      topic: values.topic,
      message: values.message.trim(),
    });
    setPending(false);

    if (result.ok) {
      trackEvent("generate_lead", { lead_source: "contact_form", topic: values.topic });
      setSent(email);
      setValues(INITIAL);
      return;
    }
    if (result.kind === "validation") {
      const fieldErrors: FieldErrorMap<ContactField> = {};
      for (const field of FIELD_ORDER) {
        const messages = result.fieldErrors[field];
        if (messages?.length) fieldErrors[field] = messages.join(" ");
      }
      setErrors(fieldErrors);
      if (result.formError) setFormError({ text: result.formError, mailto: null });
      focusFirstInvalid(FIELD_ORDER, fieldErrors, controls.current);
      return;
    }
    // Keep everything typed; offer email instead.
    setFormError({
      text:
        result.kind === "rate_limited"
          ? "You've sent a few messages already. Wait a little, or email us directly:"
          : "We couldn't send your message. Check your connection and try again, or email us directly:",
      mailto: mailtoFor(values),
    });
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
          {formError ? (
            <p className="form__err" role="alert">
              {formError.text}
              {formError.mailto ? (
                <>
                  {" "}
                  <a href={formError.mailto}>{COMPANY_EMAIL}</a>
                </>
              ) : null}
            </p>
          ) : null}
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
      <FormSuccess
        active={sent !== null}
        heading="Message sent."
        body={`We'll reply from ${COMPANY_EMAIL} within one working day. We've emailed ${sent ?? "you"} a copy, so you know it reached us.`}
        action={
          <Link className="btn btn--ghost" to="/plans">
            See the plans meanwhile <span className="arr">→</span>
          </Link>
        }
      />
    </Reveal>
  );
}
