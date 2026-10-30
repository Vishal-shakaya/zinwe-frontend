import { useCallback, useState, type ReactElement } from "react";
import { usePageMeta } from "../../hooks/usePageMeta";
import { errorMessage, getNotificationPrefs, saveNotificationPrefs, type AlertNotifyLevel, type NotificationPrefs } from "../../lib/api";
import {
  askNotifyPermission,
  browserNotifyOn,
  notifyPermission,
  setBrowserNotify,
  showNotification,
  type NotifyPermission,
} from "../features/browserNotify";
import { useEntitlements } from "../features/entitlements";
import { SAMPLES_ON } from "../fixtures";
import { getNotifyExtras, saveNotifyExtras, type NotifyExtras } from "../fixtures/settings";
import { ErrorBlock, Sk } from "../ui/States";
import { useResource } from "../useResource";

/** The two alert switches on the board, as the account's one alert level (server: notifications/settings/). */
function needsOn(level: AlertNotifyLevel): boolean {
  return level !== "off";
}

function worthOn(level: AlertNotifyLevel): boolean {
  return level === "warning" || level === "all";
}

function Toggle({
  label,
  desc,
  on,
  onFlip,
  disabled,
}: {
  label: string;
  desc: string;
  on: boolean;
  onFlip: () => void;
  disabled?: boolean;
}): ReactElement {
  return (
    <div className="zp-nrow">
      <span>
        <b>{label}</b>
        <br />
        <span className="zp-k">{desc}</span>
      </span>
      <button type="button" className="zp-toggle" role="switch" aria-checked={on} aria-label={label} onClick={onFlip} disabled={disabled}>
        <span />
      </button>
    </div>
  );
}

/**
 * Settings → Notifications (board DashSettings #tab=notifications, FR-15): browser notifications in this browser,
 * and what they're for. Replies, Break and End day requests and the alert level are saved on the account (they
 * follow the owner to every browser); the on/off in this browser is per browser. Daily email: SAMPLE (fixtures/settings).
 */
