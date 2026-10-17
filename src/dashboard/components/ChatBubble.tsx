import { useEffect, useState, type ReactElement } from "react";
import { cx } from "../../lib/cx";
import type { ChatBubbleRequest } from "../features/chatBubble";
import { detailOf } from "../features/alertGroups";
import { alertLabel, severityOf } from "../features/events";
import { formatDateTime } from "../time";
import { DashIcon } from "./DashIcon";
import { MemberChatThread } from "./MemberChat";
import { TaggedComposer } from "./TaggedComposer";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

/**
 * The floating chat bubble (bottom-right, above Support): the alert it's about,
 * the conversation with this person so far, and the tagged composer. It can be
 * minimised to a small "chat head" and reopened; the thread refreshes after
 * each send and every 20 seconds while open.
 */
export function ChatBubble({ request, onClose }: { request: ChatBubbleRequest; onClose: () => void }): ReactElement {
  const { person, event = null } = request;
  const [minimized, setMinimized] = useState(false);
  const [threadKey, setThreadKey] = useState(0);
  const [showContext, setShowContext] = useState(true);

  useEffect(() => {
    if (minimized) return;
    const id = window.setInterval(() => setThreadKey((k) => k + 1), 20_000);
    return () => window.clearInterval(id);
  }, [minimized]);

  if (minimized) {
    return (
      <button type="button" className="cb-head" onClick={() => setMinimized(false)} aria-label={`Open chat with ${person.name}`}>
        <span className="cb-avatar">{initialsOf(person.name)}</span>
        <span className="cb-head__name">{person.name}</span>
      </button>
    );
  }

  const severity = event ? severityOf(event) : null;

  return (
    <section className="cb" role="dialog" aria-label={`Chat with ${person.name}`}>
      <header className="cb__top">
        <span className="cb-avatar">{initialsOf(person.name)}</span>
        <span className="cb__who">
          <b>{person.name}</b>
          <small>{[person.hostname, person.email].filter(Boolean).join(" · ") || "Team member"}</small>
        </span>
        <button type="button" className="cb__icon" onClick={() => setMinimized(true)} aria-label="Minimise">
          <span aria-hidden="true">–</span>
        </button>
        <button type="button" className="cb__icon" onClick={onClose} aria-label="Close chat">
          <DashIcon name="close" />
        </button>
      </header>

      {event ? (
        <button
          type="button"
          className={cx("cb__alert", `cb__alert--${severity}`, !showContext && "is-folded")}
          onClick={() => setShowContext((s) => !s)}
          aria-expanded={showContext}
        >
          <DashIcon name="alert" />
          <span>
            <b>{alertLabel(event)}</b>
            {showContext ? (
              <>
                <small>{detailOf(event)}</small>
                <small>
                  {event.hostname} · {formatDateTime(event.occurred_at)}
                </small>
              </>
            ) : null}
          </span>
        </button>
      ) : null}

      <div className="cb__thread">
        <MemberChatThread member={person} reloadKey={threadKey} />
      </div>

      <div className="cb__compose">
        <TaggedComposer
          key={`${event?.id ?? "chat"}-${request.tag ?? ""}-${request.urgency ?? ""}-${request.delivery ?? ""}-${request.draft ?? ""}`}
          person={person}
          event={event}
          initialTag={request.tag ?? null}
          initialText={request.draft}
          initialUrgency={request.urgency}
          initialDelivery={request.delivery}
          compact
          onSent={(d) => {
            setThreadKey((k) => k + 1);
            request.onSent?.(d);
          }}
        />
      </div>
    </section>
  );
}

export default ChatBubble;
