import { lazy, Suspense, type ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { Layout } from "./components/layout/Layout";
import ContactPage from "./pages/ContactPage";
import EarlyAccessPage from "./pages/EarlyAccessPage";
import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";

// The owner dashboard ships as separate chunks, so marketing visitors never download it.
const LoginPage = lazy(() => import("./dashboard/pages/LoginPage"));
const AppLayout = lazy(() => import("./dashboard/AppLayout"));
const DevicesPage = lazy(() => import("./dashboard/pages/DevicesPage"));
const RulesPage = lazy(() => import("./dashboard/pages/RulesPage"));
const ActivityPage = lazy(() => import("./dashboard/pages/ActivityPage"));

function ChunkFallback(): ReactElement {
  return (
    <div className="dash-boot" role="status" aria-live="polite">
      Loading…
    </div>
  );
}

/**
 * Site map: /  /early-access  /contact  (marketing, shared Layout),
 * /login, /app  /app/rules  /app/activity  (owner dashboard), and a catch-all 404.
 */
export function AppRoutes(): ReactElement {
  return (
    <Suspense fallback={<ChunkFallback />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="early-access" element={<EarlyAccessPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route path="login" element={<LoginPage />} />
        <Route path="app" element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<DevicesPage />} />
            <Route path="rules" element={<RulesPage />} />
            <Route path="activity" element={<ActivityPage />} />
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
