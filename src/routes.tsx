import { lazy, Suspense, type ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { PublicOnly, RequireAuth, StepGate } from "./auth/guards";
import { APP_STEPS } from "./auth/steps";
import { Layout } from "./components/layout/Layout";
import ContactPage from "./pages/ContactPage";
import EarlyAccessPage from "./pages/EarlyAccessPage";
import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";

// The portal (sign up, log in, onboarding, dashboard) ships as separate
// chunks, so marketing visitors never download it.
const PlansPage = lazy(() => import("./portal/pages/PlansPage"));
const SignupPage = lazy(() => import("./portal/pages/SignupPage"));
const LoginPage = lazy(() => import("./portal/pages/LoginPage"));
const ForgotPasswordPage = lazy(() => import("./portal/pages/ForgotPasswordPage"));
const OnboardingLayout = lazy(() => import("./portal/onboarding/OnboardingLayout"));
const CompanyStep = lazy(() => import("./portal/onboarding/CompanyStep"));
const PlanStep = lazy(() => import("./portal/onboarding/PlanStep"));
const SubscribeStep = lazy(() => import("./portal/onboarding/SubscribeStep"));
const AppLayout = lazy(() => import("./dashboard/AppLayout"));
const OverviewPage = lazy(() => import("./dashboard/pages/OverviewPage"));
const DevicesPage = lazy(() => import("./dashboard/pages/DevicesPage"));
const RulesPage = lazy(() => import("./dashboard/pages/RulesPage"));
const ActivityPage = lazy(() => import("./dashboard/pages/ActivityPage"));
const BillingPage = lazy(() => import("./dashboard/pages/BillingPage"));
const CompanyPage = lazy(() => import("./dashboard/pages/CompanyPage"));

function ChunkFallback(): ReactElement {
  return (
    <div className="dash-boot" role="status" aria-live="polite">
      Loading…
    </div>
  );
}

/**
 * Site map (contract §5):
 * - marketing (shared Layout): /  /plans  /early-access  /contact, and the 404
 * - public auth: /signup  /login  /forgot-password (signed-in owners are routed by step)
 * - onboarding: /onboarding/company  /onboarding/plan  /onboarding/subscribe
 * - dashboard: /app (Overview)  /app/devices  /app/rules  /app/activity  /app/billing  /app/company
 */
export function AppRoutes(): ReactElement {
  return (
    <Suspense fallback={<ChunkFallback />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="plans" element={<PlansPage />} />
          <Route path="early-access" element={<EarlyAccessPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route element={<PublicOnly />}>
          <Route path="signup" element={<SignupPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        <Route path="onboarding" element={<RequireAuth />}>
          <Route element={<OnboardingLayout />}>
            <Route index element={<Navigate to="company" replace />} />
            <Route element={<StepGate allow={["company"]} />}>
              <Route path="company" element={<CompanyStep />} />
            </Route>
            <Route element={<StepGate allow={["plan", "payment"]} />}>
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
              <Route path="devices" element={<DevicesPage />} />
              <Route path="rules" element={<RulesPage />} />
              <Route path="activity" element={<ActivityPage />} />
              <Route path="billing" element={<BillingPage />} />
              <Route path="company" element={<CompanyPage />} />
              <Route path="*" element={<Navigate to="/app" replace />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
