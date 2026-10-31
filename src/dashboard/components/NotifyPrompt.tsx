import { useEffect, useState, type ReactElement } from "react";
import { pushAvailable } from "../../lib/webPush";
import {
  dismissNotifyPrompt,
  notifyPermission,
  notifyPromptDismissed,
  NOTIFY_SWITCH_EVENT,
  turnOnHere,
} from "../features/browserNotify";
import { ZIcon } from "../ui/ZIcon";

/**
 * The slim banner that asks once (FR-15): only while the browser hasn't been answered and this browser hasn't said
 * "Not now". The browser's own question opens from the Turn on click, never by itself. "Even with Zinwe closed" is only
 * promised when it's true here. Blocked notifications get no banner: Settings → Notifications explains how to allow them.
 */
export function NotifyPrompt({ chat }: { chat: boolean }): ReactElement | null {
  const [permission, setPermission] = useState(notifyPermission);
  const [dismissed, setDismissed] = useState(notifyPromptDismissed);
  const [busy, setBusy] = useState(false);
  const [whenClosed, setWhenClosed] = useState(false);
  const waiting = permission === "default" && !dismissed;

  useEffect(() => {
    const sync = () => setPermission(notifyPermission());
    window.addEventListener(NOTIFY_SWITCH_EVENT, sync);
    return () => window.removeEventListener(NOTIFY_SWITCH_EVENT, sync);
  }, []);

  useEffect(() => {
    if (!waiting) return;
    const controller = new AbortController();
    void pushAvailable(controller.signal).then((yes) => {
      if (!controller.signal.aborted) setWhenClosed(yes);
    });
    return () => controller.abort();
  }, [waiting]);

  if (!waiting) return null;

  const what = chat ? "when a member messages you" : "when something needs you";
  const turnOn = async () => {
    setBusy(true);
    setPermission(await turnOnHere());
    setBusy(false);
  };
  const notNow = () => {
    dismissNotifyPrompt();
    setDismissed(true);
  };

  return (
    <div className="zn-banner info ask" role="status">
      <ZIcon name="bell" />
      <span>
        <b>Get told {what},</b>{" "}
        <span className="zn-banner__more">{whenClosed ? "even with Zinwe closed." : "even while Zinwe is in a background tab."}</span>
      </span>
      <button type="button" className="z-btn sm dark" onClick={() => void turnOn()} disabled={busy}>
        Turn on
      </button>
      <button type="button" className="z-btn sm" onClick={notNow}>
        Not now
      </button>
    </div>
  );
}
