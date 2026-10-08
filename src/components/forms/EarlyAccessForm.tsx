import { useRef, useState, type ChangeEvent, type FormEvent, type ReactElement } from "react";
import { concernOptions, platformOptions, teamSizeOptions } from "../../content/forms";
import {
  submitEarlyAccess,
  type Concern,
  type EarlyAccessField,
  type EarlyAccessPayload,
  type Platform,
  type TeamSize,
} from "../../lib/api";
import { cx } from "../../lib/cx";
import {
  compactErrors,
  emailError,
  focusFirstInvalid,
  pickError,
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
  phone: string;
  team_size: TeamSize | "";
  platforms: Platform[];
  concerns: Concern[];
}

type TextField = "name" | "email" | "company" | "phone";

const INITIAL: Values = {
  name: "",
  email: "",
  company: "",
  phone: "",
  team_size: "",
  platforms: ["windows"],
  concerns: [],
};

/** Visual order, used to pick which invalid control gets focus. */
const FIELD_ORDER: readonly EarlyAccessField[] = [
  "name",
  "email",
  "company",
  "phone",
  "team_size",
  "platforms",
  "concerns",
];

const SUCCESS_COPY = {
  new: {
    heading: "Spot reserved.",
    body: "We'll be in touch before launch with your access and a time for setup.",
  },
  existing: {
    heading: "You're already on the list.",
    body: "We have your spot. We'll be in touch before launch.",
  },
} as const;

const FORM_MESSAGES = {
  rate_limited: "Too many attempts. Try again in a few minutes.",
  network: "Couldn't reach the server. Check your connection and try again.",
  server: "Couldn't reach the server. Check your connection and try again.",
} as const;

/** Client-side rule per field (fields without one are always valid locally). */
function clientError(field: EarlyAccessField, v: Values): string | undefined {
  switch (field) {
    case "name":
      return requiredError(v.name);
    case "email":
      return emailError(v.email);
    case "company":
      return requiredError(v.company);
    case "team_size":
      return pickError(v.team_size);
    default:
      return undefined;
  }
}

function validate(v: Values): FieldErrorMap<EarlyAccessField> {
  return compactErrors<EarlyAccessField>(Object.fromEntries(FIELD_ORDER.map((f) => [f, clientError(f, v)])));
}

function toggleIn<T>(list: T[], value: T, on: boolean): T[] {
  const without = list.filter((x) => x !== value);
  return on ? [...without, value] : without;
}

