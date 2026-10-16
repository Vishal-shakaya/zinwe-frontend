import type { ReactElement, ReactNode } from "react";
import { Link } from "react-router-dom";
import type { PlanModule } from "../../lib/api";
import { cx } from "../../lib/cx";
import { MODULE_TITLES, useEntitlements } from "../features/entitlements";
import { DashIcon } from "./DashIcon";
import { PageHeader } from "./States";

interface PlanLockProps {
  module: PlanModule;
  /** One or two sentences on what the owner gets. */
  children: ReactNode;
  /** Card title; defaults to the module's name. */
  title?: string;
  /** Smaller card for a section inside a page (the default is page-sized). */
  compact?: boolean;
}

/**
 * Shown instead of a feature the owner's plan doesn't include: what it does, which plan has it,
 * and one button to the upgrade flow with that plan picked.
 */
export function PlanLock({ module, children, title, compact = false }: PlanLockProps): ReactElement {
  const { upgradeFor } = useEntitlements();
  const plan = upgradeFor(module);
  return (
    <div className={cx("dash-state dash-state--lock", compact && "dash-state--lock-compact")} role="region" aria-label={title ?? MODULE_TITLES[module]}>
      <span className="dash-state__mark">
        <DashIcon name="lock" />
      </span>
      <h3 className="dash-state__title">{title ?? MODULE_TITLES[module]}</h3>
      <div className="dash-state__body">
        {children}
        {plan ? (
          <p className="dash-lock__plan">
            Included in the <b>{plan.name}</b> plan.
          </p>
        ) : null}
      </div>
      <Link className="btn btn--primary dash-btn-sm" to={plan ? `/app/upgrade?plan=${encodeURIComponent(plan.code)}` : "/app/upgrade"}>
        <DashIcon name="arrow" />
        {plan ? `Upgrade to ${plan.name}` : "See plans"}
      </Link>
    </div>
  );
}

/** Renders `children` when the plan includes `module`, otherwise the lock card. */
export function PlanGate({
  module,
  lock,
  children,
  title,
  compact,
}: {
  module: PlanModule;
  /** The lock card's explanation. */
  lock: ReactNode;
  children: ReactNode;
  title?: string;
  compact?: boolean;
}): ReactElement {
  const { has } = useEntitlements();
  if (has(module)) return <>{children}</>;
  return (
    <PlanLock module={module} title={title} compact={compact}>
      {lock}
    </PlanLock>
  );
}

/**
 * A whole dashboard page that belongs to one module (Activity, Chat, Online protection): when the
 * plan doesn't include it, the page's heading + a lock card render instead, and the page itself
 * (and its API calls) never loads.
 */
export function PagePlanGate({
  module,
  title,
  lede,
  lock,
  children,
}: {
  module: PlanModule;
  title: string;
  lede: string;
  lock: ReactNode;
  children: ReactNode;
}): ReactElement {
  const { has } = useEntitlements();
  if (has(module)) return <>{children}</>;
  return (
    <>
      <PageHeader title={title} lede={lede} />
      <PlanLock module={module}>{lock}</PlanLock>
    </>
  );
}
