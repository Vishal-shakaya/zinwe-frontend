import { useRef, useState, type FormEvent, type ReactElement } from "react";
import { teamSizeOptions } from "../../content/forms";
import { COUNTRIES, FREE_REGION_LABEL, POPULAR_COUNTRY_CODES, REGIONS, countryByName } from "../../content/locations";
import { industryOptions } from "../../content/portal";
import { updateCompany, type Company, type CompanyField, type CompanyPayload, type Industry, type TeamSize } from "../../lib/api";
import {
  compactErrors,
  focusFirstInvalid,
  gstinError,
  gstinState,
  normaliseWebsite,
  phoneError,
  pickError,
  requiredError,
  websiteError,
  type FieldErrorMap,
} from "../../lib/validation";
import { apiFieldErrors, apiFormError } from "../../portal/failure";
import { Spinner } from "../ui/States";

/** Focus order, top to bottom. */
const FIELDS: readonly CompanyField[] = ["name", "industry", "team_size", "country", "city", "state", "phone", "website", "gstin"];
const DEFAULT_COUNTRY = "India";
const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/;

type Draft = Omit<CompanyPayload, "industry" | "team_size"> & { industry: Industry | ""; team_size: TeamSize | "" };

const popular = POPULAR_COUNTRY_CODES.map((code) => COUNTRIES.find((c) => c.code === code)).filter(
  (c): c is (typeof COUNTRIES)[number] => Boolean(c),
);

const dialFor = (country: string) => countryByName(country)?.dial ?? "";

/** The phone field holds the local number; a stored "+91 98100 00000" loses its "+91 " here. */
function localPhone(phone: string, country: string): string {
  const dial = dialFor(country);
  const p = phone.trim();
  return dial && p.startsWith(dial) ? p.slice(dial.length).trim() : p;
}

/** What we store: "+91 98100 00000". A number typed with its own "+" code is kept as typed. */
function fullPhone(local: string, country: string): string {
  const p = local.trim();
  if (p === "" || p.startsWith("+")) return p;
  const dial = dialFor(country);
  return dial ? `${dial} ${p}` : p;
}

function draftFrom(c: Company): Draft {
  const country = c.country || DEFAULT_COUNTRY;
  return {
    name: c.name ?? "",
    industry: c.industry ?? "",
    team_size: c.team_size ?? "",
    phone: localPhone(c.phone ?? "", country),
    city: c.city ?? "",
    state: c.state ?? "",
    country,
    gstin: c.gstin ?? "",
    website: c.website ?? "",
  };
}

/**
 * Settings → Company (board DashSettings, Company tab): the same fields and checks as the onboarding company form
 * (PATCH company/), laid out as the board's grid. Login email is read-only.
 */
