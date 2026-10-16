import { type ReactElement } from "react";
import { Link } from "react-router-dom";
import { usePageMeta } from "../../hooks/usePageMeta";
import { errorMessage, type Policy } from "../../lib/api";
import { DashIcon } from "../components/DashIcon";
import { PlanLock } from "../components/PlanLock";
import { ErrorState, LoadingState, PageHeader } from "../components/States";
import { useEntitlements } from "../features/entitlements";
import { DataTransferCard, RemoteSoftwareCard, UsbCard, WebsiteCard } from "../features/policyControls";
import { usePolicy, type CommitPolicy } from "../features/usePolicy";
import { formatDateTime, formatRelative, useNow } from "../time";

/**
 * All settings in one place. Each protection also has its own feature page
 * (Online protection / Data safety / App monitoring) that pairs these same controls with a usage chart
 * and alerts; this page keeps the old /app/setup route working and gives a
 * single scroll for owners who prefer it.
 */
export default function SetupPage(): ReactElement {
  usePageMeta({ title: "Setup — Zinwe", description: "Turn features on or off and choose what your PCs allow." });

  const { policy, commit } = usePolicy();

  return (
    <>
      <PageHeader
        title="Setup"
        lede="Turn each protection on or off and choose how strict it is. One setup covers every PC on your account."
      />

      <nav className="dash-jump" aria-label="Jump to a feature page">
        <Link className="dash-jump__link" to="/app/internet">
          <DashIcon name="globe" />
          <span>Online protection</span>
        </Link>
        <Link className="dash-jump__link" to="/app/data">
          <DashIcon name="usb" />
          <span>Data safety</span>
        </Link>
        <Link className="dash-jump__link" to="/app/remote">
          <DashIcon name="screen" />
          <span>App monitoring</span>
        </Link>
      </nav>

      {policy.data === undefined ? (
        <section className="dash-card">
          {policy.error ? (
            <ErrorState
              title="We couldn't load your setup"
              message={errorMessage(policy.error)}
              onRetry={policy.reload}
              retrying={policy.pending}
            />
          ) : (
            <LoadingState label="Loading your setup…" rows={4} />
          )}
        </section>
      ) : (
        <SetupCards policy={policy.data} commit={commit} />
      )}
    </>
  );
}

/** Plan enforcement: each control shows only when the plan includes it; locked ones show a lock card. */
function SetupCards({ policy, commit }: { policy: Policy; commit: CommitPolicy }): ReactElement {
  const now = useNow();
  const { has } = useEntitlements();
  return (
    <>
      <p className="dash-set__meta" role="status">
        Setup version <b>{policy.version}</b> · changed{" "}
        <span title={formatDateTime(policy.updated_at)}>{formatRelative(policy.updated_at, now)}</span>. Every PC picks
        up your changes within about a minute, and keeps following them even without internet.
      </p>
      {has("usb_control") ? (
        <UsbCard block={policy.usb} commit={commit} />
      ) : (
        <PlanLock module="usb_control" compact>
          Make pen drives read-only or block them on every PC.
        </PlanLock>
      )}
      {has("web") ? (
        <WebsiteCard block={policy.web} commit={commit} />
      ) : (
        <PlanLock module="web" compact>
          Block risky website categories or any site you choose.
        </PlanLock>
      )}
      {has("data_transfer") ? <DataTransferCard block={policy.data_transfer} commit={commit} /> : null}
      {has("remote_access") ? (
        <RemoteSoftwareCard block={policy.remote_software} commit={commit} />
      ) : (
        <PlanLock module="remote_access" compact>
          Spot and block remote-control tools like AnyDesk, and see new software installs.
        </PlanLock>
      )}
    </>
  );
}
