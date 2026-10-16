import { Suspense, useCallback, useEffect, useMemo, useState, type ReactElement } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import { Brand } from "../components/ui/Brand";
import { getAnnouncements, listMembers, type Announcement, type PlanModule } from "../lib/api";
import { DashIcon, type DashIconName } from "./components/DashIcon";
import { FeedbackForm } from "./components/FeedbackForm";
import { Modal } from "./components/Modal";
import { NotificationBar } from "./components/NotificationBar";
import { SupportWidget } from "./components/SupportWidget";
import { ChatBubble } from "./components/ChatBubble";
import { ChatLauncher } from "./components/ChatLauncher";
import { ChatBubbleContext, type ChatBubbleRequest } from "./features/chatBubble";
import { Tour } from "./components/Tour";
import { UpdatedTermsDialog } from "./components/UpdatedTermsDialog";
import { CHAT_READ_EVENT } from "./features/chatEvents";
import { useEntitlements } from "./features/entitlements";
import { DASHBOARD_TOUR, tourDone } from "./features/tour";
import { higherPlans, isUpgradeDone, UpgradeContext } from "./features/upgrade";
import { useResource } from "./useResource";
import { usePlans } from "../portal/usePlans";
import "../styles/dashboard.css";
import "../styles/portal.css";

interface NavItem {
  to: string;
  label: string;
  icon: DashIconName;
  end?: boolean;
  /** Sub-pages listed under the item while it's open. */
  children?: ReadonlyArray<{ to: string; label: string }>;
  /** A live count shown after the label ("unread" = member replies waiting in Chat). */
  badge?: "unread";
  /** Hook for the first-visit tour. */
  tour?: string;
  /** The page is one plan module: a lock shows beside it when the plan doesn't include it. */
  module?: PlanModule;
}

/**
 * Grouped by what an owner is trying to do: see today (Overview), protect the
 * business, look after people, then account chores. The bottom of the sidebar
 * holds the always-there utilities: plan + Upgrade, Help and Feedback (a modal;
 * /app/feedback stays for email links only).
 */
const NAV: ReadonlyArray<{ group?: string; items: readonly NavItem[] }> = [
  {
    items: [
      { to: "/app", label: "Overview", icon: "home", end: true, tour: "overview" },
      { to: "/app/alerts", label: "Alerts", icon: "alert", tour: "alerts" },
    ],
  },
  {
    group: "Protection",
    items: [
      { to: "/app/internet", label: "Online protection", icon: "globe", module: "web" },
      { to: "/app/data", label: "Data safety", icon: "usb" },
      { to: "/app/remote", label: "App monitoring", icon: "screen", module: "remote_access" },
    ],
  },
  {
    group: "People",
    items: [
      { to: "/app/team", label: "Team & devices", icon: "team", tour: "team" },
      { to: "/app/chat", label: "Chat", icon: "chat", badge: "unread", tour: "chat", module: "team_chat" },
      { to: "/app/activity", label: "Activity", icon: "activity", tour: "activity", module: "work_time" },
    ],
  },
  {
    group: "Account",
    items: [
      {
        to: "/app/settings",
        label: "Settings",
        icon: "settings",
        children: [
          { to: "/app/settings/company", label: "Company" },
          { to: "/app/settings/billing", label: "Billing" },
          { to: "/app/settings/password", label: "Password" },
        ],
      },
    ],
  },
];

function initials(name: string, email: string): string {
  const source = name.trim() || email;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (name.trim() ? (parts[1]?.[0] ?? "") : "")).toUpperCase() || "?";
}

/**
 * Owner dashboard shell: sidebar on desktop, a compact top bar with tabs on
 * phones. Pages render into <Outlet />.
 */