export function CompanyCard({
  company,
  loginEmail,
  onSaved,
}: {
  company: Company;
  loginEmail: string;
  onSaved: (company: Company) => void | Promise<void>;
}): ReactElement {
  const [draft, setDraft] = useState<Draft>(() => draftFrom(company));
  const [errors, setErrors] = useState<FieldErrorMap<CompanyField>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const controls = useRef<Partial<Record<CompanyField, HTMLElement | null>>>({});
  const reg = (field: CompanyField) => (el: HTMLElement | null) => {
    controls.current[field] = el;
  };

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setToast(null);
    if (errors[key as CompanyField]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const country = countryByName(draft.country);
  const regionSet = country ? REGIONS[country.code] : undefined;
  const isIndia = country?.code === "IN";
  const dial = country?.dial ?? "";

  const changeCountry = (name: string) => {
    const next = countryByName(name);
    const regions = next ? REGIONS[next.code]?.regions : undefined;
    setDraft((d) => ({ ...d, country: name, state: regions && !regions.includes(d.state) ? "" : d.state }));
    setToast(null);
  };

  // A complete GSTIN fills in an empty state (its first two digits are the state's GST code).
  const changeGstin = (raw: string) => {
    const gstin = raw.toUpperCase();
    const from = gstin.length === 15 ? gstinState(gstin) : null;
    setDraft((d) => ({ ...d, gstin, state: d.state === "" && from ? from : d.state }));
    setToast(null);
    if (errors.gstin) setErrors((e) => ({ ...e, gstin: undefined }));
  };

  // Live GSTIN check (board): the hint turns red while it doesn't look right.
  const gst = draft.gstin.trim().toUpperCase();
  const gstLive = gst ? (GSTIN_RE.test(gst) ? gstinError(gst, draft.state) : "That GSTIN doesn’t look right: 15 characters, like 29ABCDE1234F1Z5.") : undefined;
  const gstMsg = errors.gstin ?? gstLive;

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
      gstin: isIndia ? gst : "",
      website: normaliseWebsite(draft.website),
    };
    const clientErrors = compactErrors<CompanyField>({
      name: requiredError(clean.name),
      industry: pickError(clean.industry),
      team_size: pickError(clean.team_size),
      phone: phoneError(clean.phone),
      city: requiredError(clean.city),
      state: requiredError(clean.state),
      country: requiredError(clean.country),
      gstin: gstinError(clean.gstin, clean.state),
      website: websiteError(clean.website),
    });
    setErrors(clientErrors);
    setFormError(null);
    setToast(null);
    if (Object.keys(clientErrors).length > 0) return focusFirstInvalid(FIELDS, clientErrors, controls.current);

    setPending(true);
    try {
      const saved = await updateCompany(clean as CompanyPayload);
      setDraft(draftFrom(saved));
      await onSaved(saved);
      setToast("Company details saved. Employees see the new name within a minute.");
    } catch (error) {
      const fieldErrors = apiFieldErrors(error, FIELDS);
      setErrors(fieldErrors);
      setFormError(apiFormError(error, FIELDS));
      focusFirstInvalid(FIELDS, fieldErrors, controls.current);
    } finally {
      setPending(false);
    }
  };

  const err = (field: CompanyField) =>
    errors[field] ? (
      <span className="zp-err" id={`co-${field}-err`}>
        {errors[field]}
      </span>
    ) : null;
  const inv = (field: CompanyField) =>
    errors[field] ? { "aria-invalid": true as const, "aria-describedby": `co-${field}-err` } : {};

  return (
    <>
      {toast ? (
        <div className="zp-ok" role="status">
          {toast}
        </div>
      ) : null}
      <form className="z-card zp-card" onSubmit={onSubmit} noValidate aria-label="Company details">
        <div className="zp-cogrid">
          <div className="zp-f">
            <label className="zp-lab" htmlFor="cn">
              Company name
            </label>
            <input
              ref={reg("name")}
              id="cn"
              className="zp-inp"
              autoComplete="organization"
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              {...inv("name")}
            />
            {err("name") ?? <span className="zp-k">Employees see this in their Zinwe window.</span>}
          </div>
          <div className="zp-f">
            <label className="zp-lab" htmlFor="le">
              Login email
            </label>
            <input id="le" className="zp-inp" value={loginEmail} disabled />
            <span className="zp-k">To change it, message us from Help &amp; support.</span>
          </div>
          <div className="zp-f">
            <label className="zp-lab" htmlFor="ind">
              Industry
            </label>
            <select
              ref={reg("industry")}
              id="ind"
              className="zp-inp"
              value={draft.industry}
              onChange={(e) => set("industry", e.target.value as Industry | "")}
              {...inv("industry")}
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
            {err("industry")}
          </div>
          <div className="zp-f">
            <label className="zp-lab" htmlFor="tsz">
              Team size
            </label>
            <select
              ref={reg("team_size")}
              id="tsz"
              className="zp-inp"
              value={draft.team_size}
              onChange={(e) => set("team_size", e.target.value as TeamSize | "")}
              {...inv("team_size")}
            >
              <option value="" disabled>
                Choose one
              </option>
              {teamSizeOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label} people
                </option>
              ))}
            </select>
            {err("team_size")}
          </div>
          <div className="zp-f">
            <label className="zp-lab" htmlFor="ctry">
              Country
            </label>
            <select
              ref={reg("country")}
              id="ctry"
              className="zp-inp"
              autoComplete="country-name"
              value={draft.country}
              onChange={(e) => changeCountry(e.target.value)}
              {...inv("country")}
            >
              {!country && draft.country ? <option value={draft.country}>{draft.country}</option> : null}
              <optgroup label="Common">
                {popular.map((c) => (
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
            {err("country")}
          </div>
          <div className="zp-f">
            <label className="zp-lab" htmlFor="city">
              City and state
            </label>
            <div className="zp-pair">
              <input
                ref={reg("city")}
                id="city"
                className="zp-inp"
                autoComplete="address-level2"
                placeholder="City"
                value={draft.city}
                onChange={(e) => set("city", e.target.value)}
                {...inv("city")}
              />
              {regionSet ? (
                <select
                  ref={reg("state")}
                  className="zp-inp"
                  aria-label={regionSet.label}
                  autoComplete="address-level1"
                  value={draft.state}
                  onChange={(e) => set("state", e.target.value)}
                  {...inv("state")}
                >
                  <option value="" disabled>
                    {regionSet.label}
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
                  className="zp-inp"
                  aria-label={FREE_REGION_LABEL}
                  placeholder={FREE_REGION_LABEL}
                  autoComplete="address-level1"
                  value={draft.state}
                  onChange={(e) => set("state", e.target.value)}
                  {...inv("state")}
                />
              )}
            </div>
            {err("city") ?? err("state")}
          </div>
          <div className="zp-f">
            <label className="zp-lab" htmlFor="ph">
              Business phone
            </label>
            <div className={dial ? "zp-phone" : undefined}>
              {dial ? (
                <span className="zp-phone__dial" aria-hidden="true">
                  {dial}
                </span>
              ) : null}
              <input
                ref={reg("phone")}
                id="ph"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                className="zp-inp"
                placeholder={isIndia ? "98100 00000" : "Phone number"}
                value={draft.phone}
                onChange={(e) => set("phone", e.target.value)}
                {...inv("phone")}
              />
            </div>
            {err("phone")}
          </div>
          <div className="zp-f">
            <label className="zp-lab" htmlFor="web">
              Website <span style={{ fontWeight: 400, color: "#6B6459" }}>(optional)</span>
            </label>
            <input
              ref={reg("website")}
              id="web"
              type="url"
              inputMode="url"
              autoComplete="url"
              className="zp-inp"
              placeholder="yourcompany.com"
              value={draft.website}
              onChange={(e) => set("website", e.target.value)}
              {...inv("website")}
            />
            {err("website")}
          </div>
          {isIndia ? (
            <div className="zp-f">
              <label className="zp-lab" htmlFor="gst">
                GSTIN <span style={{ fontWeight: 400, color: "#6B6459" }}>(optional)</span>
              </label>
              <input
                ref={reg("gstin")}
                id="gst"
                className="zp-inp z-mono"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={15}
                placeholder="29ABCDE1234F1Z5"
                value={draft.gstin}
                onChange={(e) => changeGstin(e.target.value)}
                aria-invalid={gstMsg ? true : undefined}
                aria-describedby="gst-hint"
              />
              <span className="zp-k" id="gst-hint" style={{ color: gstMsg ? "#B02A15" : "#6B6459" }}>
                {gstMsg ?? "Add it to claim GST input credit. It must match the state above."}
              </span>
            </div>
          ) : null}
        </div>
        {formError ? (
          <div className="zp-bad" role="alert">
            {formError}
          </div>
        ) : null}
        <div className="zp-save">
          <button type="submit" className={`z-btn pri${pending ? " is-busy" : ""}`} disabled={pending}>
            {pending ? <Spinner size={16} tone="on-orange" /> : null}
            {pending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </>
  );
}
