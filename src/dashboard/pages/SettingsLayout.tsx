import { useEffect, useState, type ReactElement } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { useEntitlements } from "../features/entitlements";
import { SectionNav, type Section } from "../settings/SectionNav";
import { PageHead } from "../shell/PageHead";

/** Board tab key → the route that keeps old email links working (/app/settings/*). */
const ROUTES = ["company", "billing", "password", "notifications"] as const;
type Route = (typeof ROUTES)[number];

/** The board's #tab= names (DashSettings.dc.html#tab=billing|notifications|account). */
const HASH_TAB: Record<string, Route> = {
  company: "company",
  billing: "billing",
  notifications: "notifications",
  notif: "notifications",
  account: "password",
  signin: "password",
  password: "password",
};

function routeOf(pathname: string): Route | null {
  const seg = pathname.replace(/\/+$/, "").split("/")[3] ?? "";
  return (ROUTES as readonly string[]).includes(seg) ? (seg as Route) : null;
}

/**
 * Settings (board DashSettings): Company, Plan & billing, Account & sign-in, Notifications. Each tab is its own
 * route (/app/settings/{company,billing,password,notifications}) rendered into <Outlet />. On a phone the tabs are
 * a row list; a row opens its section as its own screen with a back arrow (bare /app/settings shows the list).
 */
export default function SettingsLayout(): ReactElement {
  const { pathname, hash } = useLocation();
  const navigate = useNavigate();
  const { account } = useAuth();
  const ent = useEntitlements();
  const current = routeOf(pathname) ?? "company";
  const bare = routeOf(pathname) === null;

  // Old board links: /app/settings#tab=billing opens that tab.
  const hashTab = HASH_TAB[new URLSearchParams(hash.slice(1)).get("tab")?.toLowerCase() ?? ""];

  // Phone only: false = the row list, true = one section open (desktop ignores it). The bare URL shows the list,
  // and the layout stays mounted through the index redirect, so the list survives it.
  const [open, setOpen] = useState(!bare || hashTab !== undefined);
  const [seenPath, setSeenPath] = useState(pathname);
  if (pathname !== seenPath) {
    setSeenPath(pathname);
    if (bare && hashTab === undefined) setOpen(false);
  }

  useEffect(() => {
    if (hashTab) navigate(`/app/settings/${hashTab}`, { replace: true });
  }, [hashTab, navigate]);

  const planName = account?.subscription?.plan.name ?? ent.planName ?? "No plan yet";
  const pcs = ent.maxDevices > 0 ? `${ent.devicesUsed} of ${ent.maxDevices} PCs` : `${ent.devicesUsed} PCs`;
  const sections: Section[] = [
    { key: "company", label: "Company", desc: "Name, industry, city and GSTIN" },
    { key: "billing", label: "Plan & billing", desc: `${planName} · ${pcs} · payments and invoices` },
    { key: "password", label: "Account & sign-in", desc: "Password and where you’re signed in" },
    { key: "notifications", label: "Notifications", desc: "Browser notifications and the daily email" },
  ];

  return (
    <div className={`zp-set${open ? " zn-open" : ""}`}>
      {/* The header row sits outside the 1100 px column, so the bell is at the page's right edge. */}
      <PageHead title="Settings" lede="Your company, plan and payments, how you sign in, and what Zinwe tells you about." />
      <div className="zp-col">
        <SectionNav
          label="Settings"
          backLabel="Back to Settings"
          sections={sections}
          current={current}
          idPrefix="st-tab-"
          panelId="st-panel"
          onPick={(key) => {
            setOpen(true);
            if (key !== current || bare) navigate(`/app/settings/${key}`);
          }}
          onBack={() => setOpen(false)}
        />
        <div className="zp-panel" id="st-panel" role="tabpanel" aria-labelledby={`st-tab-${current}`}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
