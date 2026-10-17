import { useCallback, useMemo, useState, type ReactElement } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { upgradeBeingChecked } from "../../auth/steps";
import { usePageMeta } from "../../hooks/usePageMeta";
import { decideBreak, errorMessage, getWorkLog, listMembers, type Member } from "../../lib/api";
import { cx } from "../../lib/cx";
import { DashIcon } from "../components/DashIcon";
import { Modal } from "../components/Modal";
import { PagePlanGate } from "../components/PlanLock";
import { StatTiles } from "../components/StatTiles";
import { EmptyState, ErrorState, LoadingState, PageHeader, RefreshButton, StaleBanner } from "../components/States";
import { useEntitlements } from "../features/entitlements";
import { formatDuration } from "../features/memberStatus";
import { isoDay, shiftDay, summarizeDay, type BreakSpan, type PersonDay, type TimelineItem } from "../features/workDay";
import { dayLabel, formatDateTime, formatTime, useNow } from "../time";
import { useResource } from "../useResource";

/** Same words as the member's Zinwe widget: Log in · Take a break · I'm back · Log out. */
const KIND_LABEL: Record<TimelineItem["kind"], string> = {
  start: "Logged in",
  break: "Went on a break",
  back: "Back from break",
  end: "Logged out",
};

function parseDay(raw: string | null, today: string): string {
  return raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) && raw <= today ? raw : today;
}

/**
 * Activity: how the team's day went — when each person started, every break
 * (with the reason they picked in the Zinwe widget) and when they finished.
 * One day at a time; today refreshes every minute.
 */
/** Plan enforcement: the whole page is work_time; without it, a lock card shows instead. */
export default function ActivityPage(): ReactElement {
  return (
    <PagePlanGate
      module="work_time"
      title="Activity"
      lede="When your team logged in, took breaks and logged out, from their Zinwe widget."
      lock="See when each person logged in, every break and why, and when they logged out. Approve breaks or ask about them from one page."
    >
      <ActivityPageContent />
    </PagePlanGate>
  );
}