/** Early-access sign-up, posted to POST /api/auth/early-access/. */
export function EarlyAccessForm(): ReactElement {
  const [values, setValues] = useState<Values>(INITIAL);
  const [errors, setErrors] = useState<FieldErrorMap<EarlyAccessField>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState<keyof typeof SUCCESS_COPY | null>(null);
  const controls = useRef<Partial<Record<EarlyAccessField, HTMLElement | null>>>({});

  /** Apply an edit; drop the field's error once the new value passes client rules. */
  const update = (field: EarlyAccessField, next: Values) => {
    setValues(next);
    if (errors[field] && !clientError(field, next)) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const onText = (field: TextField) => (e: ChangeEvent<HTMLInputElement>) =>
    update(field, { ...values, [field]: e.target.value });

  const showErrors = (next: FieldErrorMap<EarlyAccessField>) => {
    setErrors(next);
    focusFirstInvalid(FIELD_ORDER, next, controls.current);
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    setFormError(null);

    const clientErrors = validate(values);
    if (Object.keys(clientErrors).length > 0) {
      showErrors(clientErrors);
      return;
    }
    setErrors({});

    const payload: EarlyAccessPayload = {
      name: values.name.trim(),
      email: values.email.trim(),
      company: values.company.trim(),
      phone: values.phone.trim(),
      team_size: values.team_size as TeamSize,
      platforms: values.platforms,
      concerns: values.concerns,
    };

    setPending(true);
    const result = await submitEarlyAccess(payload);
    setPending(false);

    if (result.ok) {
      setSent(result.data.already_registered ? "existing" : "new");
      setValues(INITIAL);
      return;
    }
    if (result.kind === "validation") {
      const fieldErrors: FieldErrorMap<EarlyAccessField> = {};
      for (const field of FIELD_ORDER) {
        const messages = result.fieldErrors[field];
        if (messages?.length) fieldErrors[field] = messages.join(" ");
      }
      setFormError(result.formError ?? null);
      showErrors(fieldErrors);
      return;
    }
    // Keep everything the visitor typed; just explain what went wrong.
    setFormError(FORM_MESSAGES[result.kind]);
  };

  const success = SUCCESS_COPY[sent ?? "new"];
  const bind = (field: EarlyAccessField) => (el: HTMLElement | null) => {
    controls.current[field] = el;
  };

  return (
    <Reveal className={cx("form", sent !== null && "is-sent")} delay={1}>
      <form data-form="early-access" noValidate onSubmit={onSubmit}>
        <div className="form__grid">
          <Field error={errors.name}>
            <label htmlFor="ea-name">Your name</label>
            <input
              ref={bind("name")}
              id="ea-name"
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
            <label htmlFor="ea-email">Work email</label>
            <input
              ref={bind("email")}
              id="ea-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              aria-invalid={errors.email ? true : undefined}
              value={values.email}
              onChange={onText("email")}
            />
          </Field>
          <Field error={errors.company}>
            <label htmlFor="ea-company">Company</label>
            <input
              ref={bind("company")}
              id="ea-company"
              name="company"
              type="text"
              autoComplete="organization"
              required
              aria-invalid={errors.company ? true : undefined}
              value={values.company}
              onChange={onText("company")}
            />
          </Field>
          <Field error={errors.phone}>
            <label htmlFor="ea-phone">
              Phone <small>(optional)</small>
            </label>
            <input
              ref={bind("phone")}
              id="ea-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              aria-invalid={errors.phone ? true : undefined}
              value={values.phone}
              onChange={onText("phone")}
            />
          </Field>
          <Field full error={errors.team_size}>
            <label id="ea-size-label">How many PCs?</label>
            <ChipGroup
              type="radio"
              name="team_size"
              options={teamSizeOptions}
              selected={values.team_size ? [values.team_size] : []}
              onToggle={(value) => update("team_size", { ...values, team_size: value })}
              labelledBy="ea-size-label"
              required
              firstInputRef={bind("team_size")}
            />
          </Field>
          <Field full error={errors.platforms}>
            <label id="ea-plat-label">Which platforms do you use?</label>
            <ChipGroup
              type="checkbox"
              name="platform"
              options={platformOptions}
              selected={values.platforms}
              onToggle={(value, on) =>
                update("platforms", { ...values, platforms: toggleIn(values.platforms, value, on) })
              }
              labelledBy="ea-plat-label"
              firstInputRef={bind("platforms")}
            />
          </Field>
          <Field full error={errors.concerns}>
            <label id="ea-worry-label">
              What worries you most? <small>(pick any)</small>
            </label>
            <ChipGroup
              type="checkbox"
              name="concern"
              options={concernOptions}
              selected={values.concerns}
              onToggle={(value, on) =>
                update("concerns", { ...values, concerns: toggleIn(values.concerns, value, on) })
              }
              labelledBy="ea-worry-label"
              firstInputRef={bind("concerns")}
            />
          </Field>
        </div>
        <div className="form__foot">
          {formError ? (
            <p className="form__err" role="alert">
              {formError}
            </p>
          ) : null}
          <button className="btn btn--primary btn--lg btn--block" type="submit" disabled={pending} aria-busy={pending}>
            {pending ? (
              "Reserving…"
            ) : (
              <>
                Reserve my spot <span className="arr">→</span>
              </>
            )}
          </button>
          <p className="form__fine">We'll email you once, when your access is ready. No newsletter, no sharing.</p>
        </div>
      </form>
      <FormSuccess active={sent !== null} heading={success.heading} body={success.body} />
    </Reveal>
  );
}
