import { useCallback, useState, type ReactElement } from "react";
import { usePageMeta } from "../../hooks/usePageMeta";
import {
  errorMessage,
  getNotificationPrefs,
  saveNotificationPrefs,
  type AlertNotifyLevel,
  type NotificationPrefs,
} from "../../lib/api";
import { FormAlert } from "../../portal/components/FormAlert";
import { ErrorState, LoadingState } from "../components/States";
import {
  askNotifyPermission,
  browserNotifyOn,
  notifyPermission,
  setBrowserNotify,
  showNotification,
  type NotifyPermission,
} from "../features/browserNotify";
import { useEntitlements } from "../features/entitlements";
import { Toggle } from "../features/policyControls";
import { useResource } from "../useResource";

const ALERT_LEVELS: ReadonlyArray<{ value: AlertNotifyLevel; label: string }> = [
  { value: "all", label: "Every alert" },
  { value: "warning", label: "Warnings and critical alerts" },
  { value: "critical", label: "Critical alerts only" },
  { value: "off", label: "No alerts" },
];

/**
 * Profile → Notifications (FR-15): switch on browser notifications in this browser, and choose what they're
 * for (member replies, alerts from a level up, break and log-out requests). The choices are saved on the
 * account, so they follow the owner to every browser; the on/off switch is per browser.
 */
export default function NotificationsPage(): ReactElement {
  usePageMeta({ title: "Notifications — Profile", description: "What Zinwe notifies you about in your browser." });
  const load = useCallback((signal: AbortSignal) => getNotificationPrefs(signal), []);
  const prefs = useResource(load);
  const { has } = useEntitlements();
  const [saved, setSaved] = useState<NotificationPrefs | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotifyPermission>(notifyPermission);
  const [here, setHere] = useState(browserNotifyOn);

  const current = saved ?? prefs.data;

  const save = async (patch: Partial<NotificationPrefs>) => {
    if (!current) return;
    setError(null);
    setSaved({ ...current, ...patch }); // show it at once; roll back on failure
    try {
      setSaved(await saveNotificationPrefs(patch));
    } catch (err) {
      setSaved(current);
      setError(errorMessage(err));
    }
  };

  const turnOn = async () => {
    const result = await askNotifyPermission();
    setPermission(result);
    setHere(browserNotifyOn());
  };

  return (
    <section className="dash-card notify-card" aria-labelledby="notify-title">
      <div className="dash-card__head">
        <h2 className="dash-card__title" id="notify-title">
          Notifications in this browser
        </h2>
        <p className="dash-card__sub">
          While Zinwe is open in a tab, even in the background, your computer shows a notification when something needs
          you. Click one to go straight to it.
        </p>
      </div>

      {permission === "unsupported" ? (
        <p className="dash-note">This browser can't show notifications. Try Chrome, Edge or Firefox on a computer.</p>
      ) : permission === "denied" ? (
        <p className="dash-note notify-card__blocked">
          Notifications are blocked for Zinwe in this browser. Click the lock icon next to the address, allow
          Notifications, then reload this page.
        </p>
      ) : permission === "default" ? (
        <button type="button" className="btn btn--primary dash-btn-sm" onClick={() => void turnOn()}>
          Turn on notifications
        </button>
      ) : (
        <div className="notify-card__row">
          <Toggle
            label="Show notifications in this browser"
            description="Switch off here to keep them on your other computers only."
            checked={here}
            onChange={(on) => {
              setBrowserNotify(on);
              setHere(on);
            }}
          />
          {here ? (
            <button
              type="button"
              className="btn btn--ghost dash-btn-sm"
              onClick={() => showNotification("Notifications are on", "This is how Zinwe will let you know.", "zinwe-test")}
            >
              Send a test
            </button>
          ) : null}
        </div>
      )}

      <hr className="notify-card__rule" />
      <h3 className="notify-card__sub">Notify me about</h3>
      <FormAlert message={error} />
      {current === undefined ? (
        prefs.error ? (
          <ErrorState message={errorMessage(prefs.error)} onRetry={prefs.reload} retrying={prefs.pending} />
        ) : (
          <LoadingState label="Loading your choices…" rows={3} />
        )
      ) : (
        <div className="notify-card__prefs">
          {has("team_chat") ? (
            <Toggle
              label="Replies from your team"
              description="When someone answers you in Chat."
              checked={current.chat}
              onChange={(chat) => void save({ chat })}
            />
          ) : null}
          {has("work_time") ? (
            <Toggle
              label="Break and log-out requests"
              description="When someone asks for your OK on Activity."
              checked={current.approvals}
              onChange={(approvals) => void save({ approvals })}
            />
          ) : null}
          <label className="dash-filter notify-card__level">
            <span>Alerts</span>
            <select value={current.alerts} onChange={(e) => void save({ alerts: e.target.value as AlertNotifyLevel })}>
              {ALERT_LEVELS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
    </section>
  );
}
