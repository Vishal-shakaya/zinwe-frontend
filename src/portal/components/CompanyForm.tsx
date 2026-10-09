import { useRef, useState, type FormEvent, type ReactElement } from "react";
import { ChipGroup } from "../../components/forms/ChipGroup";
import { Field } from "../../components/forms/Field";
import { teamSizeOptions } from "../../content/forms";
import { industryOptions } from "../../content/portal";
import {
  ApiError,
  createCompany,
  updateCompany,
  type Company,
  type CompanyField,
  type CompanyPayload,
  type Industry,
  type TeamSize,
} from "../../lib/api";
import {
  compactErrors,
  focusFirstInvalid,
  gstinError,
  normaliseWebsite,
  phoneError,
  pickError,
  requiredError,
  websiteError,
  type FieldErrorMap,
} from "../../lib/validation";
import { apiFieldErrors, apiFormError } from "../failure";
import { FormAlert, FormStatus } from "./FormAlert";

const FIELDS: readonly CompanyField[] = [
  "name",
  "industry",
  "team_size",
  "phone",
  "city",
  "state",
  "country",
  "gstin",
  "website",
];

type Draft = Omit<CompanyPayload, "industry" | "team_size"> & { industry: Industry | ""; team_size: TeamSize | "" };

function draftFrom(company: Company | null | undefined): Draft {
  return {
    name: company?.name ?? "",
    industry: company?.industry ?? "",
    team_size: company?.team_size ?? "",
    phone: company?.phone ?? "",
    city: company?.city ?? "",
    state: company?.state ?? "",
    country: company?.country || "India",
    gstin: company?.gstin ?? "",
    website: company?.website ?? "",
  };
}

function validate(d: Draft): FieldErrorMap<CompanyField> {
  return compactErrors<CompanyField>({
    name: requiredError(d.name),
    industry: pickError(d.industry),
    team_size: pickError(d.team_size),
    phone: phoneError(d.phone),
    city: requiredError(d.city),
    state: requiredError(d.state),
    country: requiredError(d.country),
    gstin: gstinError(d.gstin),
    website: websiteError(d.website),
  });
}

interface CompanyFormProps {
  /** `create` = POST (onboarding), `edit` = PATCH (/app/company). */
  mode: "create" | "edit";
  initial?: Company | null;
  submitLabel: string;
  onSaved: (company: Company) => void | Promise<void>;
  /** 409 on create: the company exists already, so just move on. */
  onConflict?: () => void;
}

