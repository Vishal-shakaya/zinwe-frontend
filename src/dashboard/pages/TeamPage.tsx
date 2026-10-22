import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactElement } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { paymentInCheck } from "../../auth/steps";
import { usePageMeta } from "../../hooks/usePageMeta";
import {
  createMember,
  deactivateMember,
  errorMessage,
  getMemberTags,
  listDevices,
  listMembers,
  MEMBER_ROLES,
  rotateMemberId,
  setMemberRole,
  type Device,
  type Member,
  type MemberField,
  type MemberRole,
  type MemberTag,
} from "../../lib/api";
import { cx } from "../../lib/cx";
import { AGENT_MSI_URL } from "../../content/download";
import { useChatBubble } from "../features/chatBubble";
import { Toast } from "../components/Toast";
import { compactErrors, emailError, focusFirstInvalid, requiredError, type FieldErrorMap } from "../../lib/validation";
import { apiFieldErrors, apiFormError } from "../../portal/failure";
import { Field } from "../../components/forms/Field";
import { FormAlert } from "../../portal/components/FormAlert";
import { CopyButton } from "../components/CopyButton";
import { CopyDetails } from "../components/CopyDetails";
import { buildInviteText } from "../features/invite";
import { copyText } from "../../lib/clipboard";
import { DashIcon } from "../components/DashIcon";
import { MemberChatThread, SendMessageForm } from "../components/MemberChat";
import { MemberUsage } from "../components/MemberUsage";
import { Modal } from "../components/Modal";
import { EmptyState, ErrorState, LoadingState, PageHeader, RefreshButton, StaleBanner } from "../components/States";
import { useEntitlements } from "../features/entitlements";
import {
  consentOf,
  consentReminder,
  formatDuration,
  PRESENCE_CLASS,
  PRESENCE_LABEL,
  presenceOf,
} from "../features/memberStatus";
import { UsbRestore } from "../components/UsbRestore";
import { formatDateTime, formatRelative, useNow } from "../time";
import { useResource } from "../useResource";
import { formatDate } from "../../lib/format";

const MEMBER_FIELDS: readonly MemberField[] = ["name", "email"];

