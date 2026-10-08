import type { ReactElement } from "react";
import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import ContactPage from "./pages/ContactPage";
import EarlyAccessPage from "./pages/EarlyAccessPage";
import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";

/** Site map: /  /early-access  /contact  and a catch-all 404. */
export function AppRoutes(): ReactElement {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="early-access" element={<EarlyAccessPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
