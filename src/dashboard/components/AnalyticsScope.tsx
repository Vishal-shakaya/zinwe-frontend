/**
 * The protection pages' analytics scope: who (everyone, or one team member) and when (24 hours / 7 / 30
 * days). The person picker is a dropdown in the page header next to the range; when one person is picked,
 * a slim banner says so and offers "Show everyone". Rules (the Manage section) always apply to every PC.
 */
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactElement } from "react";
import type { Member } from "../../lib/api";
import { cx } from "../../lib/cx";
import type { AnalyticsScope } from "../features/analyticsScope";
import { useChatBubble } from "../features/chatBubble";
import { useEntitlements } from "../features/entitlements";
import { consentOf, consentReminder, PRESENCE_CLASS, PRESENCE_LABEL, presenceOf } from "../features/memberStatus";
import { DashIcon } from "./DashIcon";
import { RangeTabs } from "./RangeTabs";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

/** Header controls: person dropdown + range tabs. */
export function ScopeControls({ scope }: { scope: AnalyticsScope }): ReactElement {
  return (
    <div className="scope">
      <MemberPicker members={scope.members} value={scope.member} onChange={scope.setMember} />
      <RangeTabs value={scope.days} onChange={scope.setDays} />
    </div>
  );
}

/**
 * Under the header while one person is picked: whose numbers these are, and the way back. When nothing
 * can be collected from them yet (no PC, or they haven't agreed / said no on it), it says so plainly and
 * offers to remind them, instead of every card just saying "no activity" (J5-16).
 */
export function ScopeBanner({ scope }: { scope: AnalyticsScope }): ReactElement | null {
  const bubble = useChatBubble();
  const chatOn = useEntitlements().has("team_chat");
  if (!scope.person) return null;
  const person = scope.person;
  const device = person.device;
  const consent = consentOf(device);
  const first = person.name.trim().split(/\s+/)[0] || person.name;
  if (consent !== "given") {
    const message =
      consent === "none"
        ? `${first} hasn't connected a PC yet, so nothing is collected. Install Zinwe on their PC with their ID from Team & devices.`
        : consent === "declined"
          ? `${first} said no to monitoring on their PC, so Zinwe collects nothing from it. Work hours and chat still work.`
          : `${first} hasn't agreed on their PC yet, so nothing is collected. Ask them to open Zinwe and agree.`;
    return (
      <div className="scope-banner scope-consent dash-banner--warn" role="status">
        <span className="scope-banner__text">
          <b>{message}</b>
        </span>
        {consent !== "none" && chatOn ? (
          <button
            type="button"
            className="btn btn--ghost dash-btn-sm"
            onClick={() =>
              bubble.open({
                person: { id: person.id, name: person.name, email: person.email, hostname: device?.hostname },
                draft: consentReminder(person.name, consent),
              })
            }
          >
            {consent === "declined" ? `Talk to ${first}` : `Remind ${first}`}
          </button>
        ) : null}
        <button type="button" className="dash-link scope-banner__clear" onClick={() => scope.setMember(null)}>
          Show everyone
        </button>
      </div>
    );
  }
  return (
    <div className="scope-banner" role="status">
      <span className="scope-banner__avatar" aria-hidden="true">
        {initialsOf(scope.person.name)}
      </span>
      <span className="scope-banner__text">
        Showing <b>{scope.person.name}</b>
        {device?.hostname ? ` (${device.hostname})` : ""} only.
      </span>
      <button type="button" className="dash-link scope-banner__clear" onClick={() => scope.setMember(null)}>
        Show everyone
      </button>
    </div>
  );
}

/** A quiet label above a group of cards: Trends · Alerts · Manage · Details. */
export function SectionLabel({ title, note }: { title: string; note?: string }): ReactElement {
  return (
    <div className="dash-section">
      <h2 className="dash-section__title">{title}</h2>
      {note ? <p className="dash-section__note">{note}</p> : null}
    </div>
  );
}

/** "Everyone" or one team member: a dropdown with each person's initials, presence and PC. */
export function MemberPicker({
  members,
  value,
  onChange,
}: {
  members: Member[] | undefined;
  value: number | null;
  onChange: (id: number | null) => void;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const picked = value !== null ? members?.find((m) => m.id === value) : undefined;

  useEffect(() => {
    if (!open) return;
    wrap.current?.querySelector<HTMLButtonElement>('[role="option"][aria-selected="true"], [role="option"]')?.focus();
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onListKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = [...(wrap.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [])];
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    const go = (i: number) => {
      e.preventDefault();
      items[(i + items.length) % items.length]?.focus();
    };
    if (e.key === "ArrowDown") go(at + 1);
    else if (e.key === "ArrowUp") go(at - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(items.length - 1);
    else if (e.key === "Tab") setOpen(false);
  };

  const pick = (id: number | null) => {
    onChange(id);
    setOpen(false);
    button.current?.focus();
  };

  return (
    <div className={cx("mp", open && "is-open")} ref={wrap}>
      <button
        ref={button}
        type="button"
        className={cx("mp__btn", picked && "has-person")}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={`Show analytics for: ${picked?.name ?? "everyone"}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="mp__avatar" aria-hidden="true">
          {picked ? initialsOf(picked.name) : <DashIcon name="team" />}
        </span>
        <span className="mp__label">{picked?.name ?? "Everyone"}</span>
        <span className="mp__caret" aria-hidden="true" />
      </button>

      {open ? (
        <div className="mp__menu" id={listId} role="listbox" aria-label="Show analytics for" onKeyDown={onListKey}>
          <p className="mp__head" aria-hidden="true">
            Show analytics for
          </p>
          <button
            type="button"
            role="option"
            aria-selected={value === null}
            className={cx("mp__opt", value === null && "is-on")}
            onClick={() => pick(null)}
          >
            <span className="mp__avatar mp__avatar--all" aria-hidden="true">
              <DashIcon name="team" />
            </span>
            <span className="mp__text">
              <b>Everyone</b>
              <small>
                {members ? `All ${members.length} ${members.length === 1 ? "person" : "people"} on your team` : "Your whole team"}
              </small>
            </span>
            <span className="mp__tick" aria-hidden="true">
              {value === null ? <DashIcon name="check" /> : null}
            </span>
          </button>
          {members === undefined ? (
            <p className="mp__note">Loading your team…</p>
          ) : members.length === 0 ? (
            <p className="mp__note">No team members yet.</p>
          ) : (
            members.map((m) => {
              const status = presenceOf(m.device);
              const on = m.id === value;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="option"
                  aria-selected={on}
                  className={cx("mp__opt", on && "is-on")}
                  onClick={() => pick(m.id)}
                >
                  <span className="mp__avatar" aria-hidden="true">
                    {initialsOf(m.name)}
                    <i className={`tchat__dot tchat__dot--${PRESENCE_CLASS[status]}`} />
                  </span>
                  <span className="mp__text">
                    <b>{m.name}</b>
                    <small>{m.device?.hostname ? `${m.device.hostname} · ${PRESENCE_LABEL[status]}` : PRESENCE_LABEL[status]}</small>
                  </span>
                  <span className="mp__tick" aria-hidden="true">
                    {on ? <DashIcon name="check" /> : null}
                  </span>
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
