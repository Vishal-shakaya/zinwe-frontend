import type { ReactElement } from "react";
import { Outlet } from "react-router-dom";
import { PageHeader } from "../components/States";
import { SubTabs, type SubTab } from "../components/SubTabs";

const TABS: readonly SubTab[] = [
  { to: "/app/help/guide", label: "How to use", icon: "book" },
  { to: "/app/help/policies", label: "Policies", icon: "shield" },
  { to: "/app/help/feedback", label: "Feedback", icon: "chat" },
];

/** Help: a short how-to, what Zinwe does and doesn't record, and a way to tell us what to fix. */
export default function HelpLayout(): ReactElement {
  return (
    <>
      <PageHeader
        title="Help"
        lede={
          <>
            Quick answers for getting set up. Still stuck? Email{" "}
            <a className="dash-link" href="mailto:hello@zinwe.io">
              hello@zinwe.io
            </a>
            .
          </>
        }
      />
      <SubTabs tabs={TABS} label="Help sections" />
      <Outlet />
    </>
  );
}
