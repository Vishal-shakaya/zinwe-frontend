import { useCallback, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { usePageMeta } from "../../hooks/usePageMeta";
import { listDevices, listEvents, type DeviceEvent } from "../../lib/api";
import { cx } from "../../lib/cx";
import { SubscriptionSummary } from "../../portal/components/SubscriptionSummary";
import { isTrialSubscription } from "../../portal/subscription";
import { DashIcon } from "../components/DashIcon";
import { LoadingState, PageHeader } from "../components/States";
import { useNow } from "../time";
import { useResource } from "../useResource";

const WEEK_MS = 7 * 86_400_000;

function alertsThisWeek(events: DeviceEvent[], now: number): number {
  return events.filter(
    (e) => (e.severity === "warning" || e.severity === "critical") && now - new Date(e.occurred_at).getTime() < WEEK_MS,
  ).length;
}

interface Task {
  label: string;
  detail: string;
  state: "done" | "doing" | "todo";
  to?: string;
  cta?: string;
}

export default function OverviewPage(): ReactElement {
  usePageMeta({ title: "Overview — Zinwe", description: "Your Zinwe account at a glance." });
  const { account } = useAuth();

  const loadDevices = useCallback((signal: AbortSignal) => listDevices(signal), []);
  const loadEvents = useCallback((signal: AbortSignal) => listEvents({ limit: 50 }, signal), []);
  const devices = useResource(loadDevices);
  const events = useResource(loadEvents);
  const now = useNow(60_000);

  const firstName = account?.user.full_name.trim().split(/\s+/)[0];
  const company = account?.company;
  const subscription = account?.subscription;
  const inReview = account?.onboarding.step === "payment_review";

  const active = devices.data?.filter((d) => !d.is_revoked) ?? [];
  const online = active.filter((d) => d.is_online).length;
  const alerts = events.data ? alertsThisWeek(events.data, now) : null;
  const count = (value: number | null, loaded: boolean) => (loaded && value !== null ? value : "–");

  const tasks: Task[] = [
    { label: "Create your account", detail: "Email confirmed.", state: "done" },
    { label: "Add your company", detail: company?.name ?? "Done.", state: "done" },
    inReview
      ? { label: "Activate your plan", detail: "Payment received, being checked.", state: "doing", to: "/app/billing", cta: "View" }
      : {
          label: "Activate your plan",
          detail: subscription
            ? isTrialSubscription(subscription)
              ? `${subscription.plan.name} free trial is on.`
              : `${subscription.plan.name} is active.`
            : "Done.",
          state: "done",
        },
    active.length > 0
      ? { label: "Add your first PC", detail: `${active.length} connected.`, state: "done" }
      : {
          label: "Add your first PC",
          detail: "Install the agent with your enrollment key. Takes about 5 minutes.",
          state: "todo",
          to: "/app/devices#add-pc",
          cta: "Add a PC",
        },
    {
      label: "Choose your USB rule",
      detail: "Allow, read-only or block USB drives on every PC.",
      state: "todo",
      to: "/app/rules",
      cta: "Set rule",
    },
  ];

  return (
    <>
      <PageHeader
        title={firstName ? `Welcome, ${firstName}` : "Welcome"}
        lede={company ? `${company.name} · Here's how things stand today.` : "Here's how things stand today."}
      />

      <ul className="dash-stats" aria-label="Summary">
        <li>
          <b>{count(active.length, devices.data !== undefined)}</b>
          <span>PCs connected</span>
        </li>
        <li className={cx(online > 0 && "is-good")}>
          <b>{count(online, devices.data !== undefined)}</b>
          <span>online now</span>
        </li>
        <li className={cx(alerts !== null && alerts > 0 && "is-warn")}>
          <b>{count(alerts, events.data !== undefined)}</b>
          <span>alerts this week</span>
        </li>
      </ul>

      <div className="ov-grid">
        <section className="dash-card" aria-labelledby="ov-setup-title">
          <div>
            <h2 className="dash-card__title" id="ov-setup-title">
              Get set up
            </h2>
            <p className="dash-card__sub">A few steps and Zinwe starts watching your PCs.</p>
          </div>
          <ol className="ov-tasks">
            {tasks.map((task) => (
              <li key={task.label} className={cx("ov-task", `ov-task--${task.state}`)}>
                <span className="ov-task__mark" aria-hidden="true">
                  {task.state === "done" ? <DashIcon name="check" /> : task.state === "doing" ? <DashIcon name="clock" /> : null}
                </span>
                <span className="ov-task__text">
                  <b>
                    {task.label}
                    <span className="dash-sr">
                      {task.state === "done" ? " (done)" : task.state === "doing" ? " (in progress)" : " (to do)"}
                    </span>
                  </b>
                  <span>{task.detail}</span>
                </span>
                {task.to && task.cta ? (
                  <Link
                    className={cx("btn dash-btn-sm", task.state === "todo" && task.to.includes("devices") ? "btn--primary" : "btn--ghost")}
                    to={task.to}
                  >
                    {task.cta}
                  </Link>
                ) : null}
              </li>
            ))}
          </ol>
        </section>

        {subscription ? (
          <SubscriptionSummary
            subscription={subscription}
            action={
              <Link className="dash-link" to="/app/billing">
                Billing details <DashIcon name="arrow" />
              </Link>
            }
          />
        ) : (
          <section className="dash-card">
            <LoadingState label="Loading your plan…" rows={2} />
          </section>
        )}
      </div>
    </>
  );
}
