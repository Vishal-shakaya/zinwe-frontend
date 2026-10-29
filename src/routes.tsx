import { Suspense, type ReactElement } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { PublicOnly, RequireAuth, StepGate } from "./auth/guards";
import { APP_STEPS } from "./auth/steps";
import { Layout } from "./components/layout/Layout";
import { PageErrorBoundary } from "./components/ui/PageErrorBoundary";
import { lazyPage } from "./lib/lazyPage";
import ContactPage from "./pages/ContactPage";
import EarlyAccessPage from "./pages/EarlyAccessPage";
import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";

const LegalPage = lazyPage(() => import("./pages/LegalPage"));
const WhatsNewPage = lazyPage(() => import("./pages/WhatsNewPage"));
const WhatsNewDashPage = lazyPage(() => import("./dashboard/pages/WhatsNewDashPage"));
const BlogPage = lazyPage(() => import("./pages/BlogPage"));
const ArticlePage = lazyPage(() => import("./pages/ArticlePage"));
const SeriesHubPage = lazyPage(() => import("./pages/SeriesHubPage"));
const GuidesPage = lazyPage(() => import("./pages/GuidesPage"));
const GuidePage = lazyPage(() => import("./pages/GuidePage"));
const SeriesPage = lazyPage(() => import("./pages/SeriesPage"));
const EpisodePage = lazyPage(() => import("./pages/EpisodePage"));
const NewsletterPage = lazyPage(() => import("./pages/NewsletterPage"));
const QuotePage = lazyPage(() => import("./pages/QuotePage"));
const DownloadPage = lazyPage(() => import("./pages/DownloadPage"));
// Website v3 (29 Oct 2026): the Product page, and the public Plans page as a marketing page (src/pages).
const ProductPage = lazyPage(() => import("./pages/ProductPage"));
const PlansPage = lazyPage(() => import("./pages/PlansPage"));

// The portal (sign up, log in, onboarding, dashboard) ships as separate
// chunks, so marketing visitors never download it.
const SignupPage = lazyPage(() => import("./portal/pages/SignupPage"));
const LoginPage = lazyPage(() => import("./portal/pages/LoginPage"));
const LinkedInCallbackPage = lazyPage(() => import("./portal/pages/LinkedInCallbackPage"));
const ForgotPasswordPage = lazyPage(() => import("./portal/pages/ForgotPasswordPage"));
const OnboardingLayout = lazyPage(() => import("./portal/onboarding/OnboardingLayout"));
const CompanyStep = lazyPage(() => import("./portal/onboarding/CompanyStep"));
const PlanStep = lazyPage(() => import("./portal/onboarding/PlanStep"));
const SubscribeStep = lazyPage(() => import("./portal/onboarding/SubscribeStep"));
const AppLayout = lazyPage(() => import("./dashboard/AppLayout"));
const OverviewPage = lazyPage(() => import("./dashboard/pages/OverviewPage"));
const TeamPage = lazyPage(() => import("./dashboard/pages/TeamPage"));
const TeamChatPage = lazyPage(() => import("./dashboard/pages/TeamChatPage"));
const InvoicePage = lazyPage(() => import("./dashboard/pages/InvoicePage"));
const InternetPage = lazyPage(() => import("./dashboard/pages/InternetPage"));
const DataPage = lazyPage(() => import("./dashboard/pages/DataPage"));
const RemotePage = lazyPage(() => import("./dashboard/pages/RemotePage"));
const ActivityPage = lazyPage(() => import("./dashboard/pages/ActivityPage"));
const ReportsPage = lazyPage(() => import("./dashboard/pages/ReportsPage"));
const AlertsPage = lazyPage(() => import("./dashboard/pages/AlertsPage"));
const BillingPage = lazyPage(() => import("./dashboard/pages/BillingPage"));
const CompanyPage = lazyPage(() => import("./dashboard/pages/CompanyPage"));
const FeedbackPage = lazyPage(() => import("./dashboard/pages/FeedbackPage"));
const SettingsLayout = lazyPage(() => import("./dashboard/pages/SettingsLayout"));
const PasswordPage = lazyPage(() => import("./dashboard/pages/PasswordPage"));
const NotificationsPage = lazyPage(() => import("./dashboard/pages/NotificationsPage"));
const HowToUsePage = lazyPage(() => import("./dashboard/pages/HowToUsePage"));
const PoliciesPage = lazyPage(() => import("./dashboard/pages/PoliciesPage"));
// v1.3 dashboard (Prototype v2.2): Tasks board and the Rules page.
const TasksPage = lazyPage(() => import("./dashboard/pages/TasksPage"));
const RulesPage = lazyPage(() => import("./dashboard/pages/RulesPage"));

/** /app/upgrade?plan=x -> /onboarding/plan?plan=x */
function ToPlanPage(): ReactElement {
  const { search } = useLocation();
  return <Navigate to={`/onboarding/plan${search}`} replace />;
}

function ChunkFallback(): ReactElement {
  return (
    <div className="dash-boot" role="status" aria-live="polite">
      Loading…
    </div>
  );
}

/**
 * Site map (contract §5):
 * - marketing (shared Layout): /  /product  /plans  /download  /early-access  /contact  /whats-new  /quote/:token (shared quote), and the 404
 * - blog: /blog  /blog/:slug  /blog/series (members-only series)  /blog/series/:slug  /blog/series/:slug/:episode
 *   /blog/guides (free e-guides)  /blog/guides/:slug
 * - public auth: /signup  /login  /forgot-password (signed-in owners are routed by step)
 * - onboarding: /onboarding/company  /onboarding/plan  /onboarding/subscribe
 * - dashboard: /app (Overview)  /app/alerts (every alert)  /app/activity (work day: start, breaks + reasons, end)  /app/reports (any period, CSV)  /app/internet  /app/data  /app/remote  /app/team (team & devices)  /app/activity
 *   /app/chat (message members; also emails them)  /app/upgrade (choose plan → pay → back to /app)  /app/settings/{company,billing,password,notifications}
 *   /app/help (How to use) · /app/policies · /app/feedback — from the account menu (bottom of the sidebar); /app/feedback is also the email-link target
 *   v1.3: /app/chat/:member (first name or member id) · /app/tasks · /app/rules (protections; /app/setup redirects here)
 *   Old /app/devices, /app/billing, /app/company and /app/setup redirect, so emails and bookmarks keep working.
 */
