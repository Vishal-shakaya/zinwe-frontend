import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  errorMessage,
  WEB_CATEGORIES,
  type DataTransferPolicy,
  type PolicyUpdate,
  type RemoteSoftwarePolicy,
  type UsbMode,
  type UsbPolicy,
  type WebCategory,
  type WebMode,
  type WebPolicy,
} from "../../lib/api";
import { cx } from "../../lib/cx";
import { DashIcon, type DashIconName } from "../components/DashIcon";
import { normalizeDomain, normalizeExe } from "./policyText";
import { KNOWN_REMOTE_TOOLS, knownTool } from "./remoteTools";
import type { CommitPolicy } from "./usePolicy";

/**
 * The four per-feature policy control panels, lifted out of the old Setup page
 * so the feature pages (/app/internet, /app/data, /app/remote) and the Setup
 * page can all render the same, single source of truth.
 */

const MB = 1_048_576;

function bytesToMb(bytes: number): number {
  return Math.max(1, Math.round(bytes / MB));
}

function mbToBytes(mb: number): number {
  return Math.max(1, Math.round(mb)) * MB;
}

const CATEGORY_LABELS: Record<WebCategory, string> = {
  adult: "Adult content",
  gambling: "Gambling",
  malware: "Malware",
  phishing: "Phishing & scams",
};

// ---------------------------------------------------------------------------
// Per-card draft + save
// ---------------------------------------------------------------------------

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

interface Draft<T> {
  draft: T;
  dirty: boolean;
  saving: boolean;
  error: string | null;
  justSaved: boolean;
  set: (patch: Partial<T>) => void;
  undo: () => void;
  save: () => void;
}

