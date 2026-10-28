import { useState, type ReactElement } from "react";
import { errorMessage, restoreUsb, type Device } from "../../lib/api";
import { sinceLabel } from "../features/memberStatus";
import { useNow } from "../time";
import { ZIcon } from "../ui/ZIcon";

/**
 * "USB read-only since 2:19 PM · Restore USB" for a PC whose USB Zinwe locked after a large copy (J5-02).
 * Nothing shows when the PC isn't locked (or the backend doesn't report it).
 */
export function UsbRestore({ device, onRestored }: { device: Device | undefined; onRestored?: () => void }): ReactElement | null {
  const now = useNow(60_000);
  const [busy, setBusy] = useState(false);
  const [asked, setAsked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!device?.usb_locked_at) return null;
  const restoring = asked || Boolean(device.usb_restore_requested_at);

  const restore = async () => {
    setBusy(true);
    setError(null);
    try {
      await restoreUsb(device.id);
      setAsked(true);
      onRestored?.();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="usb-lock" style={{ display: "inline-flex", flexWrap: "wrap", alignItems: "center", gap: "6px 10px" }}>
      <span className="z-pill red">
        <ZIcon name="usb" size={13} stroke={2} />
        USB read-only {sinceLabel(device.usb_locked_at, now)}
      </span>
      {restoring ? (
        <small style={{ fontSize: 12.5, color: "#4A443C" }}>Restoring — the PC picks it up within about a minute.</small>
      ) : (
        <button type="button" className="z-btn xs" onClick={() => void restore()} disabled={busy}>
          {busy ? "Restoring…" : "Restore USB"}
        </button>
      )}
      {error ? (
        <small className="z-err" role="alert">
          {error}
        </small>
      ) : null}
    </span>
  );
}

export default UsbRestore;
