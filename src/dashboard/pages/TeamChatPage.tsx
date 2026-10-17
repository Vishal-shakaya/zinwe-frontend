import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { usePageMeta } from "../../hooks/usePageMeta";
import { errorMessage, listMembers, type Member } from "../../lib/api";
import { cx } from "../../lib/cx";
import { PagePlanGate } from "../components/PlanLock";
import { ChatComposer, MemberChatThread } from "../components/MemberChat";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "../components/States";
import { PRESENCE_CLASS, PRESENCE_LABEL, presenceOf } from "../features/memberStatus";
import { useResource } from "../useResource";

/** How often the open conversation checks for new replies. */
const THREAD_POLL_MS = 15_000;

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

/** People with unread replies first, then by name. */
function sortForChat(members: Member[]): Member[] {
  return [...members].sort(
    (a, b) => (b.unread ?? 0) - (a.unread ?? 0) || a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

/**
 * Team → Chat: a simple two-pane inbox. Pick a person on the left, read the
 * conversation and reply on the right. Messages land in the Zinwe widget on
 * their PC; their replies come back here.
 */
/** Plan enforcement: the whole page is team_chat; without it, a lock card shows instead. */
export default function TeamChatPage(): ReactElement {
  return (
    <PagePlanGate
      module="team_chat"
      title="Chat"
      lede="Message your team on their Zinwe widget."
      lock="Send a note straight to an employee's PC, get their reply here, and copy it to their email when it matters."
    >
      <TeamChatPageContent />
    </PagePlanGate>
  );
}

function TeamChatPageContent(): ReactElement {
  usePageMeta({ title: "Chat — Zinwe", description: "Message your team and read their replies." });

  const load = useCallback((signal: AbortSignal) => listMembers(signal), []);
  const members = useResource(load, { pollMs: 30_000 });
  const [params, setParams] = useSearchParams();
  const [threadKey, setThreadKey] = useState(0);

  const active = useMemo(() => sortForChat((members.data ?? []).filter((m) => m.is_active)), [members.data]);
  const wanted = Number(params.get("member"));
  const selected = active.find((m) => m.id === wanted) ?? active[0];
  const unread = active.reduce((sum, m) => sum + (m.unread ?? 0), 0);

  // Keep the open conversation fresh while the tab is visible.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") setThreadKey((k) => k + 1);
    }, THREAD_POLL_MS);
    return () => window.clearInterval(id);
  }, []);

  // Opening a conversation reads it server-side: clear its badge locally too.
  useEffect(() => {
    if (!selected || !(selected.unread ?? 0) || !members.data) return;
    members.setData(members.data.map((m) => (m.id === selected.id ? { ...m, unread: 0 } : m)));
  }, [selected, members]);

  const pick = (member: Member) => {
    const next = new URLSearchParams(params);
    next.set("member", String(member.id));
    setParams(next, { replace: true });
  };

  return (
    <>
      <PageHeader
        title="Chat"
        lede={
          unread > 0
            ? `${unread} new ${unread === 1 ? "reply" : "replies"} from your team.`
            : "Message anyone on your team by chat (the Zinwe widget on their PC), by email, or both. Their replies come back here."
        }
      />

      {members.data === undefined ? (
        <section className="dash-card">
          {members.error ? (
            <ErrorState message={errorMessage(members.error)} onRetry={members.reload} retrying={members.pending} />
          ) : (
            <LoadingState label="Loading your team…" rows={3} />
          )}
        </section>
      ) : active.length === 0 || !selected ? (
        <section className="dash-card">
          <EmptyState
            icon="chat"
            title="No one to chat with yet"
            action={
              <Link className="btn btn--primary dash-btn-sm" to="/app/team">
                Add a team member
              </Link>
            }
          >
            Add your team first. Once Zinwe is on their PC, you can message them here.
          </EmptyState>
        </section>
      ) : (
        <section className="tchat" aria-label="Team chat">
          <ul className="tchat__people" aria-label="Conversations">
            {active.map((member) => {
              const status = presenceOf(member.device);
              const count = member.unread ?? 0;
              return (
                <li key={member.id}>
                  <button
                    type="button"
                    className={cx("tchat__person", member.id === selected.id && "is-on")}
                    aria-current={member.id === selected.id ? "true" : undefined}
                    onClick={() => pick(member)}
                  >
                    <span className="tchat__avatar" aria-hidden="true">
                      {initialsOf(member.name)}
                      <i className={`tchat__dot tchat__dot--${status === "online" ? "online" : PRESENCE_CLASS[status]}`} />
                    </span>
                    <span className="tchat__who">
                      <b>{member.name}</b>
                      <small>{PRESENCE_LABEL[status]}</small>
                    </span>
                    {count > 0 ? (
                      <span className="team-unread" aria-label={`${count} unread`}>
                        {count}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="tchat__pane">
            <header className="tchat__head">
              <span className="tchat__avatar" aria-hidden="true">
                {initialsOf(selected.name)}
              </span>
              <span className="tchat__who">
                <b>{selected.name}</b>
                <small>
                  {selected.device
                    ? `${selected.device.hostname || "Their PC"} · ${PRESENCE_LABEL[presenceOf(selected.device)]} · ${selected.email}`
                    : `${selected.email} · Zinwe isn't on their PC yet: chat waits until it is, email arrives now`}
                </small>
              </span>
            </header>
            <div className="tchat__scroll">
              <MemberChatThread
                key={selected.id}
                member={selected}
                reloadKey={threadKey}
                online={selected.device ? selected.device.is_online : false}
              />
            </div>
            <ChatComposer key={`c-${selected.id}`} member={selected} onSent={() => setThreadKey((k) => k + 1)} />
          </div>
        </section>
      )}
    </>
  );
}