export default function AppLayout(): ReactElement {
  const { account, signOut, refresh } = useAuth();
  const user = account?.user ?? null;
  const companyName = account?.company?.name || user?.email || " ";
  const step = account?.onboarding.step;
  const inReview = step === "payment_review";
  // In the dashboard before paying (2026-10-16): a plan waiting for payment, or no plan chosen yet.
  const awaitingPayment = step === "payment";
  const noPlanYet = step === "plan";
  // Owners who haven't accepted the current Terms (signed up earlier, or the Terms changed) are asked once.
  const terms = user?.terms;
  const needsTerms = terms?.needs_acceptance === true;
  const location = useLocation();
  const { pathname, hash } = location;
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  // Navbar refresh: remounting the page reloads everything it shows.
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [touring, setTouring] = useState(() => !tourDone());
  // The floating chat bubble (one at a time); pages open it with useChatBubble().
  const [bubble, setBubble] = useState<ChatBubbleRequest | null>(null);
  const bubbleApi = useMemo(() => ({ open: (request: ChatBubbleRequest) => setBubble(request) }), []);
  const onLogout = () => {
    setLeaving(true);
    void signOut();
  };

  // Notification bar is non-critical: fetch once, ignore failures (keep the dashboard usable).
  useEffect(() => {
    const controller = new AbortController();
    getAnnouncements(controller.signal)
      .then(setAnnouncements)
      .catch(() => {
        /* offline or endpoint unavailable — show no bar */
      });
    return () => controller.abort();
  }, []);

  const entitlements = useEntitlements();
  const plans = usePlans();
  const subscription = account?.subscription ?? null;
  const currentPlan = subscription?.plan ?? null;
  const canUpgrade = plans.data ? higherPlans(plans.data, currentPlan?.code).length > 0 : true;
  const upgrade = useMemo(() => ({ open: () => navigate("/onboarding/plan"), canUpgrade }), [canUpgrade, navigate]);

  // Unread member replies, for the Chat badge (non-critical: failures just hide it).
  const loadMembers = useCallback((signal: AbortSignal) => listMembers(signal), []);
  const members = useResource(loadMembers, { pollMs: 60_000 });
  const unread = (members.data ?? []).reduce((sum, m) => sum + (m.is_active ? (m.unread ?? 0) : 0), 0);

  // Back from the upgrade flow: confirm the payment was sent, once.
  const upgradedTo = isUpgradeDone(location.state) ? location.state.upgradedTo : null;
  const closeUpgraded = () => navigate(pathname, { replace: true, state: null });

  const onRefresh = async () => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
    members.reload();
    await refresh();
    window.setTimeout(() => setRefreshing(false), 500);
  };

  // A chat thread just read a member's reply: refresh the Chat badge now, not on the next poll.
  const reloadMembers = members.reload;
  useEffect(() => {
    window.addEventListener(CHAT_READ_EVENT, reloadMembers);
    return () => window.removeEventListener(CHAT_READ_EVENT, reloadMembers);
  }, [reloadMembers]);

  // Help → "Take the tour" asks for a replay with this event.
  useEffect(() => {
    const start = () => setTouring(true);
    window.addEventListener("zinwe:tour", start);
    return () => window.removeEventListener("zinwe:tour", start);
  }, []);

  // Phones show the nav as a sideways-scrolling strip: keep the current tab in view.
  useEffect(() => {
    document.querySelector(".dash__nav .dash__link.active")?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [pathname]);

  // New page starts at the top; a hash (e.g. /app#add-pc) jumps to that section.
  useEffect(() => {
    const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
    if (target) target.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pathname, hash]);

  return (
    <div className="dash">
      <a className="dash-skip" href="#dash-main">
        Skip to content
      </a>
      <aside className="dash__side">
        <div className="dash__top">
          <Brand to="/app" ariaLabel="Zinwe dashboard home" className="dash__brand" height={26} />
          <button
            type="button"
            className={`dash__refresh${refreshing ? " is-spinning" : ""}`}
            onClick={() => void onRefresh()}
            disabled={refreshing}
            aria-label="Refresh everything"
            data-tip="Refresh everything"
          >
            <DashIcon name="refresh" />
          </button>
          <button type="button" className="dash__logout dash__logout--top" onClick={onLogout} disabled={leaving}>
            <DashIcon name="logout" />
            <span>{leaving ? "Logging out…" : "Log out"}</span>
          </button>
        </div>

        <nav className="dash__nav" aria-label="Dashboard">
          {NAV.map((section) => (
            <div
              key={section.group ?? "main"}
              className="dash__group"
              role="group"
              aria-label={section.group}
              data-tour={section.group === "Protection" ? "protection" : undefined}
            >
              {section.group ? (
                <span className="dash__group-label" aria-hidden="true">
                  {section.group}
                </span>
              ) : null}
              {section.items.map((item) => (
                <div key={item.to} className="dash__item">
                  <NavLink to={item.to} end={item.end} className="dash__link" data-tour={item.tour}>
                    <DashIcon name={item.icon} />
                    <span>{item.label}</span>
                    {item.module && !entitlements.has(item.module) ? (
                      <span className="dash__lock" aria-label="Not on your plan">
                        <DashIcon name="lock" />
                      </span>
                    ) : null}
                    {item.badge === "unread" && unread > 0 ? (
                      <span className="dash__badge" aria-label={`${unread} unread`}>
                        {unread}
                      </span>
                    ) : null}
                  </NavLink>
                  {item.children && pathname.startsWith(item.to) ? (
                    <div className="dash__sub">
                      {item.children.map((child) => (
                        <NavLink key={child.to} to={child.to} className="dash__sublink">
                          {child.label}
                        </NavLink>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ))}
          {/* Phones: Help joins the tab strip (the bottom utility area is desktop-only). */}
          <NavLink to="/app/help" className="dash__link dash__link--phone">
            <DashIcon name="help" />
            <span>Help</span>
          </NavLink>
        </nav>

        <div className="dash__util">
          <div className="dash__plan">
            <div className="dash__plan-text">
              <small>Your plan</small>
              <b>{currentPlan ? currentPlan.name : "No plan yet"}</b>
            </div>
            {canUpgrade ? (
              <button type="button" className="btn btn--primary dash-btn-sm dash__plan-btn" onClick={upgrade.open}>
                <DashIcon name="arrow" />
                Upgrade
              </button>
            ) : (
              <Link className="dash-link dash__plan-link" to="/app/settings/billing">
                Billing
              </Link>
            )}
          </div>
          <NavLink to="/app/help" className="dash__link">
            <DashIcon name="help" />
            <span>Help</span>
          </NavLink>
          <button type="button" className="dash__link dash__linkbtn" onClick={() => setFeedbackOpen(true)}>
            <DashIcon name="chat" />
            <span>Give feedback</span>
          </button>
        </div>

        <div className="dash__me">
          <span className="dash__avatar" aria-hidden="true">
            {user ? initials(user.full_name, user.email) : ""}
          </span>
          <div className="dash__who">
            <b>{user ? user.full_name || user.email : "Your account"}</b>
            <small>{companyName}</small>
          </div>
          <button
            type="button"
            className="dash__logout dash__logout--icon"
            onClick={onLogout}
            disabled={leaving}
            aria-label={leaving ? "Logging out" : "Log out"}
            title="Log out"
          >
            <DashIcon name="logout" />
          </button>
        </div>
      </aside>

      <main className="dash__main" id="dash-main" tabIndex={-1}>
        <div className="dash__inner">
          <NotificationBar items={announcements} />
          {awaitingPayment ? (
            <div className="dash-banner dash-banner--warn" role="status">
              <DashIcon name="card" />
              <span>
                <b>Your {account?.subscription?.plan.name ?? "new"} plan is waiting for payment.</b> You're on the Free
                features until it's paid.
              </span>
              <Link className="btn btn--primary dash-btn-sm" to="/onboarding/subscribe">
                Pay now
              </Link>
            </div>
          ) : null}
          {noPlanYet ? (
            <div className="dash-banner dash-banner--info" role="status">
              <DashIcon name="shield" />
              <span>
                <b>You're on the Free features.</b> Choose a plan to switch on full protection.
              </span>
              <Link className="btn btn--primary dash-btn-sm" to="/onboarding/plan">
                Choose a plan
              </Link>
            </div>
          ) : null}
          {inReview ? (
            <div className="dash-banner dash-banner--info" role="status">
              <DashIcon name="clock" />
              <span>
                <b>Your payment is being checked.</b> You can set things up meanwhile. We'll email you when your plan
                is active.
              </span>
              {pathname !== "/app/settings/billing" ? (
                <Link className="dash-link" to="/app/settings/billing">
                  Details
                </Link>
              ) : null}
            </div>
          ) : null}
          <Suspense
            fallback={
              <div className="dash-boot" role="status" aria-live="polite">
                Loading…
              </div>
            }
          >
            <UpgradeContext.Provider value={upgrade}>
              <ChatBubbleContext.Provider value={bubbleApi}>
                <Outlet key={refreshKey} />
              </ChatBubbleContext.Provider>
            </UpgradeContext.Provider>
          </Suspense>
        </div>
      </main>

      <Modal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        title="How's Zinwe working for you?"
        sub="Takes 20 seconds. The Zinwe team reads every response."
      >
        <FeedbackForm page={`modal:${pathname}`.slice(0, 120)} onDone={() => setFeedbackOpen(false)} />
      </Modal>

      {entitlements.has("team_chat") ? (
        <ChatLauncher
          members={members.data}
          onPick={(m) =>
            setBubble({
              person: { id: m.id, name: m.name, email: m.email, hostname: m.device?.hostname },
              onSent: () => members.reload(),
            })
          }
        />
      ) : null}
      <SupportWidget />
      {bubble ? (
        <ChatBubble
          key={`${bubble.person.id}-${bubble.event?.id ?? "chat"}-${bubble.tag ?? ""}`}
          request={bubble}
          onClose={() => setBubble(null)}
        />
      ) : null}
      {touring && !needsTerms ? <Tour steps={DASHBOARD_TOUR} onClose={() => setTouring(false)} /> : null}
      {needsTerms && !leaving ? (
        <UpdatedTermsDialog firstTime={!terms?.version} onAccepted={() => refresh()} onSignOut={onLogout} />
      ) : null}

      <Modal
        open={upgradedTo !== null}
        onClose={closeUpgraded}
        size="sm"
        title="Payment sent — thank you!"
        sub={`Your upgrade to ${upgradedTo ?? "your new plan"} is on its way.`}
      >
        <p className="dash-modal__text">
          We're matching your payment with our bank statement. As soon as it's confirmed, your plan switches to{" "}
          <b>{upgradedTo}</b> and we'll email you. Your current plan keeps working until then.
        </p>
        <div className="dash-confirm__actions">
          <button type="button" className="btn btn--primary dash-btn-sm" onClick={closeUpgraded}>
            Back to dashboard
          </button>
          <Link className="btn btn--ghost dash-btn-sm" to="/app/settings/billing" onClick={closeUpgraded}>
            See billing
          </Link>
        </div>
      </Modal>
    </div>
  );
}
