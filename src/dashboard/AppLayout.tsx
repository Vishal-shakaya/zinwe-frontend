import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactElement } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import { paymentInCheck, rejectedPayment } from "../auth/steps";
import { Brand } from "../components/ui/Brand";
import { getAnnouncements, listMembers, type Announcement, type PlanModule, type Subscription } from "../lib/api";
import { formatDate, formatMoney } from "../lib/format";
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
import { DASHBOARD_TOUR, syncTourFlag, tourDone, type TourStep } from "./features/tour";
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

const DAY_MS = 86_400_000;
/** No "upgrade" nudge this many days after signing up or paying, unless every PC slot is taken (J5-06, J3-13). */
const QUIET_DAYS = 7;

function withinDays(iso: string | null | undefined, days: number, now: number): boolean {
  const at = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(at) && now - at < days * DAY_MS;
}

/** The PC-limit upgrade bar (backend id "upgrade-limit:…"): a real trigger, unlike "what the next plan adds". */
function isLimitBar(item: Announcement): boolean {
  return item.kind === "upgrade" && item.id.startsWith("upgrade-limit");
}

/**
 * The bars to show. Nothing sells an upgrade while one is being checked (J3-01). In the first week and
 * right after a payment only the PC-limit bar may show. On Team the page has its own PC-limit notice,
 * so the bar isn't shown twice (J3-19, J5-20).
 */
function visibleAnnouncements(
  items: Announcement[],
  { upgradeInCheck, quiet, onTeamPage }: { upgradeInCheck: boolean; quiet: boolean; onTeamPage: boolean },
): Announcement[] {
  return items.filter((item) => {
    if (item.kind !== "upgrade") return true;
    if (upgradeInCheck) return false;
    if (isLimitBar(item)) return !onTeamPage;
    return !quiet;
  });
}

const PLAN_ACTIVE_KEY = "zinwe.planActive.seen";

/** What the one-time "your plan is active" banner is for (changes with each new plan or payment), or null. */
function planActiveId(subscription: Subscription | null | undefined, now: number): string | null {
  if (!subscription || subscription.status !== "active") return null;
  const payment = subscription.latest_payment;
  if (payment?.status === "verified" && withinDays(payment.reviewed_at, QUIET_DAYS, now)) return `pay:${payment.id}`;
  if (!payment && !subscription.plan.requires_payment && withinDays(subscription.starts_at ?? subscription.created_at, QUIET_DAYS, now)) {
    return `plan:${subscription.id}:${subscription.plan.code}`;
  }
  return null;
}

function readSeen(): string | null {
  try {
    return localStorage.getItem(PLAN_ACTIVE_KEY);
  } catch {
    return null;
  }
}

function writeSeen(id: string): void {
  try {
    localStorage.setItem(PLAN_ACTIVE_KEY, id);
  } catch {
    /* storage blocked: it shows again next visit, harmless */
  }
}

