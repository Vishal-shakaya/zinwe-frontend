import type { ReactElement, ReactNode } from "react";
import { Link } from "react-router-dom";
import type { PlanModule } from "../../lib/api";
import { MODULE_TITLES, useEntitlements } from "../features/entitlements";
import { ZIcon } from "../ui/ZIcon";

/**
 * A plan lock inside a v1.3 card (Rules sections, Reports schedules / PDF): what the owner gets, which plan has
 * it, and one button to the upgrade flow with that plan picked. Same rules as components/PlanLock.
 */
export function PlanNote({ module, title, children }: { module: PlanModule; title?: string; children: ReactNode }): ReactElement {
  const { upgradeFor } = useEntitlements();
  const plan = upgradeFor(module);
  return (
    <div
      role="region"
      aria-label={title ?? MODULE_TITLES[module]}
      style={{ display: "flex", flexWrap: "wrap", gap: "10px 14px", alignItems: "center", padding: "14px 16px", borderRadius: 12, background: "#FBFAF7", border: "1px solid #E7E3DA" }}
    >
      <span
        aria-hidden="true"
        style={{ flex: "none", width: 34, height: 34, borderRadius: 10, background: "#fff", border: "1px solid #E7E3DA", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#4A443C" }}
      >
        <ZIcon name="lock" size={16} />
      </span>
      <span style={{ flex: "1 1 260px", minWidth: 0 }}>
        <b>{title ?? MODULE_TITLES[module]}</b>
        <br />
        <span style={{ fontSize: 13, color: "#4A443C" }}>
          {children}
          {plan ? (
            <>
              {" "}
              Included in the <b>{plan.name}</b> plan.
            </>
          ) : null}
        </span>
      </span>
      <Link className="z-btn sm pri" to={plan ? `/app/upgrade?plan=${encodeURIComponent(plan.code)}` : "/app/upgrade"}>
        {plan ? `Upgrade to ${plan.name}` : "See plans"}
      </Link>
    </div>
  );
}