export default function NotificationsPage(): ReactElement {
  usePageMeta({ title: "Notifications — Settings", description: "What Zinwe notifies you about." });
  const load = useCallback((signal: AbortSignal) => getNotificationPrefs(signal), []);
  const prefs = useResource(load);
  const loadExtras = useCallback((signal: AbortSignal) => getNotifyExtras(signal), []);
  const extras = useResource(loadExtras);
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

  const saveExtras = async (patch: Partial<NotifyExtras>) => {
    if (!extras.data) return;
    extras.setData({ ...extras.data, ...patch });
    extras.setData(await saveNotifyExtras(patch));
  };

  const turnOn = async () => {
    if (permission === "granted") {
      setBrowserNotify(true);
      setHere(true);
      return;
    }
    const result = await askNotifyPermission();
    setPermission(result);
    setHere(browserNotifyOn());
  };

  const on = permission === "granted" && here;
  const browserNote =
    permission === "unsupported"
      ? "This browser can't show notifications. Try Chrome, Edge or Firefox on a computer."
      : permission === "denied"
        ? "Blocked for Zinwe in this browser. Click the lock icon next to the address, allow Notifications, then reload."
        : on
          ? "You’ll get a notification even when Zinwe is in a background tab."
          : "Get a notification while Zinwe is open in a background tab.";

  return (
    <section className="z-card zp-card mid" aria-label="Notifications">
      <div className="zp-browser">
        <span>
          <b>Browser notifications</b>
          <br />
          <span className="zp-k">{browserNote}</span>
        </span>
        {permission === "unsupported" ? null : (
          <span className="zp-browser__acts">
            {on ? (
              <>
                <button
                  type="button"
                  className="zp-linkbtn"
                  onClick={() => showNotification("Notifications are on", "This is how Zinwe will let you know.", "zinwe-test")}
                >
                  Send a test
                </button>
                <button
                  type="button"
                  className="zp-linkbtn"
                  onClick={() => {
                    setBrowserNotify(false);
                    setHere(false);
                  }}
                >
                  Turn off here
                </button>
              </>
            ) : null}
            <button type="button" className="z-btn sm dark" onClick={() => void turnOn()} disabled={on || permission === "denied"}>
              {on ? "On in this browser" : permission === "denied" ? "Blocked" : "Turn on"}
            </button>
          </span>
        )}
      </div>

      {/* Same three lines, word for word, as the legend on Alerts. */}
      <div role="note" aria-label="How alerts are sorted" className="zp-legend">
        <b style={{ fontSize: 14 }}>How alerts are sorted</b>
        <span>
          <i aria-hidden="true" style={{ background: "#C0331C" }} />
          <span>
            <b>Needs you</b> — a transfer over your limit, a remote-control session, or anything blocked that someone tried again.
          </span>
        </span>
        <span>
          <i aria-hidden="true" style={{ background: "#A84505" }} />
          <span>
            <b>Worth a look</b> — small copies, new software, and blocked sites.
          </span>
        </span>
        <span>
          <i aria-hidden="true" style={{ background: "#404040" }} />
          <span>
            <b>Info</b> — normal activity, nothing to do.
          </span>
        </span>
      </div>

      {error ? (
        <div className="zp-bad" role="alert">
          {error}
        </div>
      ) : null}

      {current === undefined ? (
        prefs.error ? (
          <ErrorBlock title="We couldn't load your choices" message={errorMessage(prefs.error)} onRetry={prefs.reload} />
        ) : (
          <div role="status" aria-busy="true" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <span className="z-sr">Loading your choices…</span>
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="zp-nrow">
                <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  <Sk w="35%" h={12} />
                  <Sk w="60%" h={10} />
                </span>
                <Sk w={44} h={26} style={{ borderRadius: 999 }} />
              </div>
            ))}
          </div>
        )
      ) : (
        <>
          {has("team_chat") ? (
            <Toggle label="Replies from your team" desc="When someone answers you in Chat." on={current.chat} onFlip={() => void save({ chat: !current.chat })} />
          ) : null}
          {has("team_chat") ? (
            <Toggle
              label="Tasks"
              desc="When someone asks for help with a task, or finishes one and waits for your OK."
              on={current.tasks ?? true}
              onFlip={() => void save({ tasks: !(current.tasks ?? true) })}
            />
          ) : null}
          {has("work_time") ? (
            <Toggle
              label="Break and End day requests"
              desc="When someone is waiting for your OK. On by default so nobody waits."
              on={current.approvals}
              onFlip={() => void save({ approvals: !current.approvals })}
            />
          ) : null}
          <Toggle
            label="Needs you alerts"
            desc="Tell me as soon as one happens."
            on={needsOn(current.alerts)}
            onFlip={() => void save({ alerts: needsOn(current.alerts) ? "off" : worthOn(current.alerts) ? "warning" : "critical" })}
          />
          <Toggle
            label="Worth a look alerts"
            desc={SAMPLES_ON ? "When off, they wait in Alerts and the daily email." : "When off, they wait in Alerts."}
            on={worthOn(current.alerts)}
            onFlip={() => void save({ alerts: worthOn(current.alerts) ? (needsOn(current.alerts) ? "critical" : "off") : "warning" })}
          />
          {/* No digest preference in the API yet (sample, fixtures/settings.ts): not in production builds. */}
          {SAMPLES_ON ? (
            <Toggle
              label="Daily email summary"
              desc="One email at 7 PM with the day’s alerts and hours. Info alerts only show here and in Alerts."
              on={extras.data?.digest ?? false}
              disabled={extras.data === undefined}
              onFlip={() => void saveExtras({ digest: !(extras.data?.digest ?? false) })}
            />
          ) : null}
        </>
      )}
    </section>
  );
}