/** Active members first, then deactivated; each group newest first. */
function sortMembers(members: Member[]): Member[] {
  return [...members].sort(
    (a, b) =>
      Number(b.is_active) - Number(a.is_active) ||
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export default function TeamPage(): ReactElement {
  usePageMeta({
    title: "Team & devices — Zinwe",
    description: "Everyone on your team, their PC and how much it's used — and an ID to connect each PC.",
  });

  const { account, refresh } = useAuth();
  const companyName = account?.company?.name ?? null;
  const { maxDevices, planName, upgradeFor } = useEntitlements();
  const upgradeInCheck = paymentInCheck(account?.subscription);

  // Someone added but not connected yet: check every 10 s so their card flips to Online by itself (J5-10).
  const [waiting, setWaiting] = useState(false);
  const pollMs = waiting ? 10_000 : 60_000;
  const load = useCallback((signal: AbortSignal) => listMembers(signal), []);
  const members = useResource(load, { pollMs });
  const loadDevices = useCallback((signal: AbortSignal) => listDevices(signal), []);
  const devices = useResource(loadDevices, { pollMs });
  // FR-19: playful tags from each person's week (a nice-to-have: failures just hide them).
  const loadTags = useCallback((signal: AbortSignal) => getMemberTags(signal), []);
  const tags = useResource(loadTags);
  const someoneWaiting = (members.data ?? []).some((m) => m.is_active && !m.device);
  if (someoneWaiting !== waiting) setWaiting(someoneWaiting);

  // Tour → "Add your first person" lands on /app/team?add=1: open the add dialog straight away.
  const [params, setParams] = useSearchParams();
  const [adding, setAdding] = useState(() => params.get("add") === "1");
  useEffect(() => {
    if (params.get("add") !== "1") return;
    const next = new URLSearchParams(params);
    next.delete("add");
    setParams(next, { replace: true });
  }, [params, setParams]);
  const [created, setCreated] = useState<Member | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const clearToast = useCallback(() => setToast(null), []);

  const current = members.data ?? [];

  const onCreated = (member: Member) => {
    members.setData([member, ...current.filter((m) => m.id !== member.id)]);
    setCreated(member);
  };
  const onUpdated = (member: Member) => {
    members.setData(current.map((m) => (m.id === member.id ? member : m)));
    if (created?.id === member.id) setCreated(member);
  };
  // Removed: the PC count and the plan's free slots update at once, with a short confirmation (J5-17).
  const onRemoved = (member: Member) => {
    onUpdated(member);
    devices.reload();
    void refresh();
    const slotsFree = maxDevices > 0 && member.device ? Math.max(0, maxDevices - (pcsUsed - 1)) : null;
    const first = member.name.trim().split(/\s+/)[0] || member.name;
    setToast(
      slotsFree !== null
        ? `${first} removed. ${slotsFree} PC ${slotsFree === 1 ? "slot" : "slots"} free.`
        : `${first} removed from your team.`,
    );
  };
  const closeAdd = () => {
    setAdding(false);
    setCreated(null);
  };

  const list = members.data ? sortMembers(members.data) : [];
  const active = list.filter((m) => m.is_active);
  const removed = list.filter((m) => !m.is_active);
  const live = (devices.data ?? []).filter((d) => !d.is_revoked);
  // Pair each PC with its person by member_id; older backends only sent the name, so fall back to that.
  const deviceOf = (member: Member) =>
    live.find((d) =>
      d.member_id != null
        ? d.member_id === member.id
        : d.member_name === member.name && d.hostname === member.device?.hostname,
    );
  // PCs connected before per-person IDs existed have no member; keep them visible.
  const unassigned = live.filter((d) => !d.member_id && !d.member_name);
  const online = active.filter((m) => m.device?.is_online).length;
  const notConnected = active.filter((m) => !m.device).length;

  // Plan enforcement: a new PC is refused once every slot on the plan is taken (existing PCs keep working).
  const pcsUsed = live.length;
  const pcsFull = maxDevices > 0 && devices.data !== undefined && pcsUsed >= maxDevices;
  const biggerPlan = upgradeFor("work_time") ?? upgradeFor("usb_control");
  const summary = [
    `${active.length} ${active.length === 1 ? "person" : "people"}`,
    `${online} online now`,
    notConnected > 0 ? `${notConnected} not connected yet` : null,
    maxDevices > 0 ? `${pcsUsed} of ${maxDevices} PCs on your plan` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <PageHeader
        title="Team & devices"
        lede="Everyone whose PC Zinwe protects. Add a person to get their ID, then install Zinwe on their PC with it."
        actions={
          <>
            <RefreshButton
              onClick={() => {
                members.reload();
                devices.reload();
              }}
              pending={members.pending || devices.pending}
            />
            {/* The installer + setup steps, for the owner who's at the member's PC (new tab: the dashboard stays). */}
            <a className="btn btn--ghost dash-btn-sm" href="/download" target="_blank" rel="noopener">
              <DashIcon name="download" />
              Download Zinwe
            </a>
            <button type="button" className="btn btn--primary dash-btn-sm" onClick={() => setAdding(true)}>
              <DashIcon name="plus" />
              Add member
            </button>
          </>
        }
      />

      <Modal
        open={adding}
        onClose={closeAdd}
        title={created ? "Member added" : (members.data ?? []).some((m) => m.is_active) ? "Add a team member" : "Add your first person"}
        sub={created ? undefined : "Enter their name and work email. We'll give you an ID to connect their PC."}
      >
        {created ? (
          <CreatedPanel member={created} companyName={companyName} onAddAnother={() => setCreated(null)} />
        ) : (
          <AddMemberForm onCreated={onCreated} />
        )}
      </Modal>

      {/* The only PC-limit notice on this page (the top bar's copy is hidden here). */}
      {pcsFull ? (
        <div className="dash-banner dash-banner--info dash-banner--compact" role="status">
          <DashIcon name="pc" />
          {upgradeInCheck ? (
            <span>
              <b>All {maxDevices} PCs on your {planName ?? "current"} plan are in use.</b> Your upgrade to{" "}
              {upgradeInCheck.planName} is being checked; new PCs connect as soon as it's confirmed.
            </span>
          ) : (
            <>
              <span>
                <b>All {maxDevices} PCs on your {planName ?? "current"} plan are in use.</b> A new PC won't connect
                until you upgrade or remove one. PCs already connected keep working.
              </span>
              <Link
                className="dash-link"
                to={biggerPlan ? `/app/upgrade?plan=${encodeURIComponent(biggerPlan.code)}` : "/app/upgrade"}
              >
                Upgrade
              </Link>
            </>
          )}
        </div>
      ) : null}

      {members.data === undefined ? (
        <section className="dash-card">
          {members.error ? (
            <ErrorState
              title="We couldn't load your team"
              message={errorMessage(members.error)}
              onRetry={members.reload}
              retrying={members.pending}
            />
          ) : (
            <LoadingState label="Loading your team…" rows={3} />
          )}
        </section>
      ) : active.length === 0 ? (
        <section className="dash-card">
          <EmptyState
            icon="team"
            title="Add your first person"
            action={
              <button type="button" className="btn btn--primary dash-btn-sm" onClick={() => setAdding(true)}>
                <DashIcon name="plus" />
                Add your first person
              </button>
            }
          >
            Each person gets their own ID. Install Zinwe on their PC with it and they'll show up here within about a
            minute, with how much their PC is used.
          </EmptyState>
        </section>
      ) : (
        <section aria-labelledby="members-title" className="team-section">
          <div className="team-section__head">
            <h2 className="dash-card__title" id="members-title">
              Your team
            </h2>
            <p className="dash-card__sub">{summary}</p>
          </div>
          {members.error ? <StaleBanner message={errorMessage(members.error)} onRetry={members.reload} /> : null}
          <div className="team-grid">
            {active.map((member) => (
              <MemberTile
                key={member.id}
                member={member}
                device={deviceOf(member)}
                tags={tags.data?.[String(member.id)] ?? []}
                companyName={companyName}
                onUpdated={onUpdated}
                onRemoved={onRemoved}
                onDeviceChanged={devices.reload}
              />
            ))}
          </div>
        </section>
      )}
      <Toast message={toast} onDone={clearToast} />

      {unassigned.length > 0 ? (
        <section className="dash-card" aria-labelledby="other-pcs-title">
          <div className="dash-card__head">
            <h2 className="dash-card__title" id="other-pcs-title">
              Other PCs
            </h2>
            <p className="dash-card__sub">Connected before per-person IDs. They stay protected.</p>
          </div>
          <ul className="team-other">
            {unassigned.map((device) => (
              <OtherPc key={device.id} device={device} />
            ))}
          </ul>
        </section>
      ) : null}

      {removed.length > 0 ? (
        <details className="dash-card team-removed">
          <summary>
            Removed members <span className="dash-mono">({removed.length})</span>
          </summary>
          <ul className="team-removed__list">
            {removed.map((member) => (
              <li key={member.id}>
                <b>{member.name}</b>
                <small>{member.email} · their ID no longer works</small>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </>
  );
}

const PLATFORM_LABEL: Record<string, string> = { windows: "Windows", linux: "Linux", macos: "macOS" };

/** "Windows 11 Home 24H2 (26100)" — skip the platform when the OS string already says it. */
function systemOf(device: Device): string {
  const platform = PLATFORM_LABEL[device.platform] ?? device.platform;
  const os = device.os_version.trim();
  if (!os) return platform;
  return os.toLowerCase().startsWith(platform.toLowerCase()) ? os : `${platform} ${os}`;
}

/** A PC with no member attached (legacy org-wide key). */
function OtherPc({ device }: { device: Device }): ReactElement {
  const now = useNow();
  const status = presenceOf(device);
  const system = systemOf(device);
  return (
    <li className="team-other__row">
      <span className="dash-pc__ico" aria-hidden="true">
        <DashIcon name="pc" />
      </span>
      <span className="team-other__text">
        <b>{device.hostname || "Unnamed PC"}</b>
        <small>
          {[system, `last seen ${formatRelative(device.last_seen_at, now, "never")}`].filter(Boolean).join(" · ")}
        </small>
      </span>
      <span className={`dash-status dash-status--${PRESENCE_CLASS[status]}`}>
        <i aria-hidden="true" />
        {PRESENCE_LABEL[status]}
      </span>
    </li>
  );
}

/** The add form: name + email, with inline validation and server errors. */
function AddMemberForm({ onCreated }: { onCreated: (member: Member) => void }): ReactElement {
  const [draft, setDraft] = useState({ name: "", email: "" });
  const [errors, setErrors] = useState<FieldErrorMap<MemberField>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const controls = useRef<Partial<Record<MemberField, HTMLElement | null>>>({});

  const reg = (field: MemberField) => (el: HTMLElement | null) => {
    controls.current[field] = el;
  };
  const set = (field: MemberField, value: string) => {
    setDraft((d) => ({ ...d, [field]: value }));
    setErrors((e) => (e[field] ? { ...e, [field]: undefined } : e));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const clean = { name: draft.name.trim(), email: draft.email.trim() };
    const clientErrors = compactErrors<MemberField>({
      name: requiredError(clean.name),
      email: emailError(clean.email),
    });
    setErrors(clientErrors);
    setFormError(null);
    if (Object.keys(clientErrors).length > 0) return focusFirstInvalid(MEMBER_FIELDS, clientErrors, controls.current);

    setPending(true);
    try {
      const member = await createMember(clean);
      setDraft({ name: "", email: "" });
      onCreated(member);
    } catch (error) {
      const fieldErrors = apiFieldErrors(error, MEMBER_FIELDS);
      setErrors(fieldErrors);
      setFormError(apiFormError(error, MEMBER_FIELDS));
      focusFirstInvalid(MEMBER_FIELDS, fieldErrors, controls.current);
    } finally {
      setPending(false);
    }
  };

  return (
    <form className="co-form" onSubmit={onSubmit} noValidate>
      <div className="form__grid">
        <Field error={errors.name}>
          <label htmlFor="tm-name">Full name</label>
          <input
            ref={reg("name")}
            id="tm-name"
            autoComplete="name"
            placeholder="Priya Sharma"
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
            aria-invalid={errors.name ? true : undefined}
          />
        </Field>

        <Field error={errors.email}>
          <label htmlFor="tm-email">Work email</label>
          <input
            ref={reg("email")}
            id="tm-email"
            type="email"
            inputMode="email"
            autoComplete="off"
            placeholder="priya@yourcompany.com"
            value={draft.email}
            onChange={(e) => set("email", e.target.value)}
            aria-invalid={errors.email ? true : undefined}
          />
        </Field>
      </div>

      <FormAlert message={formError} />

      <div className="co-form__foot">
        <button type="submit" className="btn btn--primary" disabled={pending}>
          {pending ? "Adding…" : "Add member"}
          {pending ? null : <span className="arr">→</span>}
        </button>
      </div>
    </form>
  );
}

/**
 * Success panel: the member's ID shown large, with copy / download and the install hint. Used
 * after adding someone and after "Get a new ID" (`newId`), when the new ID has been emailed to them.
 */
function CreatedPanel({
  member,
  companyName,
  onAddAnother,
  newId = false,
}: {
  member: Member;
  companyName: string | null;
  onAddAnother?: () => void;
  newId?: boolean;
}): ReactElement {
  const first = member.name.trim().split(/\s+/)[0] || member.name;
  return (
    <div className="team-new">
      <p className="dash-banner dash-banner--ok" role="status">
        <DashIcon name="check" />
        {newId ? (
          <span>
            <b>New ID ready for {member.name}.</b> We've emailed it to {first}. Their old ID and the old invite email
            no longer work.
          </span>
        ) : (
          <span>
            <b>{member.name}</b> is added. Send them the details below so their PC can connect.
          </span>
        )}
      </p>
      <div className="dash-key">
        <code className="dash-key__value">{member.member_id}</code>
        <CopyButton text={member.member_id} label="Copy ID" what={`member ID for ${member.name}`} />
      </div>
      <p className="dash-note">
        On <b>{member.name}</b>'s PC, download Zinwe, run it and enter their email (
        <span className="dash-mono">{member.email}</span>) and this ID. They'll show as online here within about a
        minute.{newId ? "" : " We've also emailed these details to them."}
      </p>
      <div className="co-form__foot team-new__actions">
        <a className="btn btn--primary dash-btn-sm" href={AGENT_MSI_URL} download>
          <DashIcon name="download" />
          Download Zinwe (Windows)
        </a>
        <CopyDetails member={member} companyName={companyName} small />
        {onAddAnother ? (
          <button type="button" className="btn btn--ghost dash-btn-sm" onClick={onAddAnother}>
            <DashIcon name="team" />
            Add another member
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** What the member does (FR-19): saved at once, and gives their card its colour theme. */
function RolePicker({ member, onUpdated }: { member: Member; onUpdated: (m: Member) => void }): ReactElement {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const change = async (role: MemberRole | "") => {
    setBusy(true);
    setError(null);
    try {
      onUpdated(await setMemberRole(member.id, role));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <span className="team-role">
      <label className="dash-filter">
        <span>Role</span>
        <select value={member.role ?? ""} disabled={busy} onChange={(e) => void change(e.target.value as MemberRole | "")}>
          <option value="">Choose a role</option>
          {MEMBER_ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </label>
      {error ? (
        <small className="form__err" role="alert">
          {error}
        </small>
      ) : null}
    </span>
  );
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

/**
 * One person as a tile: who they are and whether they're working, their PC,
 * their ID, a 7-day usage chart, and the actions. Rarely-used, destructive
 * actions (new ID, remove) sit behind "More" and confirm in a dialog.
 */
function MemberTile({
  member,
  device,
  tags = [],
  companyName,
  onUpdated,
  onRemoved,
  onDeviceChanged,
}: {
  member: Member;
  /** The full PC record (OS, id for Activity) when the devices list has it. */
  device: Device | undefined;
  /** FR-19: kind tags from their week. */
  tags?: MemberTag[];
  companyName: string | null;
  onUpdated: (member: Member) => void;
  onRemoved: (member: Member) => void;
  /** Reload the PCs (after Restore USB). */
  onDeviceChanged: () => void;
}): ReactElement {
  const now = useNow();
  const chatOn = useEntitlements().has("team_chat");
  const bubble = useChatBubble();
  const [confirm, setConfirm] = useState<null | "rotate" | "deactivate">(null);
  const [messaging, setMessaging] = useState(false);
  const [threadKey, setThreadKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  // After "Get a new ID": the new ID with Copy / Download, and that it was emailed (J5-05).
  const [rotated, setRotated] = useState<Member | null>(null);
  const more = useRef<HTMLDetailsElement>(null);

  const run = async (kind: "rotate" | "deactivate") => {
    setBusy(true);
    setActionError(null);
    try {
      if (kind === "rotate") {
        const next = await rotateMemberId(member.id, { email: true });
        onUpdated(next);
        setRotated(next);
      } else {
        onRemoved(await deactivateMember(member.id));
      }
      setConfirm(null);
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 2500);
    return () => window.clearTimeout(id);
  }, [notice]);
  const copyDetails = async () => {
    if (more.current) more.current.open = false;
    const ok = await copyText(buildInviteText(member, companyName));
    setNotice(ok ? "Connect details copied" : "Couldn't copy. Use Copy next to their ID instead");
  };
  const ask = (kind: "rotate" | "deactivate") => {
    if (more.current) more.current.open = false;
    setActionError(null);
    setConfirm(kind);
  };

  const status = presenceOf(member.device);
  const pc = member.device;
  const worked = pc?.worked_seconds ?? 0;
  const showWorked = (status === "working" || status === "break") && worked > 0;
  const system = device ? systemOf(device) : "";
  const consent = consentOf(pc, device);
  const first = member.name.trim().split(/\s+/)[0] || member.name;
  const remind = () =>
    bubble.open({
      person: { id: member.id, name: member.name, email: member.email, hostname: pc?.hostname },
      draft: consentReminder(member.name, consent),
    });

  return (
    <article className={cx("team-tile", member.role && `team-tile--${member.role}`)} aria-label={member.name}>
      <header className="team-tile__head">
        <span className="team-tile__avatar" aria-hidden="true">
          {initialsOf(member.name)}
        </span>
        <span className="team-tile__who">
          <b>{member.name}</b>
          <small>{member.email}</small>
        </span>
        <span className={`dash-status dash-status--${PRESENCE_CLASS[status]}`}>
          <i aria-hidden="true" />
          {PRESENCE_LABEL[status]}
        </span>
      </header>

      {tags.length > 0 ? (
        <ul className="team-tags" aria-label={`${member.name}'s week`}>
          {tags.map((t) => (
            <li key={t.key} className="team-tag" title={t.why}>
              <span aria-hidden="true">{t.emoji}</span> {t.label}
              <span className="dash-sr">: {t.why}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <RolePicker member={member} onUpdated={onUpdated} />

      <dl className="team-tile__facts">
        <div>
          <dt>PC</dt>
          <dd title={formatDateTime(pc?.last_seen_at)}>
            {pc ? (
              <>
                <b>{pc.hostname || "Unnamed PC"}</b>
                <small>
                  {[
                    system,
                    `seen ${formatRelative(pc.last_seen_at, now, "never")}`,
                    showWorked ? `${formatDuration(worked)} today` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </small>
              </>
            ) : (
              <small>Waiting for them to install Zinwe</small>
            )}
          </dd>
        </div>
        {pc ? (
          <div>
            <dt>Consent</dt>
            <dd className="team-consent-row">
              {consent === "given" ? (
                <span
                  className="team-consent team-consent--ok"
                  data-tip={pc.consent_version ? `Policy version ${pc.consent_version}` : undefined}
                >
                  <DashIcon name="check" />
                  {pc.consent_at ? `Given ${formatDate(pc.consent_at)}` : "Given"}
                </span>
              ) : consent === "declined" ? (
                <span
                  className="team-consent team-consent--no"
                  data-tip="They said no on their PC. Zinwe collects nothing from it; work hours and chat still work."
                >
                  <DashIcon name="close" />
                  Declined monitoring · rules and alerts are off on this PC
                </span>
              ) : (
                <span
                  className="team-consent team-consent--wait"
                  data-tip="They'll be asked on their Zinwe widget. Under India's DPDP Act, monitoring needs their own consent."
                >
                  <DashIcon name="clock" />
                  Waiting for them
                </span>
              )}
              {consent !== "given" && chatOn ? (
                <button type="button" className="dash-link" onClick={remind}>
                  {consent === "declined" ? `Talk to ${first}` : `Remind ${first}`}
                </button>
              ) : null}
            </dd>
          </div>
        ) : null}
        {device?.usb_locked_at ? (
          <div>
            <dt>USB</dt>
            <dd>
              <UsbRestore device={device} onRestored={onDeviceChanged} />
            </dd>
          </div>
        ) : null}
        <div>
          <dt>Their ID</dt>
          <dd className="team-id">
            <code className="team-id__code">{member.member_id}</code>
            <CopyButton text={member.member_id} label="Copy" what={`member ID for ${member.name}`} />
          </dd>
        </div>
      </dl>

      <MemberUsage memberId={member.id} connected={Boolean(pc)} />

      <footer className="team-tile__actions">
        {/* FR-11: straight to this person's day on the Activity page (was "Share on text"). */}
        <Link className="btn btn--ghost dash-btn-sm" to={`/app/activity?member=${member.id}`}>
          <DashIcon name="activity" />
          Activity
        </Link>
        {chatOn ? (
          <button
            type="button"
            className="btn btn--ghost dash-btn-sm"
            onClick={() => {
              setMessaging(true);
              if ((member.unread ?? 0) > 0) onUpdated({ ...member, unread: 0 }); // opening the chat reads the replies
            }}
            disabled={busy}
          >
            <DashIcon name="chat" />
            Chat
            {(member.unread ?? 0) > 0 ? <span className="team-unread" aria-label={`${member.unread} unread`}>{member.unread}</span> : null}
          </button>
        ) : null}
        <details className="dash-menu" ref={more}>
          <summary className="btn btn--ghost dash-btn-sm" aria-label={`More actions for ${member.name}`}>
            <DashIcon name="more" />
          </summary>
          <div className="dash-menu__list">
            {device ? (
              <Link className="dash-menu__item" to={`/app/alerts?device=${device.id}`}>
                <DashIcon name="alert" />
                View alerts
              </Link>
            ) : null}
            <button type="button" className="dash-menu__item" onClick={() => void copyDetails()}>
              <DashIcon name="copy" />
              Copy connect details
            </button>
            <button type="button" className="dash-menu__item" onClick={() => ask("rotate")}>
              <DashIcon name="key" />
              Get a new ID
            </button>
            <button type="button" className="dash-menu__item dash-menu__item--danger" onClick={() => ask("deactivate")}>
              <DashIcon name="close" />
              Remove from team
            </button>
          </div>
        </details>
        {notice ? (
          <span className="team-tile__notice" role="status">
            {notice}
          </span>
        ) : null}
      </footer>

      <Modal
        open={messaging}
        onClose={() => setMessaging(false)}
        title={`Chat with ${member.name}`}
        sub="Messages appear in the Zinwe widget on their PC; their replies show here."
      >
        <MemberChatThread member={member} reloadKey={threadKey} />
        <SendMessageForm
          member={member}
          onClose={() => setMessaging(false)}
          onSent={() => setThreadKey((k) => k + 1)}
        />
      </Modal>

      <Modal
        open={confirm !== null}
        onClose={() => {
          if (!busy) setConfirm(null);
        }}
        size="sm"
        title={confirm === "rotate" ? `Get a new ID for ${member.name}?` : `Remove ${member.name}?`}
      >
        <p className="dash-modal__text">
          {confirm === "rotate"
            ? `Their old ID and the invite email we sent stop working straight away. We'll email the new ID to ${first}. If their PC is already connected it keeps running; you only need the new ID to connect a PC again.`
            : "Their ID stops working and their PC stops checking in. You can add them again later with a new ID."}
        </p>
        {actionError ? (
          <p className="form__err" role="alert">
            {actionError}
          </p>
        ) : null}
        <div className="dash-confirm__actions">
          <button
            type="button"
            className="btn btn--ink dash-btn-sm"
            onClick={() => {
              if (confirm) void run(confirm);
            }}
            disabled={busy}
          >
            {confirm === "rotate"
              ? busy
                ? "Getting a new ID…"
                : "Yes, get a new ID"
              : busy
                ? "Removing…"
                : "Yes, remove them"}
          </button>
          <button type="button" className="btn btn--ghost dash-btn-sm" onClick={() => setConfirm(null)} disabled={busy}>
            Cancel
          </button>
        </div>
      </Modal>

      <Modal open={rotated !== null} onClose={() => setRotated(null)} title={`New ID for ${member.name}`}>
        {rotated ? <CreatedPanel member={rotated} companyName={companyName} newId /> : null}
      </Modal>
    </article>
  );
}
