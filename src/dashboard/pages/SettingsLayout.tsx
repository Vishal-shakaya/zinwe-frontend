import type { ReactElement } from "react";
import { Outlet } from "react-router-dom";
import { PageHeader } from "../components/States";
import { SubTabs, type SubTab } from "../components/SubTabs";

/** Profile's sections, as tabs on the page (the sidebar has one Profile item). */
const TABS: readonly SubTab[] = [
  { to: "/app/settings/company", label: "Company info", icon: "building" },
  { to: "/app/settings/billing", label: "Billing", icon: "card" },
  { to: "/app/settings/password", label: "Password", icon: "key" },
];

/**
 * Profile: company details, plan & payments, and the owner's password. The URLs stay
 * /app/settings/* so links in billing and renewal emails keep working.
 */
export default function SettingsLayout(): ReactElement {
  return (
    <>
      <PageHeader title="Profile" lede="Your company details, plan and payments, and the password you sign in with." />
      <SubTabs tabs={TABS} label="Profile sections" />
      <Outlet />
    </>
  );
}
