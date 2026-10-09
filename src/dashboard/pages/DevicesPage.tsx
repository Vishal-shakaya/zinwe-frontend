import { useCallback, useEffect, useState, type ReactElement } from "react";
import { Link, useLocation } from "react-router-dom";
import { usePageMeta } from "../../hooks/usePageMeta";
import {
  errorMessage,
  getEnrollmentKey,
  listDevices,
  rotateEnrollmentKey,
  type Device,
  type EnrollmentKey,
} from "../../lib/api";
import { cx } from "../../lib/cx";
import { CopyButton } from "../components/CopyButton";
import { DashIcon } from "../components/DashIcon";
import { EmptyState, ErrorState, LoadingState, PageHeader, RefreshButton, StaleBanner } from "../components/States";
import { formatDateTime, formatRelative, useNow } from "../time";
import { useResource } from "../useResource";

const PLATFORM_LABEL: Record<string, string> = { windows: "Windows", linux: "Linux", macos: "macOS" };

type DeviceStatus = "online" | "offline" | "waiting" | "removed";

function statusOf(device: Device): DeviceStatus {
  if (device.is_revoked) return "removed";
  if (device.is_online) return "online";
  return device.last_seen_at ? "offline" : "waiting";
}

const STATUS_LABEL: Record<DeviceStatus, string> = {
  online: "Online",
  offline: "Offline",
  waiting: "Waiting for first check-in",
  removed: "Removed",
};

const STATUS_ORDER: Record<DeviceStatus, number> = { online: 0, offline: 1, waiting: 2, removed: 3 };

function sortDevices(devices: Device[]): Device[] {
  return [...devices].sort(
    (a, b) =>
      STATUS_ORDER[statusOf(a)] - STATUS_ORDER[statusOf(b)] ||
      a.hostname.localeCompare(b.hostname, undefined, { sensitivity: "base" }),
  );
}

export default function DevicesPage(): ReactElement {
  usePageMeta({ title: "Devices — Zinwe", description: "The PCs protected by Zinwe and how to add more." });

  const loadDevices = useCallback((signal: AbortSignal) => listDevices(signal), []);
  const devices = useResource(loadDevices, { pollMs: 60_000 });
  const now = useNow();
  const { hash } = useLocation();

  // "Add your first PC" links from other pages land on /app#add-pc.
  useEffect(() => {
    if (hash === "#add-pc") document.getElementById("add-pc")?.scrollIntoView();
  }, [hash]);

  const list = devices.data ? sortDevices(devices.data) : [];
  const active = list.filter((d) => !d.is_revoked);
  const online = active.filter((d) => d.is_online).length;
  const offline = active.length - online;

  return (
    <>
      <PageHeader
        title="Devices"
        lede="Every PC with the Zinwe agent installed. Each one checks in about once a minute."
        actions={<RefreshButton onClick={devices.reload} pending={devices.pending} />}
      />

      {devices.data && active.length > 0 ? (
        <ul className="dash-stats" aria-label="Summary">
          <li>
            <b>{active.length}</b>
            <span>{active.length === 1 ? "PC connected" : "PCs connected"}</span>
          </li>
          <li className="is-good">
            <b>{online}</b>
            <span>online now</span>
          </li>
          <li className={cx(offline > 0 && "is-warn")}>
            <b>{offline}</b>
            <span>offline</span>
          </li>
        </ul>
      ) : null}

      <section className="dash-card" aria-labelledby="pcs-title">
        <div className="dash-card__head">
          <h2 className="dash-card__title" id="pcs-title">
            Your PCs
          </h2>
        </div>

        {devices.data === undefined ? (
          devices.error ? (
            <ErrorState
              title="We couldn't load your PCs"
              message={errorMessage(devices.error)}
              onRetry={devices.reload}
              retrying={devices.pending}
            />
          ) : (
            <LoadingState label="Loading your PCs…" />
          )
        ) : list.length === 0 ? (
          <EmptyState
            icon="pc"
            title="No PCs connected yet"
            action={
              <a className="btn btn--primary dash-btn-sm" href="#add-pc">
                Add your first PC <span className="arr">→</span>
              </a>
            }
          >
            Install the Zinwe agent on a PC with your enrollment key below. It shows up here within about a minute.
          </EmptyState>
        ) : (
          <>
            {devices.error ? <StaleBanner message={errorMessage(devices.error)} onRetry={devices.reload} /> : null}
            <div className="dash-table" role="table" aria-label="Your PCs">
              <div className="dash-table__row dash-table__row--head" role="row">
                <span role="columnheader">PC</span>
                <span role="columnheader">Status</span>
                <span role="columnheader">Last check-in</span>
                <span role="columnheader">Agent</span>
                <span role="columnheader">
                  <span className="dash-sr">Activity</span>
                </span>
              </div>
              {list.map((device) => (
                <DeviceRow key={device.id} device={device} now={now} />
              ))}
            </div>
            {offline > 0 ? (
              <p className="dash-note">
                A PC shows <b>Offline</b> when it hasn't checked in for 3 minutes, usually because it's switched off
                or has no internet. Its rules stay active either way.
              </p>
            ) : null}
          </>
        )}
      </section>

      <AddPcCard />
    </>
  );
}

