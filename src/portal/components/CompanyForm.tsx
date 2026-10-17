import { useRef, useState, type FormEvent, type ReactElement } from "react";
import { ChipGroup } from "../../components/forms/ChipGroup";
import { Field } from "../../components/forms/Field";
import { teamSizeOptions } from "../../content/forms";
import {
  COUNTRIES,
  FREE_REGION_LABEL,
  POPULAR_COUNTRY_CODES,
  REGIONS,
  countryByName,
} from "../../content/locations";
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
  GSTIN_EXAMPLE,
  gstinError,
  gstinState,
  normaliseWebsite,
  phoneError,
  pickError,
  requiredError,
  websiteError,
  type FieldErrorMap,
} from "../../lib/validation";
import { apiFieldErrors, apiFormError } from "../failure";
import { FormAlert, FormStatus } from "./FormAlert";

/** Visual (and focus) order of the form, top to bottom. */
const FIELDS: readonly CompanyField[] = [
  "name",
  "industry",
  "team_size",
  "country",
  "state",
  "city",
  "phone",
  "website",
  "gstin",
];

const DEFAULT_COUNTRY = "India";

type Draft = Omit<CompanyPayload, "industry" | "team_size"> & { industry: Industry | ""; team_size: TeamSize | "" };

const popularCountries = POPULAR_COUNTRY_CODES.map((code) => COUNTRIES.find((c) => c.code === code)!).filter(Boolean);

/** Dialling code for a country name ("" when unknown). */
function dialFor(countryName: string): string {
  return countryByName(countryName)?.dial ?? "";
}

/** The phone field holds the local number; a stored "+91 98100 00000" loses its "+91 " here. */
function localPhone(phone: string, countryName: string): string {
  const dial = dialFor(countryName);
  const p = phone.trim();
  return dial && p.startsWith(dial) ? p.slice(dial.length).trim() : p;
}

/** What we store: "+91 98100 00000". A number typed with its own "+" code is kept as typed. */
function fullPhone(local: string, countryName: string): string {
  const p = local.trim();
  if (p === "" || p.startsWith("+")) return p;
  const dial = dialFor(countryName);
  return dial ? `${dial} ${p}` : p;
}

