import { useCallback } from "react";
import { useAuth } from "../auth/authContext";
import { onboardingFor } from "../auth/steps";
import { useResource, type Resource } from "../dashboard/useResource";
import { getSubscription, type Payment, type Subscription, type SubscriptionInfo } from "../lib/api";

export interface SubscriptionResource extends Resource<SubscriptionInfo> {
  /** After a payment is submitted (step -> payment_review), or paid online (plan active): update the page and auth. */
  submitted: (subscription: Subscription, payment: Payment) => Promise<void>;
}

/** GET subscription/ for the payment and billing pages. */
export function useSubscriptionInfo(): SubscriptionResource {
  const { refresh } = useAuth();
  const load = useCallback((signal: AbortSignal) => getSubscription(signal), []);
  const resource = useResource(load);
  const { data, setData, reload } = resource;

  const submitted = useCallback(
    async (subscription: Subscription, payment: Payment) => {
      if (payment.status === "verified") {
        // Paid online: already approved, so the plan itself changed. Reload both from the server.
        reload();
        await refresh();
        return;
      }
      const next: Subscription = { ...subscription, latest_payment: payment };
      if (data) setData({ ...data, subscription: next });
      await refresh({ onboarding: onboardingFor(next), subscription: next });
    },
    [data, setData, reload, refresh],
  );

  return { ...resource, submitted };
}
