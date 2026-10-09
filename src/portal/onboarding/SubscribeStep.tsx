import type { ReactElement } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { usePageMeta } from "../../hooks/usePageMeta";
import { planCodeParam } from "../../lib/planIntent";
import { ChosenPlan } from "./ChosenPlan";
import { PayView } from "./PayView";
import { UnderReview } from "./UnderReview";

/**
 * /onboarding/subscribe
 * - `?plan=<code>`: confirm the plan (free/trial: Activate; paid: continue to payment)
 * - step `payment`: how to pay + the manual payment form
 * - step `payment_review`: "Payment under review"
 */
export default function SubscribeStep(): ReactElement {
  usePageMeta({ title: "Activate your plan — Zinwe", description: "Activate your Zinwe plan." });
  const { onboarding } = useAuth();
  const [params] = useSearchParams();
  const code = planCodeParam(params.get("plan"));

  if (onboarding?.step === "payment_review") return <UnderReview />;
  if (code) return <ChosenPlan code={code} />;
  if (onboarding?.step === "payment") return <PayView />;
  return <Navigate to="/onboarding/plan" replace />;
}