function useDraft<T extends object>(key: keyof PolicyUpdate, block: T, commit: CommitPolicy): Draft<T> {
  const serialized = useMemo(() => JSON.stringify(block), [block]);
  const base = useRef(serialized);
  const [draft, setDraft] = useState<T>(block);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (base.current !== serialized) {
      base.current = serialized;
      setDraft(block);
    }
  }, [serialized, block]);

  const set = (patch: Partial<T>) => {
    setError(null);
    setJustSaved(false);
    setDraft((current) => ({ ...current, ...patch }));
  };

  const undo = () => {
    setError(null);
    setJustSaved(false);
    setDraft(block);
  };

  const dirty = !sameJson(draft, block);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await commit({ [key]: draft } as PolicyUpdate);
      setJustSaved(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return { draft, dirty, saving, error, justSaved, set, undo, save };
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function CardShell({
  icon,
  title,
  sub,
  titleId,
  children,
}: {
  icon: DashIconName;
  title: string;
  sub: string;
  titleId: string;
  children: ReactNode;
}): ReactElement {
  return (
    <section className="dash-card" aria-labelledby={titleId}>
      <div className="dash-card__head dash-card__head--row">
        <span className="dash-card__ico" aria-hidden="true">
          <DashIcon name={icon} />
        </span>
        <div>
          <h2 className="dash-card__title" id={titleId}>
            {title}
          </h2>
          <p className="dash-card__sub">{sub}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function SaveBar<T extends object>({
  draft,
  savedMessage,
  saveVerb = "Save changes",
}: {
  draft: Draft<T>;
  savedMessage: string;
  saveVerb?: string;
}): ReactElement {
  return (
    <>
      {draft.error ? (
        <p className="form__err" role="alert">
          {draft.error}
        </p>
      ) : null}
      {/* One save-state line at a time: just saved, unsaved changes, or all saved (J5-26). */}
      {draft.justSaved && !draft.dirty ? (
        <p className="dash-banner dash-banner--ok" role="status">
          <DashIcon name="check" />
          <span>{savedMessage} PCs pick this up within about a minute.</span>
        </p>
      ) : draft.dirty || draft.saving ? (
        <div className="dash-savebar">
          <p className="dash-savebar__meta">You have unsaved changes.</p>
          <div className="dash-savebar__actions">
            <button type="button" className="btn btn--ghost dash-btn-sm" onClick={draft.undo} disabled={draft.saving}>
              Undo
            </button>
            <button type="submit" className="btn btn--primary dash-btn-sm" disabled={draft.saving}>
              {draft.saving ? "Saving…" : saveVerb}
            </button>
          </div>
        </div>
      ) : (
        <div className="dash-savebar">
          <p className="dash-savebar__meta">
            <DashIcon name="check" /> All changes saved.
          </p>
        </div>
      )}
    </>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: ReactNode;
  disabled?: boolean;
}): ReactElement {
  return (
    <label className={cx("dash-toggle", disabled && "is-disabled")}>
      <span className="dash-toggle__text">
        <span className="dash-toggle__label">{label}</span>
        {description ? <span className="dash-toggle__desc">{description}</span> : null}
      </span>
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className={cx("dash-switch", checked && "is-on")} aria-hidden="true">
        <span className="dash-switch__thumb" />
      </span>
    </label>
  );
}

function ListEditor({
  legend,
  placeholder,
  addLabel,
  items,
  onChange,
  normalize,
  empty,
  invalid = "That doesn't look right — check it and try again.",
  disabled = false,
  inputMode = "text",
  seed = "",
  suggestions,
}: {
  legend: string;
  placeholder: string;
  addLabel: string;
  items: string[];
  onChange: (items: string[]) => void;
  normalize?: (raw: string) => string;
  empty: string;
  invalid?: string;
  disabled?: boolean;
  inputMode?: "url" | "text";
  /** Pre-fills the add box once (e.g. a domain carried over from an alert). */
  seed?: string;
  /** Known values to pick from with one click (those not on the list yet), and to suggest while typing. */
  suggestions?: readonly string[];
}): ReactElement {
  const listId = useId();
  const offered = (suggestions ?? []).filter((s) => !items.some((item) => item.toLowerCase() === s.toLowerCase()));
  const [value, setValue] = useState(seed);
  const [note, setNote] = useState<string | null>(null);

  const add = () => {
    const normalized = normalize ? normalize(value) : value.trim();
    if (!normalized) {
      setNote(value.trim() ? invalid : null);
      return;
    }
    if (items.some((item) => item.toLowerCase() === normalized.toLowerCase())) {
      setNote("That's already on the list.");
      setValue("");
      return;
    }
    onChange([...items, normalized]);
    setValue("");
    setNote(null);
  };

  return (
    <div className={cx("dash-list", disabled && "is-disabled")}>
      <span className="dash-list__legend">{legend}</span>
      <div className="dash-list__add">
        <input
          type="text"
          inputMode={inputMode}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={Boolean(seed)}
          aria-label={legend}
          list={suggestions ? listId : undefined}
          onChange={(e) => {
            setValue(e.target.value);
            setNote(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className="btn btn--ghost dash-btn-sm" onClick={add} disabled={disabled || !value.trim()}>
          {addLabel}
        </button>
        {suggestions ? (
          <datalist id={listId}>
            {offered.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        ) : null}
      </div>
      {offered.length > 0 ? (
        <div className="dash-list__picks" role="group" aria-label={`${legend}: pick one`}>
          {offered.slice(0, 6).map((s) => (
            <button
              key={s}
              type="button"
              className="dash-pick"
              disabled={disabled}
              onClick={() => {
                onChange([...items, s]);
                setNote(null);
              }}
            >
              <DashIcon name="plus" />
              {s}
            </button>
          ))}
        </div>
      ) : null}
      {note ? (
        <p className="dash-list__note" role="alert">
          {note}
        </p>
      ) : null}
      {items.length > 0 ? (
        <ul className="dash-tags">
          {items.map((item) => (
            <li key={item} className="dash-tag">
              <span className="dash-mono">{item}</span>
              <button
                type="button"
                className="dash-tag__x"
                disabled={disabled}
                aria-label={`Remove ${item}`}
                onClick={() => onChange(items.filter((other) => other !== item))}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="dash-list__empty">{empty}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// USB
// ---------------------------------------------------------------------------

const USB_OPTIONS: ReadonlyArray<{ mode: UsbMode; label: string; summary: string; detail: string }> = [
  {
    mode: "allow",
    label: "Allow",
    summary: "USB drives work normally.",
    detail: "Zinwe still notes every drive that's plugged in, so you can see it under Alerts.",
  },
  {
    mode: "read_only",
    label: "Read-only",
    summary: "People can open files from a USB drive but can't copy anything onto it.",
    detail: "Stops company files leaving on a pen drive, while still letting staff open what they're sent.",
  },
  {
    mode: "block",
    label: "Block",
    summary: "USB drives don't open at all.",
    detail: "The strictest setting. Each attempt to use a drive shows up under Alerts.",
  },
];

function usbLabel(mode: UsbMode): string {
  return USB_OPTIONS.find((o) => o.mode === mode)?.label ?? mode;
}

export function UsbCard({ block, commit }: { block: UsbPolicy; commit: CommitPolicy }): ReactElement {
  const draft = useDraft<UsbPolicy>("usb", block, commit);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        draft.save();
      }}
    >
      <CardShell
        icon="usb"
        title="USB drives"
        sub="Pen drives and external hard disks. Keyboards, mice and chargers are never affected."
        titleId="usb-title"
      >
        <fieldset className="dash-choices" disabled={draft.saving}>
          <legend className="dash-sr">What should PCs do with USB drives?</legend>
          {USB_OPTIONS.map((option) => {
            const checked = draft.draft.mode === option.mode;
            const current = block.mode === option.mode;
            return (
              <label key={option.mode} className={cx("dash-choice", checked && "is-on")}>
                <input type="radio" name="usb-mode" value={option.mode} checked={checked} onChange={() => draft.set({ mode: option.mode })} />
                <span className="dash-choice__radio" aria-hidden="true" />
                <span className="dash-choice__text">
                  <span className="dash-choice__label">
                    {option.label}
                    {current ? <em className="dash-pill">Active now</em> : null}
                  </span>
                  <span className="dash-choice__summary">{option.summary}</span>
                  <span className="dash-choice__detail">{option.detail}</span>
                </span>
              </label>
            );
          })}
        </fieldset>
        <SaveBar draft={draft} saveVerb={`Save: ${usbLabel(draft.draft.mode)}`} savedMessage={`"${usbLabel(block.mode)}" is now the USB rule.`} />
      </CardShell>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Website
// ---------------------------------------------------------------------------

const WEB_MODES: ReadonlyArray<{ mode: WebMode; label: string; summary: string }> = [
  { mode: "monitor", label: "Watch only", summary: "See which sites are visited, here on Online protection. Nothing is blocked." },
  { mode: "block", label: "Block & watch", summary: "Block the categories and sites you pick below, and keep a record of the rest." },
];

export function WebsiteCard({
  block,
  commit,
  focusDomain,
}: {
  block: WebPolicy;
  commit: CommitPolicy;
  /** A domain to pre-fill the custom-sites box with (from an alert's "Block" action). */
  focusDomain?: string;
}): ReactElement {
  const draft = useDraft<WebPolicy>("web", block, commit);
  const { enabled, mode, categories, custom_domains } = draft.draft;
  const blocking = mode === "block";

  const toggleCategory = (category: WebCategory) => {
    draft.set({
      categories: categories.includes(category) ? categories.filter((c) => c !== category) : [...categories, category],
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        draft.save();
      }}
    >
      <CardShell icon="globe" title="Websites" sub="Keep a record of the sites staff visit, and optionally block risky ones." titleId="web-title">
        <Toggle
          checked={enabled}
          onChange={(next) => draft.set({ enabled: next })}
          label="Website protection"
          description={enabled ? "On — Zinwe is watching web activity." : "Off — no website activity is recorded or blocked."}
        />

        <fieldset className="dash-set__group" disabled={!enabled || draft.saving}>
          <legend className="dash-set__legend">How should sites be handled?</legend>
          <div className="dash-choices">
            {WEB_MODES.map((option) => {
              const checked = mode === option.mode;
              return (
                <label key={option.mode} className={cx("dash-choice", checked && "is-on")}>
                  <input type="radio" name="web-mode" value={option.mode} checked={checked} onChange={() => draft.set({ mode: option.mode })} />
                  <span className="dash-choice__radio" aria-hidden="true" />
                  <span className="dash-choice__text">
                    <span className="dash-choice__label">{option.label}</span>
                    <span className="dash-choice__summary">{option.summary}</span>
                  </span>
                </label>
              );
            })}
          </div>

          <div className={cx("dash-set__sub", !blocking && "is-muted")}>
            <p className="dash-note">
              {blocking
                ? "Pick the kinds of sites to block. These apply only in “Block & watch”."
                : "The category and site lists below take effect only in “Block & watch” mode — you can set them up now and switch on blocking later."}
            </p>
            <div className="dash-checks" role="group" aria-label="Site categories to block">
              {WEB_CATEGORIES.map((category) => {
                const checked = categories.includes(category);
                return (
                  <label key={category} className={cx("dash-check", checked && "is-on")}>
                    <input type="checkbox" checked={checked} onChange={() => toggleCategory(category)} />
                    <span className="dash-check__box" aria-hidden="true">
                      <DashIcon name="check" />
                    </span>
                    <span>{CATEGORY_LABELS[category]}</span>
                  </label>
                );
              })}
            </div>

            <ListEditor
              legend="Also block these specific sites"
              placeholder="example.com"
              addLabel="Add site"
              inputMode="url"
              items={custom_domains}
              onChange={(next) => draft.set({ custom_domains: next })}
              normalize={normalizeDomain}
              invalid="Enter a website address like example.com."
              empty="No specific sites added. Add a web address to always block it."
              seed={focusDomain}
            />
          </div>
        </fieldset>

        <SaveBar draft={draft} savedMessage="Your website settings are saved." />
      </CardShell>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Data transfer
// ---------------------------------------------------------------------------

function MbField({
  id,
  label,
  hint,
  bytes,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  bytes: number;
  disabled: boolean;
  onChange: (bytes: number) => void;
}): ReactElement {
  return (
    <div className="field">
      <label htmlFor={id}>
        {label} <small>{hint}</small>
      </label>
      <div className="dash-mb">
        <input
          id={id}
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          disabled={disabled}
          value={bytesToMb(bytes)}
          onChange={(e) => {
            const mb = Number(e.target.value);
            if (Number.isFinite(mb) && mb >= 1) onChange(mbToBytes(mb));
          }}
        />
        <span className="dash-mb__unit">MB</span>
      </div>
    </div>
  );
}

export function DataTransferCard({ block, commit }: { block: DataTransferPolicy; commit: CommitPolicy }): ReactElement {
  const draft = useDraft<DataTransferPolicy>("data_transfer", block, commit);
  const { enabled, usb_warn_bytes, lan_warn_bytes, email_warn_bytes, include_details, usb_lockdown } = draft.draft;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        draft.save();
      }}
    >
      <CardShell
        icon="swap"
        title="Data-transfer limits"
        sub="Set a size limit per route. A single transfer over the limit is flagged for you under Alerts."
        titleId="data-title"
      >
        <Toggle
          checked={enabled}
          onChange={(next) => draft.set({ enabled: next })}
          label="Data-transfer limits"
          description={enabled ? "On — transfers over your limit are flagged." : "Off — large transfers are not flagged."}
        />

        <fieldset className="dash-set__group" disabled={!enabled || draft.saving}>
          <legend className="dash-set__legend">Limit a single transfer to…</legend>
          <div className="dash-mb-grid">
            <MbField id="dt-usb" label="To a USB drive" hint="copying files onto a pen drive" bytes={usb_warn_bytes} disabled={!enabled || draft.saving} onChange={(bytes) => draft.set({ usb_warn_bytes: bytes })} />
            <MbField id="dt-lan" label="To a network share" hint="another PC or shared folder" bytes={lan_warn_bytes} disabled={!enabled || draft.saving} onChange={(bytes) => draft.set({ lan_warn_bytes: bytes })} />
            <MbField id="dt-email" label="By email" hint="attachments sent out" bytes={email_warn_bytes} disabled={!enabled || draft.saving} onChange={(bytes) => draft.set({ email_warn_bytes: bytes })} />
          </div>

          <Toggle
            checked={usb_lockdown}
            onChange={(next) => draft.set({ usb_lockdown: next })}
            label="Lock USB to read-only when a copy goes over the limit"
            description="When a single copy to a USB drive goes over your USB limit above, Zinwe switches that PC's USB to read-only straight away and alerts you. It can't undo what was already copied, but it stops anything more. To give USB back, press Restore USB on the alert or on that person's card in Team & devices."
            disabled={!enabled || draft.saving}
          />

          <Toggle
            checked={include_details}
            onChange={(next) => draft.set({ include_details: next })}
            label="Include file names in alerts"
            description="Off by default for privacy: Zinwe records only the size and where it went. Turn this on to also record file names and email subjects — only do this if your staff know and your policy allows it."
            disabled={!enabled || draft.saving}
          />
        </fieldset>

        <SaveBar draft={draft} savedMessage="Your data-transfer settings are saved." />
      </CardShell>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Remote software
// ---------------------------------------------------------------------------

export function RemoteSoftwareCard({
  block,
  commit,
  focusTool,
}: {
  block: RemoteSoftwarePolicy;
  commit: CommitPolicy;
  /** "Block AnyDesk" from an alert: the tool is added to the block list (and blocking switched on), ready to save. */
  focusTool?: string;
}): ReactElement {
  const draft = useDraft<RemoteSoftwarePolicy>("remote_software", block, commit);
  const { enabled, blocking_enabled, blocked_tools, extra_tool_executables } = draft.draft;
  const tool = focusTool ? (knownTool(focusTool) ?? focusTool.trim()) : "";
  const alreadyBlocked =
    Boolean(tool) && block.enabled && block.blocking_enabled && block.blocked_tools.some((t) => t.toLowerCase() === tool.toLowerCase());
  const seeded = useRef(false);
  const { set } = draft;
  useEffect(() => {
    if (seeded.current || !tool) return;
    seeded.current = true;
    document.getElementById("remote-title")?.scrollIntoView({ block: "center" });
    if (alreadyBlocked) return;
    set({
      enabled: true,
      blocking_enabled: true,
      blocked_tools: block.blocked_tools.some((t) => t.toLowerCase() === tool.toLowerCase())
        ? block.blocked_tools
        : [...block.blocked_tools, tool],
    });
  }, [tool, alreadyBlocked, block.blocked_tools, set]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        draft.save();
      }}
    >
      <CardShell
        icon="screen"
        title="Remote-control software"
        sub="Tools like AnyDesk or TeamViewer that let someone control a PC from elsewhere."
        titleId="remote-title"
      >
        <Toggle
          checked={enabled}
          onChange={(next) => draft.set({ enabled: next })}
          label="Watch for remote-control tools"
          description={enabled ? "On — every time one runs, it's recorded under Alerts." : "Off — remote tools are not recorded."}
        />

        {tool && draft.dirty ? (
          <p className="dash-banner dash-banner--info" role="status">
            <DashIcon name="shield" />
            <span>
              <b>{tool} is added to the block list below.</b> Press “Save changes” to close it whenever it starts on any PC.
            </span>
          </p>
        ) : tool && alreadyBlocked ? (
          <p className="dash-banner dash-banner--ok" role="status">
            <DashIcon name="check" />
            <span>{tool} is already blocked on every PC.</span>
          </p>
        ) : null}

        <fieldset className="dash-set__group" disabled={!enabled || draft.saving}>
          <legend className="dash-sr">Remote-tool blocking and lists</legend>
          <Toggle
            checked={blocking_enabled}
            onChange={(next) => draft.set({ blocking_enabled: next })}
            label="Block the tools listed below"
            description={blocking_enabled ? "On — listed tools are closed when they start." : "Off — tools are only recorded, not blocked."}
            disabled={!enabled || draft.saving}
          />

          <ListEditor
            legend="Tools to block when seen"
            placeholder="AnyDesk"
            addLabel="Add tool"
            items={blocked_tools}
            onChange={(next) => draft.set({ blocked_tools: next })}
            normalize={(raw) => knownTool(raw) ?? raw.trim()}
            suggestions={KNOWN_REMOTE_TOOLS}
            empty="No tools listed yet. Pick one above or type its name."
            disabled={!enabled || draft.saving}
          />

          <ListEditor
            legend="Extra programs to treat as remote tools"
            placeholder="myremote"
            addLabel="Add program"
            items={extra_tool_executables}
            onChange={(next) => draft.set({ extra_tool_executables: next })}
            normalize={normalizeExe}
            empty="Optional. Add a program's file name (without .exe) if Zinwe doesn't already know it."
            disabled={!enabled || draft.saving}
          />
        </fieldset>

        <p className="dash-note dash-set__foot">
          Zinwe always detects these tools while this feature is on. It can see that a remote session is running, but it cannot read what happens inside the tool's own encrypted connection.
        </p>

        <SaveBar draft={draft} savedMessage="Your remote-software settings are saved." />
      </CardShell>
    </form>
  );
}
