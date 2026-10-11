import type { ReactElement } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { PageHeader } from "../components/States";

/** Each settings page's heading; the sidebar lists them under Settings (no tabs on the page). */
const SECTIONS: ReadonlyArray<{ path: string; title: string; lede: string }> = [
  { path: "/app/settings/company", title: "Company", lede: "The business details on your Zinwe account." },
  { path: "/app/settings/billing", title: "Billing", lede: "Your plan, what it costs and your payments." },
  { path: "/app/settings/password", title: "Password", lede: "Change the password you sign in with." },
];

/** Account settings: company details, plan & payments, and the owner's password. */
export default function SettingsLayout(): ReactElement {
  const { pathname } = useLocation();
  const section = SECTIONS.find((s) => pathname.startsWith(s.path)) ?? SECTIONS[0];
  return (
    <>
      <PageHeader title={section.title} lede={section.lede} />
      <Outlet />
    </>
  );
}