/** The tour's last step: "Add your first person" for a new owner, a plain "Done" once the team exists. */
function tourSteps(hasTeam: boolean): readonly TourStep[] {
  if (!hasTeam) return DASHBOARD_TOUR;
  return DASHBOARD_TOUR.map((step) =>
    step.cta
      ? {
          ...step,
          title: "Your team",
          body: "Each person has their own ID to connect their PC. Their card shows the PC, consent and a week of use.",
          cta: undefined,
        }
      : step,
  );
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
  const onChatPage = pathname.startsWith("/app/chat");
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  // Navbar refresh: remounting the page reloads everything it shows.
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  // The tour plays once per account, on Overview only (J2-06, J5-25); Help → "Take the tour" replays it anywhere.
  const [tourClosed, setTourClosed] = useState(false);
  const [tourReplay, setTourReplay] = useState(false);
  const touring = tourReplay || (!tourClosed && user !== null && pathname === "/app" && !tourDone(user));
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const menuClose = useRef<HTMLButtonElement>(null);
  // The floating chat bubble (one at a time); pages open it with useChatBubble().
  const [bubble, setBubble] = useState<ChatBubbleRequest | null>(null);
  const bubbleApi = useMemo(() => ({ open: (request: ChatBubbleRequest) => setBubble(request) }), []);
  // Opening the Chat page closes the floating bubble (the page shows the same conversation).
  // Adjusted while rendering, on the change only (React's pattern for state that follows a prop).
  const [wasOnChatPage, setWasOnChatPage] = useState(onChatPage);
  if (onChatPage !== wasOnChatPage) {
    setWasOnChatPage(onChatPage);
    if (onChatPage) setBubble(null);
  }
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
  // An upgrade (or renewal) payment being checked: nothing offers the upgrade again until it's confirmed (J3-01).
  const inCheck = paymentInCheck(subscription);
  const rejected = rejectedPayment(subscription);
  const canUpgrade = inCheck ? false : plans.data ? higherPlans(plans.data, currentPlan?.code).length > 0 : true;
  const [now] = useState(() => Date.now());
  const lastPaidAt = subscription?.latest_payment?.status === "verified" ? subscription.latest_payment.reviewed_at : null;
  const quiet = withinDays(user?.date_joined, QUIET_DAYS, now) || withinDays(lastPaidAt, QUIET_DAYS, now);
  const bars = visibleAnnouncements(announcements, {
    upgradeInCheck: inCheck !== null,
    quiet,
    onTeamPage: pathname.startsWith("/app/team"),
  });

  // Once, after a plan goes active: "Startups is active until 17 Nov" (J3-13, J5-06).
  const activeId = planActiveId(subscription, now);
  const [planActiveShown, setPlanActiveShown] = useState<string | null>(null);
  const [planActiveClosed, setPlanActiveClosed] = useState(false);
  if (activeId && planActiveShown === null && !planActiveClosed && readSeen() !== activeId) setPlanActiveShown(activeId);
  useEffect(() => {
    if (planActiveShown) writeSeen(planActiveShown);
  }, [planActiveShown]);
  const showPlanActive = planActiveShown !== null && !planActiveClosed && subscription?.status === "active";
  const upgrade = useMemo(() => ({ open: () => navigate("/onboarding/plan"), canUpgrade }), [canUpgrade, navigate]);

  // Unread member replies, for the Chat badge (non-critical: failures just hide it).
  const loadMembers = useCallback((signal: AbortSignal) => listMembers(signal), []);
  const members = useResource(loadMembers, { pollMs: 60_000 });
  const unread = (members.data ?? []).reduce((sum, m) => sum + (m.is_active ? (m.unread ?? 0) : 0), 0);
  const hasTeam = (members.data ?? []).some((m) => m.is_active);

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
    const start = () => setTourReplay(true);
    window.addEventListener("zinwe:tour", start);
    return () => window.removeEventListener("zinwe:tour", start);
  }, []);

  // Seen on this browser before the account kept the flag: tell the account once.
  const tourSynced = useRef(false);
  useEffect(() => {
    if (tourSynced.current || !user) return;
    tourSynced.current = true;
    syncTourFlag(user);
  }, [user]);
  const closeTour = (goTo?: string) => {
    setTourClosed(true);
    setTourReplay(false);
    if (goTo) navigate(goTo);
  };

  // Phones: the sidebar is a slide-in menu. It closes on navigation (a link tap), Escape or the scrim, and
  // the page behind doesn't scroll while it's open.
  useEffect(() => {
    if (!menuOpen) return;
    document.documentElement.classList.add("dash-menu-open");
    menuClose.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.classList.remove("dash-menu-open");
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // New page starts at the top; a hash (e.g. /app#add-pc) jumps to that section.
  useEffect(() => {
    const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
    if (target) target.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pathname, hash]);

  return (
    <div className={`dash${menuOpen ? " is-menu-open" : ""}`}>
      <a className="dash-skip" href="#dash-main">
        Skip to content
      </a>
      <aside className="dash__side">
        <div className="dash__top">
          {/* Phones only: opens the menu (everything the desktop sidebar holds). */}
          <button
            ref={menuButton}
            type="button"
            className="dash__menu-btn"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            aria-controls="dash-menu"
            onClick={() => setMenuOpen(true)}
          >
            <span aria-hidden="true" />
            <span aria-hidden="true" />
            <span aria-hidden="true" />
            {unread > 0 ? <i className="dash__menu-dot" aria-label={`${unread} unread`} /> : null}
          </button>
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
        </div>

        {/* Desktop: the sidebar's own contents (display: contents). Phones: the slide-in menu. */}
        <div
          className="dash__panel"
          id="dash-menu"
          onClick={(e: MouseEvent<HTMLDivElement>) => {
            if ((e.target as HTMLElement).closest("a")) setMenuOpen(false);
          }}
        >
          <div className="dash__panel-head">
            <Brand to="/app" ariaLabel="Zinwe dashboard home" height={24} />
            <button
              ref={menuClose}
              type="button"
              className="dash__panel-close"
              aria-label="Close menu"
              onClick={() => {
                setMenuOpen(false);
                menuButton.current?.focus();
              }}
            >
              <DashIcon name="close" />
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
          </nav>

          <div className="dash__util">
            <div className="dash__plan">
              <div className="dash__plan-text">
                <small>Your plan</small>
                <b>{currentPlan ? currentPlan.name : "No plan yet"}</b>
              </div>
              {inCheck ? (
                <Link className="dash-link dash__plan-link" to="/app/settings/billing">
                  Being checked
                </Link>
              ) : canUpgrade ? (
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
            <button
              type="button"
              className="dash__link dash__linkbtn"
              onClick={() => {
                setMenuOpen(false);
                setFeedbackOpen(true);
              }}
            >
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
        </div>
        {menuOpen ? <button type="button" className="dash__scrim" aria-label="Close menu" tabIndex={-1} onClick={() => setMenuOpen(false)} /> : null}
      </aside>

      <main className="dash__main" id="dash-main" tabIndex={-1}>
        <div className="dash__inner">
          <NotificationBar items={bars} />
          {showPlanActive && subscription ? (
            <div className="dash-banner dash-banner--ok dash-banner--compact" role="status">
              <DashIcon name="check" />
              <span>
                <b>
                  {subscription.plan.requires_payment && subscription.ends_at
                    ? `${subscription.plan.name} is active until ${formatDate(subscription.ends_at)}.`
                    : `Your ${subscription.plan.name} plan is active.`}
                </b>{" "}
                <span className="dash-banner__more">
                  {subscription.plan.requires_payment
                    ? "Thank you for your payment."
                    : hasTeam
                      ? "Thank you for choosing Zinwe."
                      : "Add your first person to get protected."}
                </span>
              </span>
              <button
                type="button"
                className="dash-banner__x"
                aria-label="Dismiss"
                onClick={() => setPlanActiveClosed(true)}
              >
                <DashIcon name="close" />
              </button>
            </div>
          ) : null}
          {rejected && pathname !== "/app/settings/billing" ? (
            <div className="dash-banner dash-banner--warn dash-banner--compact" role="alert">
              <DashIcon name="alert" />
              <span>
                <b>
                  We couldn't confirm your {formatMoney(rejected.amount_inr, rejected.currency)} payment
                  {rejected.rejection_reason ? `: ${rejected.rejection_reason.replace(/\.$/, "")}.` : "."}
                </b>{" "}
                <span className="dash-banner__more">
                  {subscription?.status === "active"
                    ? `Your ${subscription.plan.name} plan keeps working meanwhile.`
                    : "You're on the Free features until it's confirmed."}
                </span>
              </span>
              <Link className="btn btn--primary dash-btn-sm" to="/app/settings/billing">
                Send it again
              </Link>
            </div>
          ) : null}
          {inCheck && pathname !== "/app/settings/billing" ? (
            <div className="dash-banner dash-banner--info dash-banner--compact" role="status">
              <DashIcon name="clock" />
              <span>
                <b>
                  {inCheck.kind === "upgrade"
                    ? `Your upgrade to ${inCheck.planName} is being checked.`
                    : `Your ${inCheck.planName} renewal payment is being checked.`}
                </b>{" "}
                <span className="dash-banner__more">
                  {inCheck.kind === "upgrade"
                    ? "Your current plan keeps working. We'll email you when it switches."
                    : "We'll email you when it's confirmed."}
                </span>
              </span>
              <Link className="dash-link" to="/app/settings/billing">
                Details
              </Link>
            </div>
          ) : null}
          {awaitingPayment && !rejected ? (
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

      {/* The Chat page is the full chat: no floating launcher or bubble on top of it. */}
      {entitlements.has("team_chat") && !onChatPage ? (
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
      {bubble && !onChatPage ? (
        <ChatBubble
          key={`${bubble.person.id}-${bubble.event?.id ?? "chat"}-${bubble.tag ?? ""}`}
          request={bubble}
          onClose={() => setBubble(null)}
        />
      ) : null}
      {touring && !needsTerms ? (
        <Tour steps={tourSteps((members.data ?? []).some((m) => m.is_active))} onClose={closeTour} />
      ) : null}
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
