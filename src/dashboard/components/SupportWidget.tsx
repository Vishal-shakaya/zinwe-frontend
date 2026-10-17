import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactElement } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import {
  errorMessage,
  getSupportTicket,
  listSupportTickets,
  openSupportTicket,
  replySupportTicket,
  type SupportCategory,
  type SupportTicket,
  type SupportTicketDetail,
} from "../../lib/api";
import { cx } from "../../lib/cx";
import { formatRelative, useNow } from "../time";
import { useResource } from "../useResource";
import { DashIcon } from "./DashIcon";

const CATEGORIES: ReadonlyArray<{ value: SupportCategory; label: string }> = [
  { value: "question", label: "A question" },
  { value: "problem", label: "Something isn't working" },
  { value: "setup", label: "Setting up PCs" },
  { value: "billing", label: "Billing" },
  { value: "idea", label: "An idea or request" },
];

const STATUS_LABEL: Record<SupportTicket["status"], string> = {
  open: "Waiting for us",
  answered: "Answered",
  closed: "Closed",
};

type View = { kind: "list" } | { kind: "new" } | { kind: "thread"; id: number };

/**
 * The floating "Help & support" chat, bottom-right on every dashboard page.
 * Owners message the Zinwe team (who are emailed and answer in the admin app);
 * replies come back here and by email. `?support=<id>` (from the reply email)
 * opens that conversation.
 */
export function SupportWidget(): ReactElement {
  const [params, setParams] = useSearchParams();
  const { pathname } = useLocation();
  const [openState, setOpenState] = useState(false);
  const [viewState, setViewState] = useState<View>({ kind: "list" });

  const load = useCallback((signal: AbortSignal) => listSupportTickets(signal), []);
  const tickets = useResource(load, { pollMs: 60_000 });
  const unread = (tickets.data ?? []).reduce((sum, t) => sum + t.unread, 0);

  // Deep link from the "we answered" email: ?support=<id> opens that conversation until the owner moves on.
  const linkedRaw = Number(params.get("support"));
  const linked = Number.isInteger(linkedRaw) && linkedRaw > 0 ? linkedRaw : null;
  const open = openState || linked !== null;
  const view: View = linked !== null ? { kind: "thread", id: linked } : viewState;
  const dropLink = () => {
    if (linked === null) return;
    const next = new URLSearchParams(params);
    next.delete("support");
    setParams(next, { replace: true });
  };
  const setView = (next: View) => {
    dropLink();
    setOpenState(true);
    setViewState(next);
  };
  const setOpen = (next: boolean) => {
    dropLink();
    setOpenState(next);
  };
  const close = () => setOpen(false);

  return (
    <div className={cx("sup", open && "is-open")}>
      {open ? (
        <section className="sup__panel" role="dialog" aria-label="Help and support">
          <header className="sup__head">
            {view.kind !== "list" ? (
              <button type="button" className="sup__icon" onClick={() => setView({ kind: "list" })} aria-label="Back">
                <DashIcon name="arrow" />
              </button>
            ) : null}
            <div className="sup__title">
              <b>{view.kind === "new" ? "New message" : view.kind === "thread" ? "Conversation" : "Help & support"}</b>
              <small>The Zinwe team usually replies by email and here.</small>
            </div>
            <button type="button" className="sup__icon" onClick={close} aria-label="Close support">
              <DashIcon name="close" />
            </button>
          </header>

          {view.kind === "list" ? (
            <TicketList
              tickets={tickets.data}
              error={tickets.error ? errorMessage(tickets.error) : null}
              onNew={() => setView({ kind: "new" })}
              onOpen={(id) => setView({ kind: "thread", id })}
            />
          ) : view.kind === "new" ? (
            <NewTicket
              page={pathname}
              onCreated={(ticket) => {
                tickets.reload();
                setView({ kind: "thread", id: ticket.id });
              }}
            />
          ) : (
            <Thread id={view.id} onChanged={tickets.reload} />
          )}
        </section>
      ) : null}

      <button
        type="button"
        className="sup__fab"
        data-tour="support"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={unread > 0 ? `Help and support, ${unread} new ${unread === 1 ? "reply" : "replies"}` : "Help and support"}
      >
        <DashIcon name={open ? "close" : "chat"} />
        <span className="sup__fab-label">{open ? "Close" : "Support"}</span>
        {unread > 0 && !open ? <span className="sup__badge">{unread}</span> : null}
      </button>
    </div>
  );
}