function DeviceRow({ device, now }: { device: Device; now: number }): ReactElement {
  const status = statusOf(device);
  const platform = PLATFORM_LABEL[device.platform] ?? device.platform;
  const system = [platform, device.os_version].filter(Boolean).join(" · ");

  return (
    <div className={cx("dash-table__row", status === "removed" && "is-muted")} role="row">
      <span role="cell" className="dash-pc">
        <span className="dash-pc__ico" aria-hidden="true">
          <DashIcon name="pc" />
        </span>
        <span className="dash-pc__text">
          <b className="dash-pc__name">{device.hostname || "Unnamed PC"}</b>
          <small>{system || "Unknown system"}</small>
        </span>
      </span>
      <span role="cell" data-label="Status">
        <span className={`dash-status dash-status--${status}`}>
          <i aria-hidden="true" />
          {STATUS_LABEL[status]}
        </span>
      </span>
      <span role="cell" data-label="Last check-in" title={formatDateTime(device.last_seen_at)}>
        {formatRelative(device.last_seen_at, now, "Not yet")}
      </span>
      <span role="cell" data-label="Agent" className="dash-mono">
        {device.agent_version ? `v${device.agent_version.replace(/^v/i, "")}` : "—"}
      </span>
      <span role="cell" className="dash-table__end">
        <Link className="dash-link" to={`/app/activity?device=${device.id}`}>
          Activity <span className="dash-sr">for {device.hostname}</span>
          <DashIcon name="arrow" />
        </Link>
      </span>
    </div>
  );
}

function installCommand(key: string): string {
  return `msiexec /i ZinweAgent.msi ENROLLMENT_KEY=${key} /qn`;
}

function AddPcCard(): ReactElement {
  const loadKey = useCallback((signal: AbortSignal) => getEnrollmentKey(signal), []);
  const key = useResource<EnrollmentKey>(loadKey);
  const now = useNow();

  const [confirming, setConfirming] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [rotateError, setRotateError] = useState<string | null>(null);
  const [rotated, setRotated] = useState(false);

  const rotate = async () => {
    setRotating(true);
    setRotateError(null);
    try {
      key.setData(await rotateEnrollmentKey());
      setConfirming(false);
      setRotated(true);
    } catch (error) {
      setRotateError(errorMessage(error));
    } finally {
      setRotating(false);
    }
  };

  return (
    <section className="dash-card" id="add-pc" aria-labelledby="add-pc-title">
      <div className="dash-card__head">
        <h2 className="dash-card__title" id="add-pc-title">
          Add a PC
        </h2>
        <p className="dash-card__sub">Three steps, about two minutes per PC. No IT knowledge needed.</p>
      </div>

      {key.data === undefined ? (
        key.error ? (
          <ErrorState
            title="We couldn't load your enrollment key"
            message={errorMessage(key.error)}
            onRetry={key.reload}
            retrying={key.pending}
          />
        ) : (
          <LoadingState label="Loading your enrollment key…" rows={2} />
        )
      ) : (
        <ol className="dash-steps">
          <li>
            <div className="dash-steps__text">
              <b>Copy your enrollment key.</b>
              <span>It links a PC to your account. Keep it private, like a password.</span>
            </div>
            <div className="dash-key">
              <code className="dash-key__value">{key.data.key}</code>
              <CopyButton text={key.data.key} label="Copy key" what="enrollment key" />
            </div>
            <p className="dash-key__meta">
              Created <span title={formatDateTime(key.data.created_at)}>{formatRelative(key.data.created_at, now)}</span>
              {" · "}
              Last used{" "}
              <span title={formatDateTime(key.data.last_used_at)}>
                {formatRelative(key.data.last_used_at, now, "never")}
              </span>
            </p>

            {rotated ? (
              <p className="dash-banner dash-banner--ok" role="status">
                <DashIcon name="check" />
                <span>New key ready. PCs you already added keep working. Use this key for the next one.</span>
              </p>
            ) : null}

            {confirming ? (
              <div className="dash-confirm" role="group" aria-labelledby="rotate-q">
                <p id="rotate-q">
                  <b>Get a new key?</b> PCs you already added keep working. The current key stops working straight
                  away, so nobody can use it to add PCs any more.
                </p>
                {rotateError ? (
                  <p className="form__err" role="alert">
                    {rotateError}
                  </p>
                ) : null}
                <div className="dash-confirm__actions">
                  <button type="button" className="btn btn--ink dash-btn-sm" onClick={rotate} disabled={rotating}>
                    {rotating ? "Getting a new key…" : "Yes, get a new key"}
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost dash-btn-sm"
                    onClick={() => {
                      setConfirming(false);
                      setRotateError(null);
                    }}
                    disabled={rotating}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="dash-link dash-link--quiet"
                onClick={() => {
                  setConfirming(true);
                  setRotated(false);
                }}
              >
                <DashIcon name="key" />
                Think someone else has this key? Get a new one
              </button>
            )}
          </li>
          <li>
            <div className="dash-steps__text">
              <b>Run the installer on the PC.</b>
              <span>
                Put <span className="dash-mono">ZinweAgent.msi</span> on the PC, open Command Prompt as administrator in
                that folder, then paste this command and press Enter.
              </span>
            </div>
            <div className="dash-cmd">
              <code className="dash-cmd__value">{installCommand(key.data.key)}</code>
              <CopyButton text={installCommand(key.data.key)} label="Copy command" what="install command" />
            </div>
          </li>
          <li>
            <div className="dash-steps__text">
              <b>Check it appears above.</b>
              <span>
                The PC shows up in <i>Your PCs</i> within about a minute and starts following your{" "}
                <Link className="dash-link" to="/app/rules">
                  rules
                </Link>
                .
              </span>
            </div>
          </li>
        </ol>
      )}
    </section>
  );
}
