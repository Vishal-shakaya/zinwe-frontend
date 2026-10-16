import type { ReactElement } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { usePageMeta } from "../../hooks/usePageMeta";
import { planCodeParam } from "../../lib/planIntent";
import { UnderReview } from "./UnderReview";

/**
 * /onboarding/subscribe
 * - step `payment_review`: "Payment under review"
 * - otherwise a redirect to the plan page, which chooses and pays (checkout modal):
 *   `?plan=<code>` preselects that plan; step `payment` opens the checkout for the plan waiting for payment.
 */
export default function SubscribeStep(): ReactElement {
  usePageMeta({ title: "Activate your plan — Zinwe", description: "Activate your Zinwe plan." });
  const { onboarding } = useAuth();
  const [params] = useSearchParams();
  const code = planCodeParam(params.get("plan"));

  if (onboarding?.step === "payment_review") return <UnderReview />;
  // Choosing and paying happen on the plan page (checkout modal) since 2026-10-16; old links land there.
  if (code) return <Navigate to={`/onboarding/plan?plan=${encodeURIComponent(code)}`} replace />;
  if (onboarding?.step === "payment") return <Navigate to="/onboarding/plan?checkout=1" replace />;
  return <Navigate to="/onboarding/plan" replace />;
}