function TicketList({
  tickets,
  error,
  onNew,
  onOpen,
}: {
  tickets: SupportTicket[] | undefined;
  error: string | null;
  onNew: () => void;
  onOpen: (id: number) => void;
}): ReactElement {
  const now = useNow();
  return (
    <div className="sup__body">
      <button type="button" className="btn btn--primary btn--block" onClick={onNew}>
        <DashIcon name="plus" />
        Ask the Zinwe team
      </button>
      {error ? <p className="form__err">{error}</p> : null}
      {tickets === undefined ? (
        <p className="dash-note">Loading…</p>
      ) : tickets.length === 0 ? (
        <p className="dash-note sup__empty">
          Stuck on something? Send us a message — we'll answer here and by email.
        </p>
      ) : (
        <ul className="sup__list">
          {tickets.map((t) => (
            <li key={t.id}>
              <button type="button" className={cx("sup__item", t.unread > 0 && "is-unread")} onClick={() => onOpen(t.id)}>
                <span className="sup__item-top">
                  <b>{t.subject}</b>
                  {t.unread > 0 ? <span className="sup__badge sup__badge--inline">{t.unread}</span> : null}
                </span>
                <small>
                  <span className={`sup__st sup__st--${t.status}`}>{STATUS_LABEL[t.status]}</span> ·{" "}
                  {formatRelative(t.updated_at, now)}
                </small>
                {t.last_message ? (
                  <span className="sup__preview">
                    {t.last_message.sender === "staff" ? "Zinwe: " : "You: "}
                    {t.last_message.body}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NewTicket({ page, onCreated }: { page: string; onCreated: (t: SupportTicketDetail) => void }): ReactElement {
  const [category, setCategory] = useState<SupportCategory>("question");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!message.trim()) {
      setError("Write your message.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      // No subject box: the backend titles the conversation from the message's first line.
      onCreated(await openSupportTicket({ category, message: message.trim(), page }));
    } catch (err) {
      setError(errorMessage(err));
      setPending(false);
    }
  };

  return (
    <form className="sup__body sup__form" onSubmit={onSubmit} noValidate>
      <label className="sup__field">
        <span>What's it about?</span>
        <select value={category} onChange={(e) => setCategory(e.target.value as SupportCategory)}>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label className="sup__field">
        <span>Your message</span>
        <textarea
          rows={5}
          maxLength={4000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What happened, on which PC, and what you expected."
        />
      </label>
      {error ? (
        <p className="form__err" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" className="btn btn--primary btn--block" disabled={pending}>
        {pending ? "Sending…" : "Send to Zinwe"}
      </button>
    </form>
  );
}

function Thread({ id, onChanged }: { id: number; onChanged: () => void }): ReactElement {
  // Opening the thread reads the team's replies server-side, so refresh the unread badge after each load.
  const changed = useRef(onChanged);
  useEffect(() => {
    changed.current = onChanged;
  }, [onChanged]);
  const load = useCallback(async (signal: AbortSignal) => {
    const detail = await getSupportTicket(id, signal);
    changed.current();
    return detail;
  }, [id]);
  const ticket = useResource(load, { pollMs: 30_000 });
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const now = useNow();

  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim() || pending) return;
    setPending(true);
    setError(null);
    try {
      await replySupportTicket(id, text.trim());
      setText("");
      ticket.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  };

  if (ticket.data === undefined) {
    return <div className="sup__body">{ticket.error ? <p className="form__err">{errorMessage(ticket.error)}</p> : <p className="dash-note">Loading…</p>}</div>;
  }
  const t = ticket.data;
  return (
    <div className="sup__thread">
      <div className="sup__subject">
        <b>{t.subject}</b>
        <span className={`sup__st sup__st--${t.status}`}>{STATUS_LABEL[t.status]}</span>
      </div>
      <div className="sup__msgs" role="log" aria-label="Conversation">
        {t.messages.map((m) => (
          <div key={m.id} className={cx("sup__msg", m.sender === "owner" ? "sup__msg--out" : "sup__msg--in")}>
            <span className="sup__msg-body">{m.body}</span>
            <small>
              {m.sender === "owner" ? "You" : m.author_name} · {formatRelative(m.created_at, now, "just now")}
            </small>
          </div>
        ))}
      </div>
      <form className="sup__reply" onSubmit={send}>
        {error ? <p className="form__err">{error}</p> : null}
        <textarea
          rows={2}
          maxLength={4000}
          placeholder={t.status === "closed" ? "Write to reopen this conversation…" : "Write a reply…"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(e as unknown as FormEvent);
            }
          }}
        />
        <button type="submit" className="btn btn--primary dash-btn-sm" disabled={pending || !text.trim()}>
          {pending ? "Sending…" : "Send"}
        </button>
      </form>
    </div>
  );
}

export default SupportWidget;