function draftFrom(company: Company | null | undefined): Draft {
  const country = company?.country || DEFAULT_COUNTRY;
  return {
    name: company?.name ?? "",
    industry: company?.industry ?? "",
    team_size: company?.team_size ?? "",
    phone: localPhone(company?.phone ?? "", country),
    city: company?.city ?? "",
    state: company?.state ?? "",
    country,
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
    gstin: gstinError(d.gstin, d.state),
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
  /** Edit mode: the email the owner signs in with, shown read-only with the company. */
  loginEmail?: string;
}

/** Company details: required name, industry, team size, phone, city, state; optional GSTIN and website. */
export function CompanyForm({ mode, initial, submitLabel, onSaved, onConflict, loginEmail }: CompanyFormProps): ReactElement {
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

  const country = countryByName(draft.country);
  const regionSet = country ? REGIONS[country.code] : undefined;
  const regionLabel = regionSet?.label ?? FREE_REGION_LABEL;
  const isIndia = country?.code === "IN";
  const dial = country?.dial ?? "";

  // A new country brings its own regions: keep the state only if it still exists there.
  const changeCountry = (name: string) => {
    const next = countryByName(name);
    const regions = next ? REGIONS[next.code]?.regions : undefined;
    setDraft((d) => ({
      ...d,
      country: name,
      state: regions && !regions.includes(d.state) ? "" : d.state,
    }));
    setSaved(null);
  };

  // A complete GSTIN fills in an empty state (its first two digits are the state's GST code).
  const changeGstin = (raw: string) => {
    const gstin = raw.toUpperCase();
    const from = gstin.length === 15 ? gstinState(gstin) : null;
    setDraft((d) => ({ ...d, gstin, state: d.state === "" && from ? from : d.state }));
    setSaved(null);
    if (errors.gstin) setErrors((e) => ({ ...e, gstin: undefined }));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const clean: Draft = {
      ...draft,
      name: draft.name.trim(),
      phone: fullPhone(draft.phone, draft.country),
      city: draft.city.trim(),
      state: draft.state.trim(),
      country: draft.country.trim(),
      // GSTIN is an Indian tax ID; other countries never send one.
      gstin: isIndia ? draft.gstin.trim().toUpperCase() : "",
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

  // A saved country that isn't in our list (older free-text data) stays selectable.
  const knownCountry = Boolean(country);

  return (
    <form className="co-form" onSubmit={onSubmit} noValidate>
      {/* 1. The business */}
      <fieldset className="co-section">
        <legend className="co-section__title">Company</legend>
        <div className="form__grid">
          <Field full error={errors.name}>
            <label htmlFor="co-name">Company name</label>
            <input
              ref={reg("name")}
              id="co-name"
              autoComplete="organization"
              placeholder="e.g. Verma Textiles Pvt Ltd"
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              aria-invalid={errors.name ? true : undefined}
            />
          </Field>

          {mode === "edit" && loginEmail ? (
            <Field full>
              <label htmlFor="co-login-email">Login email</label>
              <input
                id="co-login-email"
                type="email"
                value={loginEmail}
                readOnly
                aria-describedby="co-login-email-note"
                className="co-readonly"
              />
              <small className="co-note" id="co-login-email-note">
                You sign in to Zinwe with this email, and we send your account emails to it. To change it, message us from
                Support.
              </small>
            </Field>
          ) : null}

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
                Choose an industry
              </option>
              {industryOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>

          <Field error={errors.team_size}>
            <span className="co-label" id="co-team-label">
              Team size
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
        </div>
      </fieldset>

      {/* 2. Where it is and how to reach it: country first, its regions follow. */}
      <fieldset className="co-section">
        <legend className="co-section__title">Location and contact</legend>
        <div className="form__grid">
          <Field error={errors.country}>
            <label htmlFor="co-country">Country</label>
            <select
              ref={reg("country")}
              id="co-country"
              autoComplete="country-name"
              value={draft.country}
              onChange={(e) => changeCountry(e.target.value)}
              aria-invalid={errors.country ? true : undefined}
            >
              {!knownCountry && draft.country ? <option value={draft.country}>{draft.country}</option> : null}
              <optgroup label="Common">
                {popularCountries.map((c) => (
                  <option key={`p-${c.code}`} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="All countries">
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </Field>

          <Field error={errors.state}>
            <label htmlFor="co-state">{regionLabel}</label>
            {regionSet ? (
              <select
                ref={reg("state")}
                id="co-state"
                autoComplete="address-level1"
                value={draft.state}
                onChange={(e) => set("state", e.target.value)}
                aria-invalid={errors.state ? true : undefined}
              >
                <option value="" disabled>
                  Choose one
                </option>
                {regionSet.regions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            ) : (
              <input
                ref={reg("state")}
                id="co-state"
                autoComplete="address-level1"
                value={draft.state}
                onChange={(e) => set("state", e.target.value)}
                aria-invalid={errors.state ? true : undefined}
              />
            )}
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

          <Field error={errors.phone}>
            <label htmlFor="co-phone">Business phone</label>
            <div className={dial ? "co-phone" : undefined}>
              {dial ? (
                <span className="co-phone__dial" aria-hidden="true">
                  {dial}
                </span>
              ) : null}
              <input
                ref={reg("phone")}
                id="co-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder={isIndia ? "98100 00000" : "Phone number"}
                aria-describedby={dial ? "co-phone-dial" : undefined}
                value={draft.phone}
                onChange={(e) => set("phone", e.target.value)}
                aria-invalid={errors.phone ? true : undefined}
              />
              {dial ? (
                <span id="co-phone-dial" className="dash-sr">
                  Country code {dial} is added automatically.
                </span>
              ) : null}
            </div>
          </Field>
        </div>
      </fieldset>

      {/* 3. Nice to have */}
      <fieldset className="co-section">
        <legend className="co-section__title">
          Online and tax <small>(optional)</small>
        </legend>
        <div className="form__grid">
          <Field full={!isIndia} error={errors.website}>
            <label htmlFor="co-website">Website</label>
            <input
              ref={reg("website")}
              id="co-website"
              type="url"
              inputMode="url"
              autoComplete="url"
              placeholder="yourcompany.com"
              value={draft.website}
              onChange={(e) => set("website", e.target.value)}
              aria-invalid={errors.website ? true : undefined}
            />
          </Field>

          {isIndia ? (
            <Field error={errors.gstin}>
              <label htmlFor="co-gstin">GSTIN</label>
              <input
                ref={reg("gstin")}
                id="co-gstin"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={15}
                placeholder={GSTIN_EXAMPLE}
                value={draft.gstin}
                onChange={(e) => changeGstin(e.target.value)}
                aria-invalid={errors.gstin ? true : undefined}
                aria-describedby="co-gstin-hint"
              />
              <p className="field__hint" id="co-gstin-hint">
                Optional. Add it to get GST input credit on your invoice. It must be from the state you picked.
              </p>
            </Field>
          ) : null}
        </div>
      </fieldset>

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
