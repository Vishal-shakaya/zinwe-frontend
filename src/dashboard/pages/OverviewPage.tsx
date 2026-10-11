import { useCallback, useMemo, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { usePageMeta } from "../../hooks/usePageMeta";
import { listDevices, listEvents, listMembers, type DeviceEvent, type Member } from "../../lib/api";
import { AlertsTable } from "../components/AlertsTable";
import { StatTiles } from "../components/StatTiles";
import { useUpgrade } from "../features/upgrade";
import { DashIcon } from "../components/DashIcon";
import { LoadingState, PageHeader } from "../components/States";
import { makeMemberResolver, severityOf } from "../features/events";
import { formatDuration, PRESENCE_CLASS, PRESENCE_LABEL, presenceOf } from "../features/memberStatus";
import { formatRelative, useNow } from "../time";
import { useResource } from "../useResource";

/** Overview is a glance: the few newest alerts, the rest live in Activity. */
const MAX_ALERTS = 5;
const MAX_PEOPLE = 6;

function startOfToday(now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function alertsToday(events: DeviceEvent[], now: number): number {
  const from = startOfToday(now);
  return events.filter((e) => severityOf(e) !== "info" && Date.parse(e.occurred_at) >= from).length;
}

/** The actionable alerts for the main table: warnings/criticals, newest first. */
function actionable(events: DeviceEvent[]): DeviceEvent[] {
  return events.filter((e) => severityOf(e) !== "info").slice(0, MAX_ALERTS);
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
  const now = useNow(60_000);

  const firstName = account?.user.full_name.trim().split(/\s+/)[0];
  const company = account?.company;
  const upgrade = useUpgrade();

  const activeMembers = useMemo(() => (members.data ?? []).filter((m) => m.is_active), [members.data]);
  const presence = useMemo(() => activeMembers.map((m) => presenceOf(m.device)), [activeMembers]);
  const working = presence.filter((p) => p === "working").length;
  const onBreak = presence.filter((p) => p === "break").length;
  const offline = presence.filter((p) => p === "offline").length;

  const alerts = events.data ? actionable(events.data) : [];
  const todays = events.data ? alertsToday(events.data, now) : null;
  const resolveMember = useMemo(() => makeMemberResolver(devices.data), [devices.data]);

  const loaded = members.data !== undefined;
  const num = (value: number) => (loaded ? String(value) : "–");

  return (
    <>
      <PageHeader
        title={firstName ? `Welcome, ${firstName}` : "Welcome"}
        lede={company ? `${company.name} · Here's your team today.` : "Here's your team today."}
        actions={
          upgrade.canUpgrade ? (
            <button type="button" className="btn btn--primary dash-btn-sm" onClick={upgrade.open}>
              <DashIcon name="arrow" />
              Upgrade plan
            </button>
          ) : null
        }
      />

      <StatTiles
        wide
        label="Team and alerts"
        tiles={[
          { value: num(activeMembers.length), label: activeMembers.length === 1 ? "team member" : "team members" },
          { value: num(working), label: "working now", tone: working > 0 ? "good" : undefined },
          { value: num(onBreak), label: "on break" },
          { value: num(offline), label: "offline" },
          {
            value: todays !== null ? String(todays) : "–",
            label: "alerts today",
            tone: todays !== null && todays > 0 ? "warn" : undefined,
          },
        ]}
      />

      <section className="dash-card" aria-labelledby="ov-team-title">
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
              Recent alerts
            </h2>
            {todays !== null ? (
              <p className="dash-card__sub">
                {todays === 0 ? "Nothing new today." : `${todays} ${todays === 1 ? "alert" : "alerts"} today.`}
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
            caption="Most recent alerts needing attention"
            emptyText="No alerts need attention. Everything looks calm right now."
          />
        )}
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