function ActivityPageContent(): ReactElement {
  usePageMeta({ title: "Activity — Zinwe", description: "When your team started, took breaks and finished work." });

  const now = useNow(60_000);
  const today = isoDay(new Date(now));
  const [params, setParams] = useSearchParams();
  // The plan keeps `historyDays` of work log (0 = everything): the day picker stops there.
  const { historyDays } = useEntitlements();
  const upgradeInCheck = upgradeBeingChecked(useAuth().account?.subscription);
  const earliest = historyDays ? shiftDay(today, -historyDays) : undefined;
  const parsed = parseDay(params.get("date"), today);
  const day = earliest && parsed < earliest ? earliest : parsed;
  const isToday = day === today;
  const atEarliest = earliest !== undefined && day <= earliest;

  const loadLog = useCallback((signal: AbortSignal) => getWorkLog({ date: day }, signal), [day]);
  const log = useResource(loadLog, { resetKey: day, pollMs: isToday ? 60_000 : undefined });
  const loadMembers = useCallback((signal: AbortSignal) => listMembers(signal), []);
  const members = useResource(loadMembers);

  const people = useMemo(
    () => (log.data ? summarizeDay(log.data.entries, isToday, now) : []),
    [log.data, isToday, now],
  );
  const byMember = useMemo(() => new Map((members.data ?? []).map((m) => [m.id, m] as const)), [members.data]);
  // Active members with nothing logged that day.
  const absent = useMemo(() => {
    const seen = new Set(people.map((p) => p.memberId));
    return (members.data ?? []).filter((m) => m.is_active && !seen.has(m.id));
  }, [people, members.data]);

  const go = (next: string) => {
    const p = new URLSearchParams(params);
    if (next === today) p.delete("date");
    else p.set("date", next);
    setParams(p, { replace: true });
  };

  const [y, m, d] = day.split("-").map(Number);
  const label = dayLabel(new Date(y, m - 1, d), now);
  const onBreakNow = isToday ? people.filter((p) => p.current === "on_break").length : 0;
  const breaks = people.reduce((sum, p) => sum + p.breaks.length, 0);
  const finished = people.filter((p) => p.endedAt).length;
  const toReview = people.reduce((sum, p) => sum + p.breaks.filter((b) => b.approval === "pending").length, 0);

  return (
    <>
      <PageHeader
        title="Activity"
        lede="When your team logged in, every break and why, and when and why they logged out — from the Log in, Take a break and Log out buttons in their Zinwe widget."
        actions={<RefreshButton onClick={log.reload} pending={log.pending} />}
      />

      <div className="wd-days" role="group" aria-label="Choose a day">
        <button
          type="button"
          className="btn btn--ghost dash-btn-sm"
          onClick={() => go(shiftDay(day, -1))}
          disabled={atEarliest}
        >
          ‹ Previous day
        </button>
        <span className="wd-days__label">
          <b>{label}</b>
          {label === "Today" || label === "Yesterday" ? (
            <small>
              {new Date(y, m - 1, d).toLocaleDateString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </small>
          ) : null}
        </span>
        <label className="dash-filter">
          <span className="dash-sr">Pick a date</span>
          <input
            type="date"
            value={day}
            min={earliest}
            max={today}
            onChange={(e) => e.target.value && go(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="btn btn--ghost dash-btn-sm"
          onClick={() => go(shiftDay(day, 1))}
          disabled={isToday}
        >
          Next day ›
        </button>
        {!isToday ? (
          <button type="button" className="dash-link" onClick={() => go(today)}>
            Back to today
          </button>
        ) : null}
      </div>
      {atEarliest ? (
        <p className="dash-note wd-days__limit">
          Your plan keeps {historyDays} days of activity.{" "}
          {upgradeInCheck ? (
            "Your upgrade is being checked."
          ) : (
            <Link className="dash-link" to="/onboarding/plan">
              Upgrade to keep more
            </Link>
          )}
        </p>
      ) : null}

      <StatTiles
        wide
        label="The day at a glance"
        tiles={[
          { value: log.data ? String(people.length) : "–", label: people.length === 1 ? "person worked" : "people worked" },
          ...(isToday
            ? [{ value: log.data ? String(onBreakNow) : "–", label: "on a break now", tone: onBreakNow > 0 ? ("warn" as const) : undefined }]
            : []),
          { value: log.data ? String(breaks) : "–", label: breaks === 1 ? "break taken" : "breaks taken" },
          {
            value: log.data ? String(toReview) : "–",
            label: "breaks to review",
            tone: toReview > 0 ? ("warn" as const) : undefined,
          },
          { value: log.data ? String(finished) : "–", label: "logged out", tone: finished > 0 ? ("good" as const) : undefined },
        ]}
      />

      <section className="dash-card" aria-labelledby="wd-title">
        <div className="dash-card__head">
          <h2 className="dash-card__title" id="wd-title">
            {isToday ? "Today so far" : `Work day · ${label}`}
          </h2>
          <p className="dash-card__sub">Open a person to see their full timeline.</p>
        </div>

        {log.data === undefined ? (
          log.error ? (
            <ErrorState message={errorMessage(log.error)} onRetry={log.reload} retrying={log.pending} />
          ) : (
            <LoadingState label="Loading the day…" rows={3} />
          )
        ) : people.length === 0 ? (
          <EmptyState
            icon="clock"
            title={isToday ? "No one has started yet today" : "No work recorded that day"}
            action={
              (members.data ?? []).length === 0 ? (
                <Link className="btn btn--primary dash-btn-sm" to="/app/team">
                  Add your team
                </Link>
              ) : undefined
            }
          >
            When someone presses <b>Log in</b> in their Zinwe widget, their day shows up here — with every break and
            when they log out.
          </EmptyState>
        ) : (
          <>
            {log.error ? <StaleBanner message={errorMessage(log.error)} onRetry={log.reload} /> : null}
            <div className="wd-table">
              <div className="wd-row wd-row--head" aria-hidden="true">
                <span>Person</span>
                <span>Logged in</span>
                <span>Breaks</span>
                <span>Logged out</span>
                <span>Worked</span>
              </div>
              {people.map((person) => (
                <PersonRow
                  key={person.key}
                  person={person}
                  member={person.memberId != null ? byMember.get(person.memberId) : undefined}
                  isToday={isToday}
                  onDecided={log.reload}
                />
              ))}
            </div>
          </>
        )}

        {log.data && absent.length > 0 ? (
          <p className="dash-note wd-absent">
            <b>No activity {isToday ? "yet" : "that day"}:</b> {absent.map((m) => m.name).join(", ")}
          </p>
        ) : null}
      </section>
    </>
  );
}

function PersonRow({
  person,
  member,
  isToday,
  onDecided,
}: {
  person: PersonDay;
  member: Member | undefined;
  isToday: boolean;
  onDecided: () => void;
}): ReactElement {
  const pending = person.breaks.filter((b) => b.approval === "pending").length;
  const [open, setOpen] = useState(false);
  // Today the widget's own totals are exact (no missed short breaks); past days use the log.
  const live = isToday ? member?.device?.worked_seconds ?? 0 : 0;
  const worked = live > 0 ? live : person.workedSeconds;
  const status =
    person.current === "on_break" && isToday
      ? "On a break"
      : person.current === "working" && isToday
        ? "Working"
        : person.current === "ended"
          ? "Finished"
          : null;

  return (
    <div className={cx("wd-person", open && "is-open")}>
      <button
        type="button"
        className="wd-row"
        aria-expanded={open}
        aria-label={`${person.name}: show the full day`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="wd-who">
          <DashIcon name="arrow" />
          <span>
            <b>
              {person.name}
              {pending > 0 ? (
                <span className="wd-pending" title="Breaks waiting for your approval">
                  {pending} to review
                </span>
              ) : null}
            </b>
            <small>
              {person.hostname}
              {status ? ` · ${status}` : ""}
            </small>
          </span>
        </span>
        <span data-label="Logged in" title={formatDateTime(person.startedAt)}>
          {person.startedAt ? formatTime(person.startedAt) : "—"}
        </span>
        <span data-label="Breaks">
          {person.breaks.length === 0 ? (
            "None"
          ) : (
            <>
              {person.breaks.length} · {formatDuration(person.breakSeconds)}
            </>
          )}
        </span>
        <span data-label="Logged out">
          {person.endedAt ? (
            formatTime(person.endedAt)
          ) : person.openEnded ? (
            <span className="wd-warn">Didn't log out</span>
          ) : isToday ? (
            <span className="wd-muted">Not yet</span>
          ) : (
            "—"
          )}
        </span>
        <span data-label="Worked" className="wd-worked">
          {formatDuration(worked)}
        </span>
      </button>

      {open ? (
        <ol className="wd-timeline" aria-label={`${person.name}'s day`}>
          {person.timeline.map((item, i) => {
            const brk = item.kind === "break" ? person.breaks.find((b) => b.start === item.at) : undefined;
            return (
              <li key={`${item.at}-${i}`} className={`wd-step wd-step--${item.kind}`}>
                <time dateTime={item.at}>{formatTime(item.at)}</time>
                <span className="wd-step__dot" aria-hidden="true" />
                <span className="wd-step__text">
                  <b>{KIND_LABEL[item.kind]}</b>
                  {item.kind === "break" ? (
                    <>
                      {item.reason ? <span className="wd-reason">{item.reason}</span> : <span className="wd-muted">No reason given</span>}
                      {brk ? (
                        <small>{brk.end ? `for ${formatDuration(brk.seconds)}` : `${formatDuration(brk.seconds)} so far`}</small>
                      ) : null}
                      {brk?.note ? <q className="wd-note">{brk.note}</q> : null}
                      {brk ? <BreakDecision brk={brk} personName={person.name} onDecided={onDecided} /> : null}
                    </>
                  ) : null}
                  {item.kind === "end" && (item.reason || item.note) ? (
                    <>
                      {item.reason ? <span className="wd-reason">{item.reason}</span> : null}
                      {item.note ? <q className="wd-note">{item.note}</q> : null}
                    </>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ol>
      ) : null}
    </div>
  );
}

/**
 * Approve one break, or say it wasn't OK. Both go to the person's Zinwe widget, so each opens a small
 * dialog first: what they'll see, and an optional note ("Lunch was 50 min, please keep it to 30"). Then
 * the row says "Sent to Priya" (J5-03). The owner can change their mind.
 */
function BreakDecision({
  brk,
  personName,
  onDecided,
}: {
  brk: BreakSpan;
  personName: string;
  onDecided: () => void;
}): ReactElement | null {
  const [asking, setAsking] = useState<null | "approved" | "denied">(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  if (!brk.approval) return null;
  const first = personName.trim().split(/\s+/)[0] || personName;
  const what = brk.reason ? `${brk.reason} break` : "break";

  const open = (decision: "approved" | "denied") => {
    setNote("");
    setError(null);
    setAsking(decision);
  };

  const decide = async () => {
    if (!asking) return;
    setBusy(true);
    setError(null);
    try {
      await decideBreak(brk.id, asking, note.trim());
      setAsking(null);
      setEditing(false);
      onDecided();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const dialog = (
    <Modal
      open={asking !== null}
      onClose={() => {
        if (!busy) setAsking(null);
      }}
      size="sm"
      title={asking === "approved" ? `Approve ${first}'s ${what}?` : `Tell ${first} this ${what} wasn't OK?`}
      sub={`${first} sees this in their Zinwe widget.`}
    >
      <form
        className="co-form"
        onSubmit={(e) => {
          e.preventDefault();
          void decide();
        }}
      >
        <div className="field">
          <label htmlFor={`brk-note-${brk.id}`}>
            Note to {first} <small>(optional)</small>
          </label>
          <textarea
            id={`brk-note-${brk.id}`}
            rows={2}
            maxLength={300}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={asking === "approved" ? "Thanks for letting me know." : "Lunch was 50 min — please keep it to 30."}
          />
        </div>
        {error ? (
          <p className="form__err" role="alert">
            {error}
          </p>
        ) : null}
        <div className="dash-confirm__actions">
          <button type="submit" className="btn btn--ink dash-btn-sm" disabled={busy}>
            {busy ? "Sending…" : `Send to ${first}`}
          </button>
          <button type="button" className="btn btn--ghost dash-btn-sm" onClick={() => setAsking(null)} disabled={busy}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );

  if (brk.approval !== "pending" && !editing) {
    return (
      <span className="wd-decision">
        <span className={`wd-approval wd-approval--${brk.approval}`}>
          <DashIcon name={brk.approval === "approved" ? "check" : "close"} />
          {brk.approval === "approved" ? "Approved" : "Not OK"}
        </span>
        <small className="wd-sent">Sent to {first}</small>
        {brk.decisionNote ? <q className="wd-note">{brk.decisionNote}</q> : null}
        <button type="button" className="dash-link" onClick={() => setEditing(true)}>
          Change
        </button>
      </span>
    );
  }
  return (
    <span className="wd-decision">
      <button type="button" className="btn btn--ghost dash-btn-sm wd-approve" onClick={() => open("approved")} disabled={busy}>
        <DashIcon name="check" />
        Approve
      </button>
      <button type="button" className="btn btn--ghost dash-btn-sm wd-deny" onClick={() => open("denied")} disabled={busy}>
        <DashIcon name="chat" />
        Not OK
      </button>
      {editing ? (
        <button type="button" className="dash-link" onClick={() => setEditing(false)}>
          Keep as it was
        </button>
      ) : null}
      {dialog}
    </span>
  );
}