export function AppRoutes(): ReactElement {
  const { pathname } = useLocation();
  return (
    // A page that fails to load (stale tab after a code change) reloads once for fresh code;
    // if it still can't render, the boundary explains instead of leaving a blank screen.
    <PageErrorBoundary resetKey={pathname}>
    <Suspense fallback={<ChunkFallback />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="product" element={<ProductPage />} />
          <Route path="plans" element={<PlansPage />} />
          {/* The installer itself is /download/ZinweAgent.msi, served by nginx (not this app). */}
          <Route path="download" element={<DownloadPage />} />
          <Route path="early-access" element={<EarlyAccessPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="whats-new" element={<WhatsNewPage />} />
          <Route path="blog" element={<BlogPage />} />
          {/* Members-only newsletter series (THE LAST FILE): the opening is public, the rest for subscribers. */}
          <Route path="blog/series" element={<SeriesHubPage />} />
          <Route path="blog/series/:slug" element={<SeriesPage />} />
          <Route path="blog/series/:slug/:episode" element={<EpisodePage />} />
          {/* Free e-guides: the page is public, the PDF is for members (the same free membership). */}
          <Route path="blog/guides" element={<GuidesPage />} />
          <Route path="blog/guides/:slug" element={<GuidePage />} />
          <Route path="blog/:slug" element={<ArticlePage />} />
          <Route path="newsletter" element={<NewsletterPage />} />
          {/* A shared quote (public link from the payment page or the quote email; not indexed). */}
          <Route path="quote/:token" element={<QuotePage />} />
          <Route path="legal" element={<LegalPage />} />
          <Route path="legal/:slug" element={<LegalPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route element={<PublicOnly />}>
          <Route path="signup" element={<SignupPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="auth/linkedin/callback" element={<LinkedInCallbackPage />} />
        </Route>

        <Route path="onboarding" element={<RequireAuth />}>
          <Route element={<OnboardingLayout />}>
            <Route index element={<Navigate to="company" replace />} />
            <Route element={<StepGate allow={["company"]} />}>
              <Route path="company" element={<CompanyStep />} />
            </Route>
            {/* The one plan page: choosing, paying (checkout modal) and upgrading (2026-10-16). */}
            <Route element={<StepGate allow={["plan", "payment", "payment_review", "complete"]} />}>
              <Route path="plan" element={<PlanStep />} />
            </Route>
            <Route element={<StepGate allow={["plan", "payment", "payment_review"]} />}>
              <Route path="subscribe" element={<SubscribeStep />} />
            </Route>
            <Route path="*" element={<Navigate to="company" replace />} />
          </Route>
        </Route>

        <Route path="app" element={<RequireAuth />}>
          <Route element={<StepGate allow={APP_STEPS} />}>
            <Route element={<AppLayout />}>
              <Route index element={<OverviewPage />} />
              <Route path="internet" element={<InternetPage />} />
              <Route path="data" element={<DataPage />} />
              <Route path="remote" element={<RemotePage />} />
              <Route path="team" element={<TeamPage />} />
              <Route path="chat" element={<TeamChatPage />} />
              <Route path="chat/:member" element={<TeamChatPage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="rules" element={<RulesPage />} />
              <Route path="team/chat" element={<Navigate to="/app/chat" replace />} />
              {/* Upgrades happen on the plan page; old links (emails, announcements) keep working. */}
              <Route path="upgrade" element={<ToPlanPage />} />
              <Route path="invoice/:id" element={<InvoicePage />} />
              {/* v1.3: the protections live on Rules; /app/setup keeps working for old links. */}
              <Route path="setup" element={<Navigate to="/app/rules" replace />} />
              <Route path="alerts" element={<AlertsPage />} />
              <Route path="activity" element={<ActivityPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="whats-new" element={<WhatsNewDashPage />} />
              <Route path="settings" element={<SettingsLayout />}>
                <Route index element={<Navigate to="company" replace />} />
                <Route path="company" element={<CompanyPage />} />
                <Route path="billing" element={<BillingPage />} />
                <Route path="password" element={<PasswordPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="*" element={<Navigate to="company" replace />} />
              </Route>
              {/* Account menu pages. The old Help tabs redirect, so bookmarks keep working. */}
              <Route path="help" element={<HowToUsePage />} />
              <Route path="policies" element={<PoliciesPage />} />
              <Route path="help/policies" element={<Navigate to="/app/policies" replace />} />
              <Route path="help/feedback" element={<Navigate to="/app/feedback" replace />} />
              <Route path="help/*" element={<Navigate to="/app/help" replace />} />
              {/* Email-link target only (not in the sidebar). */}
              <Route path="feedback" element={<FeedbackPage />} />
              {/* Old routes kept working for bookmarks, emails (billing reminders) and in-app links. */}
              <Route path="devices" element={<Navigate to="/app/team" replace />} />
              <Route path="billing" element={<Navigate to="/app/settings/billing" replace />} />
              <Route path="company" element={<Navigate to="/app/settings/company" replace />} />
              <Route path="*" element={<Navigate to="/app" replace />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </Suspense>
    </PageErrorBoundary>
  );
}
