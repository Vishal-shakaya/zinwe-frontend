import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { usePageMeta } from "../../hooks/usePageMeta";
import {
  createMember,
  deactivateMember,
  errorMessage,
  listDevices,
  listMembers,
  rotateMemberId,
  type Device,
  type Member,
  type MemberField,
} from "../../lib/api";
import { compactErrors, emailError, focusFirstInvalid, requiredError, type FieldErrorMap } from "../../lib/validation";
import { apiFieldErrors, apiFormError } from "../../portal/failure";
import { Field } from "../../components/forms/Field";
import { FormAlert } from "../../portal/components/FormAlert";
import { CopyButton } from "../components/CopyButton";
import { ShareDetails } from "../components/ShareDetails";
import { buildInviteText } from "../features/invite";
import { copyText } from "../../lib/clipboard";
import { DashIcon } from "../components/DashIcon";
import { MemberChatThread, SendMessageForm } from "../components/MemberChat";
import { MemberUsage } from "../components/MemberUsage";
import { Modal } from "../components/Modal";
import { EmptyState, ErrorState, LoadingState, PageHeader, RefreshButton, StaleBanner } from "../components/States";
import { formatDuration, PRESENCE_CLASS, PRESENCE_LABEL, presenceOf } from "../features/memberStatus";
import { formatDateTime, formatRelative, useNow } from "../time";
import { useResource } from "../useResource";

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

  const { account } = useAuth();
  const companyName = account?.company?.name ?? null;

  const load = useCallback((signal: AbortSignal) => listMembers(signal), []);
  const members = useResource(load, { pollMs: 60_000 });
  const loadDevices = useCallback((signal: AbortSignal) => listDevices(signal), []);
  const devices = useResource(loadDevices, { pollMs: 60_000 });
  const [adding, setAdding] = useState(false);
  const [created, setCreated] = useState<Member | null>(null);

  const current = members.data ?? [];

  const onCreated = (member: Member) => {
    members.setData([member, ...current.filter((m) => m.id !== member.id)]);
    setCreated(member);
  };
  const onUpdated = (member: Member) => {
    members.setData(current.map((m) => (m.id === member.id ? member : m)));
    if (created?.id === member.id) setCreated(member);
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

  const summary = [
    `${active.length} ${active.length === 1 ? "person" : "people"}`,
    `${online} online now`,
    notConnected > 0 ? `${notConnected} not connected yet` : null,
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
        title={created ? "Member added" : "Add a team member"}
        sub={created ? undefined : "Enter their name and work email. We'll give you an ID to connect their PC."}
      >
        {created ? (
          <CreatedPanel member={created} companyName={companyName} onAddAnother={() => setCreated(null)} />
        ) : (
          <AddMemberForm onCreated={onCreated} />
        )}
      </Modal>

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
            title="Add your first team member"
            action={
              <button type="button" className="btn btn--primary dash-btn-sm" onClick={() => setAdding(true)}>
                <DashIcon name="plus" />
                Add member
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
                companyName={companyName}
                onUpdated={onUpdated}
              />
            ))}
          </div>
        </section>
      )}

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

/** Success panel: the new member's ID shown large, with copy/share buttons and the install hint. */
function CreatedPanel({
  member,
  companyName,
  onAddAnother,
}: {
  member: Member;
  companyName: string | null;
  onAddAnother: () => void;
}): ReactElement {
  return (
    <div className="team-new">
      <p className="dash-banner dash-banner--ok" role="status">
        <DashIcon name="check" />
        <span>
          <b>{member.name}</b> is added. Send them the details below so their PC can connect.
        </span>
      </p>
      <div className="dash-key">
        <code className="dash-key__value">{member.member_id}</code>
        <CopyButton text={member.member_id} label="Copy ID" what={`member ID for ${member.name}`} />
      </div>
      <p className="dash-note">
        On <b>{member.name}</b>'s PC, run Zinwe and enter their email (
        <span className="dash-mono">{member.email}</span>) and this ID. They'll show as online here within about a
        minute. We've also emailed these details to them.
      </p>
      <div className="co-form__foot">
        <ShareDetails member={member} companyName={companyName} />
        <button type="button" className="btn btn--ghost dash-btn-sm" onClick={onAddAnother}>
          <DashIcon name="team" />
          Add another member
        </button>
      </div>
    </div>
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
  companyName,
  onUpdated,
}: {
  member: Member;
  /** The full PC record (OS, id for Activity) when the devices list has it. */
  device: Device | undefined;
  companyName: string | null;
  onUpdated: (member: Member) => void;
}): ReactElement {
  const now = useNow();
  const [confirm, setConfirm] = useState<null | "rotate" | "deactivate">(null);
  const [messaging, setMessaging] = useState(false);
  const [threadKey, setThreadKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const more = useRef<HTMLDetailsElement>(null);

  const run = async (kind: "rotate" | "deactivate") => {
    setBusy(true);
    setActionError(null);
    try {
      onUpdated(kind === "rotate" ? await rotateMemberId(member.id) : await deactivateMember(member.id));
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
    setNotice(ok ? "Connect details copied" : "Couldn't copy — use Share on text instead");
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

  return (
    <article className="team-tile" aria-label={member.name}>
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
        <ShareDetails member={member} companyName={companyName} small shareOnly />
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
            ? "Their old ID stops working straight away. If their PC is already connected it keeps running; you only need the new ID to connect a PC again."
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
    </article>
  );
}