/** Company details: required name, industry, team size, phone, city, state; optional GSTIN and website. */
export function CompanyForm({ mode, initial, submitLabel, onSaved, onConflict }: CompanyFormProps): ReactElement {
  const [draft, setDraft] = useState<Draft>(() => draftFrom(initial));
  const [errors, setErrors] = useState<FieldErrorMap<CompanyField>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const controls = useRef<Partial<Record<CompanyField, HTMLElement | null>>>({});

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setSaved(null);
  };
  const reg = (field: CompanyField) => (el: HTMLElement | null) => {
    controls.current[field] = el;
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const clean: Draft = {
      ...draft,
      name: draft.name.trim(),
      phone: draft.phone.trim(),
      city: draft.city.trim(),
      state: draft.state.trim(),
      country: draft.country.trim(),
      gstin: draft.gstin.trim().toUpperCase(),
      website: normaliseWebsite(draft.website),
    };
    const clientErrors = validate(clean);
    setErrors(clientErrors);
    setFormError(null);
    setSaved(null);
    if (Object.keys(clientErrors).length > 0) return focusFirstInvalid(FIELDS, clientErrors, controls.current);

    setPending(true);
    const payload = clean as CompanyPayload;
    try {
      const company = mode === "create" ? await createCompany(payload) : await updateCompany(payload);
      setDraft(draftFrom(company));
      await onSaved(company);
      if (mode === "edit") setSaved("Saved. Your company details are up to date.");
    } catch (error) {
      const fieldErrors = apiFieldErrors(error, FIELDS);
      setErrors(fieldErrors);
      setFormError(apiFormError(error, FIELDS));
      focusFirstInvalid(FIELDS, fieldErrors, controls.current);
      if (mode === "create" && error instanceof ApiError && error.kind === "conflict") onConflict?.();
    } finally {
      setPending(false);
    }
  };

  return (
    <form className="co-form" onSubmit={onSubmit} noValidate>
      <div className="form__grid">
        <Field full error={errors.name}>
          <label htmlFor="co-name">Company name</label>
          <input
            ref={reg("name")}
            id="co-name"
            autoComplete="organization"
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
            aria-invalid={errors.name ? true : undefined}
          />
        </Field>

        <Field error={errors.industry}>
          <label htmlFor="co-industry">Industry</label>
          <select
            ref={reg("industry")}
            id="co-industry"
            value={draft.industry}
            onChange={(e) => set("industry", e.target.value as Industry | "")}
            aria-invalid={errors.industry ? true : undefined}
          >
            <option value="" disabled>
              Choose one
            </option>
            {industryOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        <Field error={errors.phone}>
          <label htmlFor="co-phone">Business phone</label>
          <input
            ref={reg("phone")}
            id="co-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+91 98100 00000"
            value={draft.phone}
            onChange={(e) => set("phone", e.target.value)}
            aria-invalid={errors.phone ? true : undefined}
          />
        </Field>

        <Field full error={errors.team_size}>
          <span className="co-label" id="co-team-label">
            People on your team
          </span>
          <ChipGroup
            type="radio"
            name="team_size"
            options={teamSizeOptions}
            selected={draft.team_size ? [draft.team_size] : []}
            onToggle={(value) => set("team_size", value)}
            labelledBy="co-team-label"
            firstInputRef={reg("team_size")}
          />
        </Field>

        <Field error={errors.city}>
          <label htmlFor="co-city">City</label>
          <input
            ref={reg("city")}
            id="co-city"
            autoComplete="address-level2"
            value={draft.city}
            onChange={(e) => set("city", e.target.value)}
            aria-invalid={errors.city ? true : undefined}
          />
        </Field>

        <Field error={errors.state}>
          <label htmlFor="co-state">State</label>
          <input
            ref={reg("state")}
            id="co-state"
            autoComplete="address-level1"
            value={draft.state}
            onChange={(e) => set("state", e.target.value)}
            aria-invalid={errors.state ? true : undefined}
          />
        </Field>

        <Field error={errors.country}>
          <label htmlFor="co-country">Country</label>
          <input
            ref={reg("country")}
            id="co-country"
            autoComplete="country-name"
            value={draft.country}
            onChange={(e) => set("country", e.target.value)}
            aria-invalid={errors.country ? true : undefined}
          />
        </Field>

        <Field error={errors.gstin}>
          <label htmlFor="co-gstin">
            GSTIN <small>(optional)</small>
          </label>
          <input
            ref={reg("gstin")}
            id="co-gstin"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={15}
            value={draft.gstin}
            onChange={(e) => set("gstin", e.target.value.toUpperCase())}
            aria-invalid={errors.gstin ? true : undefined}
          />
        </Field>

        <Field full error={errors.website}>
          <label htmlFor="co-website">
            Website <small>(optional)</small>
          </label>
          <input
            ref={reg("website")}
            id="co-website"
            type="url"
            inputMode="url"
            autoComplete="url"
            placeholder="verma.in"
            value={draft.website}
            onChange={(e) => set("website", e.target.value)}
            aria-invalid={errors.website ? true : undefined}
          />
        </Field>
      </div>

      <FormAlert message={formError} />
      <FormStatus message={saved} />

      <div className="co-form__foot">
        <button type="submit" className="btn btn--primary" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
          {pending || mode === "edit" ? null : <span className="arr">→</span>}
        </button>
      </div>
    </form>
  );
}
