import type { ReactElement } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { usePageMeta } from "../../hooks/usePageMeta";
import { planCodeParam } from "../../lib/planIntent";
import { UnderReview } from "./UnderReview";

/**
 * /onboarding/subscribe
 * - step `payment_review`: "Payment under review"
 * - otherwise a redirect: `?plan=<code>` preselects that plan on the plan page; step `payment` goes to the payment
 *   page for the plan waiting for payment (through `/onboarding/plan?checkout=1`, the link in older emails).
 */
export default function SubscribeStep(): ReactElement {
  usePageMeta({ title: "Activate your plan — Zinwe", description: "Activate your Zinwe plan." });
  const { onboarding } = useAuth();
  const [params] = useSearchParams();
  const code = planCodeParam(params.get("plan"));

  if (onboarding?.step === "payment_review") return <UnderReview />;
  // Choosing happens on the plan page, paying on /onboarding/pay; old links land there.
  if (code) return <Navigate to={`/onboarding/plan?plan=${encodeURIComponent(code)}`} replace />;
  if (onboarding?.step === "payment") return <Navigate to="/onboarding/plan?checkout=1" replace />;
  return <Navigate to="/onboarding/plan" replace />;
}
