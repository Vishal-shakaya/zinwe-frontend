import type { ReactElement } from "react";
import { NavLink } from "react-router-dom";
import { DashIcon, type DashIconName } from "./DashIcon";

export interface SubTab {
  to: string;
  label: string;
  icon: DashIconName;
  /** Match only this exact path (for a parent tab like /app/team beside /app/team/chat). */
  end?: boolean;
  /** Small count after the label, e.g. unread messages. Hidden when 0. */
  badge?: number;
}

/** Underlined tabs under a page header (Settings, Help). Each tab is its own route, so it can be linked to. */
export function SubTabs({ tabs, label }: { tabs: readonly SubTab[]; label: string }): ReactElement {
  return (
    <nav className="dash-tabs" aria-label={label}>
      {tabs.map((tab) => (
        <NavLink key={tab.to} to={tab.to} end={tab.end} className="dash-tabs__link">
          <DashIcon name={tab.icon} />
          <span>{tab.label}</span>
          {tab.badge ? (
            <span className="dash-tabs__badge" aria-label={`${tab.badge} unread`}>
              {tab.badge}
            </span>
          ) : null}
        </NavLink>
      ))}
    </nav>
  );
}

export default SubTabs;
