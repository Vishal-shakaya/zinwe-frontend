import type { ReactElement } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./authContext";

/** Where the login page sends the owner back to after signing in. */
export interface LoginRedirectState {
  from?: string;
}

/** Renders the child routes only with a token; otherwise sends the visitor to /login. */
export function ProtectedRoute(): ReactElement {
  const { token } = useAuth();
  const location = useLocation();

  if (!token) {
    const state: LoginRedirectState = { from: `${location.pathname}${location.search}` };
    return <Navigate to="/login" replace state={state} />;
  }
  return <Outlet />;
}
