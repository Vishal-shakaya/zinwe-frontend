import type { ReactElement } from "react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { AppRoutes } from "./routes";
import { CookieConsent } from "./components/legal/CookieConsent";
import { AnalyticsTracker } from "./components/AnalyticsTracker";

export default function App(): ReactElement {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <CookieConsent />
        <AnalyticsTracker />
      </AuthProvider>
    </BrowserRouter>
  );
}
