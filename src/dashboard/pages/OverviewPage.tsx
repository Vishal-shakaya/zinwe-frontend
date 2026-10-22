import { useCallback, useMemo, useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { usePageMeta } from "../../hooks/usePageMeta";
import { getPolicy, listDevices, listEvents, listMembers, type DeviceEvent, type Member } from "../../lib/api";
import { AlertsTable } from "../components/AlertsTable";
import { GetProtected } from "../components/GetProtected";
import { StatTiles } from "../components/StatTiles";
import { DashIcon } from "../components/DashIcon";
import { PlanLock } from "../components/PlanLock";
import { useEntitlements } from "../features/entitlements";
import { LoadingState, PageHeader } from "../components/States";
import { makeMemberResolver, needsAttention } from "../features/events";
import { consentOf, formatDuration, PRESENCE_CLASS, PRESENCE_LABEL, presenceOf } from "../features/memberStatus";
import { formatRelative, useNow } from "../time";
import { useResource } from "../useResource";

/** Overview is a glance: the few newest alerts to check, the rest live in Alerts. */
const MAX_ALERTS = 5;
const MAX_PEOPLE = 6;

function startOfToday(now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * "Alerts to check today": Worth a look + Needs attention since midnight that nobody has handled yet.
 * Alerts → "To check" counts the same way (J5-11).
 */
function toCheckToday(events: DeviceEvent[], now: number): number {
  const from = startOfToday(now);
  return events.filter((e) => needsAttention(e) && Date.parse(e.occurred_at) >= from).length;
}

/** The alerts for the main table: still to check, newest first (handled ones leave the list, J5-04). */
function actionable(events: DeviceEvent[]): DeviceEvent[] {
  return events.filter(needsAttention).slice(0, MAX_ALERTS);
}

export default function OverviewPage(): ReactElement {
  usePageMeta({ title: "Overview — Zinwe", description: "Who's working, your plan and the latest alerts, at a glance." });
  const { account } = useAuth();

  const loadDevices = useCallback((signal: AbortSignal) => listDevices(signal), []);
  const loadMembers = useCallback((signal: AbortSignal) => listMembers(signal), []);
  const loadEvents = useCallback((signal: AbortSignal) => listEvents({ limit: 100 }, signal), []);
  const devices = useResource(loadDevices, { pollMs: 60_000 });
  const members = useResource(loadMembers, { pollMs: 60_000 });
  const events = useResource(loadEvents, { pollMs: 60_000 });
  const loadPolicy = useCallback((signal: AbortSignal) => getPolicy(signal), []);
  const policy = useResource(loadPolicy);
  const now = useNow(60_000);
  // Marked handled / messaged from this page: off the list at once, before the next poll.
  const [handledHere, setHandledHere] = useState<ReadonlySet<number>>(() => new Set());

  const { has, maxDevices } = useEntitlements();
  const workOn = has("work_time");
  const firstName = account?.user.full_name.trim().split(/\s+/)[0];
  const company = account?.company;

  const activeMembers = useMemo(() => (members.data ?? []).filter((m) => m.is_active), [members.data]);
  const presence = useMemo(() => activeMembers.map((m) => presenceOf(m.device)), [activeMembers]);
  const working = presence.filter((p) => p === "working").length;
  const onBreak = presence.filter((p) => p === "break").length;
  const offline = presence.filter((p) => p === "offline").length;

  const open = (events.data ?? []).filter((e) => !handledHere.has(e.id));
  const alerts = events.data ? actionable(open) : [];
  const todays = events.data ? toCheckToday(open, now) : null;
  const resolveMember = useMemo(() => makeMemberResolver(devices.data), [devices.data]);

  const loaded = members.data !== undefined;
  const num = (value: number) => (loaded ? String(value) : "–");
  // First run: until someone has agreed on their PC, Overview leads with the four setup steps (J5-06).
  const noTeam = loaded && activeMembers.length === 0;
  const firstRun = loaded && !activeMembers.some((m) => consentOf(m.device) === "given");

  return (
    <>
      <PageHeader
        title={firstName ? `Welcome, ${firstName}` : "Welcome"}
        lede={
          noTeam
            ? "Let's protect your first PC. It takes about 5 minutes."
            : company
              ? `${company.name} · Here's your team today.`
              : "Here's your team today."
        }
      />

      {firstRun ? (
        <GetProtected
          members={activeMembers}
          maxDevices={maxDevices}
          rulesChanged={(policy.data?.version ?? 1) > 1}
        />
      ) : null}

      {noTeam ? null : (
      <StatTiles
        wide
        label="Team and alerts"
        tiles={[
          {
            value: num(activeMembers.length),
            label: activeMembers.length === 1 ? "team member" : "team members",
            icon: "team",
            hint: "Everyone you've added whose PC Zinwe protects.",
          },
          // Plan enforcement: working / on-break come from work hours (Businesses).
          ...(workOn
            ? [
                {
                  value: num(working),
                  label: "working now",
                  tone: working > 0 ? ("good" as const) : undefined,
                  icon: "activity" as const,
                  hint: "Pressed Log in in their Zinwe widget and aren't on a break.",
                },
                {
                  value: num(onBreak),
                  label: "on break",
                  tone: onBreak > 0 ? ("warn" as const) : undefined,
                  icon: "clock" as const,
                  hint: "On a break right now. See why on the Activity page.",
                },
              ]
            : []),
          {
            value: num(offline),
            label: "offline",
            icon: "pc",
            hint: "PC switched off or without internet. Its rules still apply.",
          },
          {
            value: todays !== null ? String(todays) : "–",
            label: todays === 1 ? "alert to check today" : "alerts to check today",
            tone: todays !== null && todays > 0 ? (todays >= 10 ? "bad" : "warn") : "good",
            icon: "alert",
            hint: "“Worth a look” and “Needs attention” alerts since midnight that you haven't handled yet.",
            to: "/app/alerts?show=check",
          },
        ]}
      />
      )}

      {workOn || noTeam ? null : (
        <PlanLock module="work_time" compact title="Who's working">
          See who's working, who's on a break and why, and when each person started and finished their day.
        </PlanLock>
      )}
      <section className="dash-card" aria-labelledby="ov-team-title" hidden={!workOn || noTeam}>
        <div className="dash-card__head dash-card__head--split">
          <h2 className="dash-card__title" id="ov-team-title">
            Who's working
          </h2>
          <Link className="dash-link" to="/app/team">
            Team <DashIcon name="arrow" />
          </Link>
        </div>
        {members.data === undefined ? (
          <LoadingState label="Loading your team…" rows={3} />
        ) : activeMembers.length === 0 ? (
          <p className="dash-note">
            No team members yet.{" "}
            <Link className="dash-link" to="/app/team">
              Add your first
            </Link>{" "}
            to see who's working.
          </p>
        ) : (
          <ul className="ov-people">
            {activeMembers.slice(0, MAX_PEOPLE).map((member) => (
              <PersonStatus key={member.id} member={member} now={now} />
            ))}
            {activeMembers.length > MAX_PEOPLE ? (
              <li className="ov-person ov-person--more">
                <Link className="dash-link" to="/app/team">
                  +{activeMembers.length - MAX_PEOPLE} more <DashIcon name="arrow" />
                </Link>
              </li>
            ) : null}
          </ul>
        )}
      </section>

      <section className="dash-card" aria-labelledby="ov-alerts-title">
        <div className="dash-card__head dash-card__head--split">
          <div>
            <h2 className="dash-card__title" id="ov-alerts-title">
              Alerts to check
            </h2>
            {todays !== null ? (
              <p className="dash-card__sub">
                {todays === 0
                  ? "Nothing new to check today."
                  : `${todays} ${todays === 1 ? "alert" : "alerts"} to check today.`}
              </p>
            ) : null}
          </div>
          <Link className="dash-link" to="/app/alerts">
            See all <DashIcon name="arrow" />
          </Link>
        </div>
        {events.data === undefined ? (
          <LoadingState label="Loading alerts…" rows={3} />
        ) : (
          <AlertsTable
            events={alerts}
            resolveMember={resolveMember}
            now={now}
            caption="Most recent alerts to check"
            emptyText={
              noTeam
                ? "Alerts show here once a PC is connected."
                : "Nothing to check. Everything looks calm right now."
            }
            devices={devices.data}
            onDevicesChanged={devices.reload}
            onChanged={(event) => {
              if (event.handled_at) setHandledHere((s) => new Set(s).add(event.id));
            }}
          />
        )}
      </section>

      {/* The members' series: for the owner, and for owners they know (the share link is on every episode). */}
      <section className="dash-card ov-series" aria-labelledby="ov-series-title">
        <div className="dash-card__head dash-card__head--split">
          <h2 className="dash-card__title" id="ov-series-title">
            The Last File · free for business owners
          </h2>
          <Link className="dash-link" to="/blog/series/the-last-file">
            Read the series
          </Link>
        </div>
        <p className="dash-note">
          Short stories about the small mistakes that put company data at risk, each with a 10-minute fix for your team. Know an
          owner who'd find it useful? Every episode has a share link.
        </p>
      </section>

      {/* Free e-guides: worth handing to the team (scams, communication) as much as reading yourself. */}
      <section className="dash-card ov-series" aria-labelledby="ov-guides-title">
        <div className="dash-card__head dash-card__head--split">
          <h2 className="dash-card__title" id="ov-guides-title">
            Free guides for you and your team
          </h2>
          <Link className="dash-link" to="/blog/guides">
            See the guides
          </Link>
        </div>
        <p className="dash-note">
          Plain-English e-guides with workbooks and 30-day plans: protecting your business online, keeping data safe, stopping
          scams and communicating better at work. Share them with your team.
        </p>
      </section>
    </>
  );
}

function PersonStatus({ member, now }: { member: Member; now: number }): ReactElement {
  const status = presenceOf(member.device);
  const worked = member.device?.worked_seconds ?? 0;
  const showWorked = (status === "working" || status === "break") && worked > 0;
  return (
    <li className="ov-person">
      <span className="dash-pc__ico" aria-hidden="true">
        <DashIcon name="team" />
      </span>
      <span className="ov-person__text">
        <b>{member.name}</b>
        <small>
          {member.device
            ? `${member.device.hostname || "Unnamed PC"} · last seen ${formatRelative(member.device.last_seen_at, now, "never")}`
            : "No PC connected yet"}
        </small>
      </span>
      <span className="ov-person__status">
        <span className={`dash-status dash-status--${PRESENCE_CLASS[status]}`}>
          <i aria-hidden="true" />
          {PRESENCE_LABEL[status]}
        </span>
        {showWorked ? <small>{formatDuration(worked)} today</small> : null}
      </span>
    </li>
  );
}
