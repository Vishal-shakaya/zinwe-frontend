import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import { DashIcon } from "../../dashboard/components/DashIcon";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { onboardingFor } from "../../auth/steps";
import { ErrorState } from "../../dashboard/components/States";
import { higherPlans } from "../../dashboard/features/upgrade";
import { useResource } from "../../dashboard/useResource";
import { usePageMeta } from "../../hooks/usePageMeta";
import {
  ApiError,
  createSubscription,
  errorMessage,
  getOffer,
  getSubscription,
  type BillingCycle,
  type Offer,
  type Plan,
} from "../../lib/api";
import { formatDate, formatMoney, isZero } from "../../lib/format";
import { clearPlanIntent, planCodeParam, readPlanIntent } from "../../lib/planIntent";
import { CheckoutModal } from "../components/CheckoutModal";
import { CycleToggle } from "../components/CycleToggle";
import { FormAlert } from "../components/FormAlert";
import { RejectedBanner } from "../components/RejectedBanner";
import { apiFailureMessage } from "../failure";
import {
  bestYearlySaving,
  hasTrial,
  planChargesGst,
  planCtaLabel,
  planCurrency,
  planDevices,
  planForPcs,
  planPrice,
  pcsForTeamSize,
} from "../plan";
import { usePlans } from "../usePlans";
import { useSubscriptionInfo } from "../useSubscriptionInfo";
import { inclTaxLine } from "../v13/planCard";
import { OnbPlanGrid, OnbPlanGridLoading, OnbSumBar, type CardState } from "../v13/OnbPlanGrid";

/**
 * /onboarding/plan — the one place to choose a plan (2026-10-16), outside the dashboard:
 * - first time (step `plan`) or waiting for payment (`payment`): every plan; free plans and trials start at
 *   once, a paid plan opens the checkout modal (`?checkout=1` opens it for the plan waiting for payment);
 * - on a plan (`complete`): an upgrade. Every plan is shown in full; the current one is flagged, it and the
 *   lower ones only have their button disabled, and the first plan above it is preselected. Paying opens
 *   the same checkout modal, priced by GET subscription/checkout/?plan= (carried-over days, its own UPI QR);
 * - payment being checked (`payment_review`, or an active plan whose upgrade / renewal payment is being
 *   checked, 2026-10-17): the plans, read only, so nobody pays twice.
 * `?plan=<code>` preselects a plan (links from the dashboard, the website and emails); otherwise the smallest plan
 * that fits the company's team size is picked (v1.3 AuthFlow board: selectable cards, then one CTA in the summary bar).
 * Monthly or yearly (2026-10-23): the switch above the cards (`?cycle=` from the plans page) sets the prices
 * shown and the cycle the checkout opens on; the checkout can still change it.
 * `?offer=<id>` (with `?plan=`): an offer the Zinwe team sent from the admin panel (a dashboard notification bar).
 * Its own price (GET payments/offer/<id>/), paid online only; the checkout opens with it on arrival.
 */
export default function PlanStep(): ReactElement {
  const { account, refresh } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const plans = usePlans();
  const info = useSubscriptionInfo();

  const step = account?.onboarding.step;
  const subscription = account?.subscription ?? null;
  const latest = subscription?.latest_payment ?? null;
  const onPlan = step === "complete" && subscription?.status === "active";
  // An upgrade or renewal paid on an active plan, not confirmed yet: no second payment.
  const checking = onPlan && latest?.status === "submitted";
  const upgrading = onPlan && !checking;
  const reviewing = step === "payment_review" || checking;
  const pending = step === "payment" ? (subscription?.plan.code ?? null) : null;
  const current = onPlan ? (subscription?.plan.code ?? null) : null;
  const eligible = upgrading && plans.data ? higherPlans(plans.data, current, subscription ?? {}).map((p) => p.code) : [];
  // The plan the payment being checked is for (an upgrade names it; otherwise the owner's plan).
  const checkingCode =
    reviewing && plans.data
      ? (plans.data.find((p) => latest?.upgrade_plan_name && p.name === latest.upgrade_plan_name)?.code ??
        subscription?.plan.code ??
        null)
      : null;
  // Rejected: say why where the owner pays again (waiting for payment, or a refused upgrade).
  const rejected =
    latest?.status === "rejected" && (pending !== null || (upgrading && Boolean(latest.upgrade_plan_name)))
      ? latest
      : null;

  // Back here because the free trial ran out, or a paid plan ended without a renewal (step `plan`).
  const trialEnded = !onPlan && subscription?.is_trial === true && subscription.status === "expired";
  const paidEnded =
    !onPlan && subscription?.is_trial === false && subscription.status === "expired" && Number(subscription.amount_inr) > 0;

  usePageMeta({
    title: upgrading ? "Upgrade your plan — Zinwe" : "Choose a plan — Zinwe",
    description: "Pick the Zinwe plan that fits your team.",
  });

  // The team size on the company form picks the plan that fits.
  const pcs = pcsForTeamSize(account?.company?.team_size);
  const fitPlan = pcs && plans.data ? planForPcs(plans.data, pcs) : null;
  const fit = fitPlan && pcs && !reviewing ? { code: fitPlan.code, pcs } : null;

  const asked = planCodeParam(params.get("plan"));
  const suggested = upgrading
    ? asked && eligible.includes(asked)
      ? asked
      : fit && eligible.includes(fit.code)
        ? fit.code
        : (eligible[0] ?? null)
    : reviewing
      ? checkingCode
      : (pending ?? asked ?? readPlanIntent());
  const [picked, setPicked] = useState<string | null>(null);
  const selected = reviewing ? suggested : (picked ?? suggested);

  // Monthly or yearly: `?cycle=` (the plans page's switch), else the subscription's own, else by currency.
  const currency = plans.data?.[0] ? planCurrency(plans.data[0]) : "INR";
  const askedCycle = params.get("cycle");
  const [chosenCycle, setChosenCycle] = useState<BillingCycle | null>(
    askedCycle === "monthly" || askedCycle === "yearly" ? askedCycle : null,
  );
  const cycle: BillingCycle =
    chosenCycle ??
    (subscription?.billing_cycle === "yearly" || subscription?.billing_cycle === "monthly"
      ? subscription.billing_cycle
      : currency === "USD"
        ? "yearly"
        : "monthly");

  // The plan the cards show as picked: the choice, else the plan that fits the team, else the recommended one.
  const active = plans.data
    ? (selected ??
      (fit && (!upgrading || eligible.includes(fit.code)) ? fit.code : null) ??
      (upgrading ? null : (plans.data.find((p) => p.is_recommended)?.code ?? null)))
    : null;
  const activePlan = active && plans.data ? (plans.data.find((p) => p.code === active) ?? null) : null;

  // The summary bar under the cards (the CTA comes from `action`).
  const summaryText = ((plan: Plan | null): string => {
    if (!plan) return "";
    const limit = plan.max_devices > 0 ? `up to ${plan.max_devices} PCs` : "any number of PCs";
    if (isZero(plan.price_inr_monthly)) return `${plan.name}: ${limit}, every protection. Upgrade any time.`;
    const price = planPrice(plan, undefined, cycle);
    const incl = inclTaxLine(plan, cycle);
    return `${plan.name}: ${limit}, ${price.big} ${price.small}${incl ? ` (${incl})` : ""}.`;
  })(activePlan);

  // "Prices in ₹, billed monthly, plus 18% GST" (the rate from the owner's own quote).
  const taxRate = plans.data
    ?.map((p) => p.quote)
    .find((q) => q && q.taxes.length > 0)
    ?.taxes.reduce((sum, t) => sum + Number(t.rate), 0);
  const gst = plans.data?.some(planChargesGst) ?? false;
  const currencyNote = `Prices in ${currency === "USD" ? "$" : "₹"}, billed ${cycle}${
    currency === "INR" && gst ? `, plus ${taxRate ? `${taxRate}% ` : ""}GST` : ""
  }`;

  // An offer from a dashboard bar: only for the plan it names, while upgrading. The order checks it all again.
  const offerId = Number(params.get("offer")) || 0;
  const offerCode = upgrading && offerId > 0 && asked && eligible.includes(asked) ? asked : null;
  const loadOffer = useCallback(
    (signal: AbortSignal): Promise<Offer | null> =>
      offerCode ? getOffer(offerId, offerCode, signal) : Promise.resolve(null),
    [offerId, offerCode],
  );
  const offerRes = useResource(loadOffer, { resetKey: `${offerId}:${offerCode ?? ""}` });
  // Usable here: online payment is on (the offer is paid online only).
  const offer = offerRes.data && offerRes.data.online_enabled && info.data?.instructions.online ? offerRes.data : null;
  const offerGone = offerCode !== null && offerRes.error instanceof ApiError && offerRes.error.kind === "not_found";

  // `?checkout=1` opens the checkout for the plan waiting for payment. Latched on arrival: once the receipt is
  // sent the step moves on (payment_review), and the modal must stay open to say so.
  // Latched with how it was opened: after an upgrade's receipt is sent the plan is "being checked", and the
  // modal must stay an upgrade to show "Receipt sent".
  const [checkout, setCheckout] = useState<{ code: string; upgrade: boolean; offer?: boolean } | null>(() =>
    params.get("checkout") === "1" && pending ? { code: pending, upgrade: false } : null,
  );
  const openCode = checkout?.code ?? null;
  const openUpgrade = checkout?.upgrade ?? false;
  const openOffer = checkout?.offer && offer && offer.plan_code === openCode ? offer : null;

  // The offer's checkout opens on arrival, once (closing it leaves the page as it is).
  const offerOpened = useRef(false);
  useEffect(() => {
    if (!offer || offerOpened.current) return;
    offerOpened.current = true;
    setPicked(offer.plan_code);
    setCheckout({ code: offer.plan_code, upgrade: true, offer: true });
  }, [offer]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const closeCheckout = () => setCheckout(null);

  const choose = async (plan: Plan) => {
    setPicked(plan.code);
    setError(null);
    if (upgrading || plan.code === pending) {
      setCheckout({ code: plan.code, upgrade: upgrading, offer: upgrading && offer?.plan_code === plan.code });
      return;
    }
    setBusy(plan.code);
    try {
      const created = await createSubscription(plan.code);
      clearPlanIntent();
      await refresh({ onboarding: onboardingFor(created), subscription: created });
      if (created.status === "active") {
        navigate("/app", { replace: true });
        return;
      }
      // Waiting for payment: load what's due and how to pay for the new choice, then check out.
      info.setData(await getSubscription());
      setCheckout({ code: plan.code, upgrade: false });
    } catch (err) {
      setError(apiFailureMessage(err));
      // 409: already active or under review elsewhere (another tab) — let the page catch up.
      if (err instanceof ApiError && err.kind === "conflict") void refresh();
      // A trial this account already used: reload so the card shows the paid price.
      if (err instanceof ApiError && err.kind === "validation" && hasTrial(plan)) plans.reload();
    } finally {
      setBusy(null);
    }
  };


  const stateOf = (plan: Plan): CardState => {
    if (reviewing) {
      return {
        pickable: false,
        flag: plan.code === checkingCode ? "Payment being checked" : plan.code === current ? "Your plan" : null,
      };
    }
    if (upgrading && !eligible.includes(plan.code)) {
      return { pickable: false, flag: plan.code === current ? "Your plan" : "Included in your plan" };
    }
    return { pickable: busy === null, flag: plan.code === pending ? "Waiting for payment" : null };
  };

  const action = (plan: Plan): ReactElement => {
    if (reviewing) {
      return (
        <button type="button" className="zau-btn" disabled>
          {plan.code === checkingCode
            ? "Payment being checked"
            : plan.code === current
              ? "Current plan"
              : "Available after the check"}
        </button>
      );
    }
    if (upgrading && !eligible.includes(plan.code)) {
      return (
        <button type="button" className="zau-btn" disabled>
          {plan.code === current ? "Current plan" : "Included in your plan"}
        </button>
      );
    }
    const free = isZero(plan.price_inr_monthly);
    const label = upgrading
      ? `Upgrade to ${plan.name}`
      : plan.code === pending
        ? "Continue to payment"
        : hasTrial(plan)
          ? planCtaLabel(plan)
          : free
            ? "Start free"
            : "Continue to payment";
    return (
      <button type="button" className="zau-btn pri" disabled={busy !== null} onClick={() => void choose(plan)}>
        {busy === plan.code ? <span className="zau-spin" aria-hidden="true" /> : null}
        {busy === plan.code ? "Please wait…" : label}
      </button>
    );
  };


  const checkingWhat = latest?.upgrade_plan_name
    ? `the upgrade to ${latest.upgrade_plan_name}`
    : latest?.is_renewal
      ? `your ${subscription?.plan.name} renewal`
      : `${subscription?.plan.name}`;
  const teamSize = account?.company?.team_size;
  const lede = upgrading
    ? eligible.length
      ? `You're on ${subscription?.plan.name}. Pick a bigger plan, monthly or yearly: pay with Razorpay and it switches on at once, and any paid days left carry over.`
      : `You're on ${subscription?.plan.name}, our biggest plan. Need more? Email hello@zinwe.io.`
    : checking && latest
      ? `We're checking your payment of ${formatMoney(latest.amount_inr, latest.currency)} for ${checkingWhat}, sent ${formatDate(
          latest.submitted_at,
        )}. You can change plans again once it's confirmed, usually within one working day. Paid twice by mistake? Email hello@zinwe.io and we'll refund it.`
      : reviewing
        ? "We're checking your payment. You can change plans once it's confirmed, usually within one working day."
        : trialEnded
          ? `Your free trial of ${subscription?.plan.name} has ended. Choose a plan to keep protecting your PCs.`
          : paidEnded
            ? `Your ${subscription?.plan.name} plan ended. Choose it again to renew, or pick another plan. Your devices and settings are saved.`
            : teamSize
              ? `You said ${teamSize.replace("-", "–")} people, so we picked the plan that fits. Start free if you want to try first.`
              : "Start free. You can change your plan later.";


  // The checkout prices itself (GET subscription/checkout/, both cycles); the card's quote shows meanwhile.
  const openPlan = openCode && plans.data ? plans.data.find((p) => p.code === openCode) : undefined;
  const pendingInfo = info.data?.subscription?.plan.code === openCode ? info.data?.subscription : null;
  const initialQuote = openUpgrade ? openPlan?.quote : (pendingInfo?.amount_due ?? openPlan?.quote);
  const checkoutReady = Boolean(openPlan && info.data && (openUpgrade || pendingInfo));
  const instructions = info.data?.instructions ?? null;

  return (
    <section className="zau-plan" aria-labelledby="onb-plan-title">
      {/* "Back to dashboard" lives in the header (OnboardingLayout), once. */}
      <div className="zau-plan__head">
        <div className="zau-head">
          <h1 className="zau-h1" id="onb-plan-title">
            {upgrading ? "Upgrade your plan" : reviewing ? "Your plan" : "Pick a plan"}
          </h1>
          <p className="zau-lede">{lede}</p>
        </div>
        {plans.data && !reviewing && plans.data.length > 1 ? (
          <span className="zau-plan__bill">
            <CycleToggle value={cycle} onChange={setChosenCycle} saving={bestYearlySaving(plans.data, currency)} upTo />
            <span className="zau-plan__note">{currencyNote}</span>
          </span>
        ) : null}
      </div>

      {rejected ? (
        <RejectedBanner
          payment={rejected}
          next={pending ? "Choose Continue to payment to pay again and send the new receipt." : "You can pay for the upgrade again below."}
        />
      ) : null}
      {offer ? (
        <div className="zau-offer" role="status">
          <DashIcon name="card" />
          <span>
            <b>{offer.title}</b> Zinwe {offer.plan_name} for {formatMoney(offer.due.total, offer.due.currency)}
            {offer.due.taxes.length ? " including GST" : ""}, paid online
            {offer.ends_at ? `, until ${formatDate(offer.ends_at)}` : ""}. Renewals are at the normal price.
          </span>
          <button
            type="button"
            className="zau-btn pri"
            onClick={() => setCheckout({ code: offer.plan_code, upgrade: true, offer: true })}
          >
            Use the offer
          </button>
        </div>
      ) : offerGone ? (
        <FormAlert message={errorMessage(offerRes.error)} />
      ) : null}
      <FormAlert message={error} />

      {plans.data ? (
        <OnbPlanGrid
          plans={plans.data}
          active={active}
          cycle={cycle}
          stateOf={stateOf}
          onPick={(plan) => {
            setPicked(plan.code);
            setError(null);
          }}
          showCustom={!reviewing}
        />
      ) : plans.error ? (
        <ErrorState
          title="We couldn't load the plans"
          message={errorMessage(plans.error)}
          onRetry={plans.reload}
          retrying={plans.pending}
        />
      ) : (
        <OnbPlanGridLoading />
      )}

      {activePlan ? <OnbSumBar plan={activePlan} text={summaryText} renderAction={action} /> : null}

      {!onPlan && !reviewing ? (
        <p className="zau-plan__skip">
          Not sure yet? <Link to="/app">Go to your dashboard</Link> and start with the Free features. You can choose a
          plan any time.
        </p>
      ) : null}

      {openCode && info.error && !info.data ? (
        <ErrorState
          title="We couldn't load the payment details"
          message={errorMessage(info.error)}
          onRetry={info.reload}
          retrying={info.pending}
        />
      ) : null}
      {checkoutReady && openPlan && instructions ? (
        <CheckoutModal
          initialQuote={initialQuote ?? undefined}
          initialCycle={cycle}
          instructions={instructions}
          devices={planDevices(openPlan)}
          reference={account?.company?.name || undefined}
          upgradePlan={openUpgrade ? openPlan.code : undefined}
          offer={openOffer ? { id: openOffer.id, quote: openOffer.due } : undefined}
          rejected={rejected}
          shareQuote={!openUpgrade}
          ownerEmail={account?.user.email ?? "you"}
          onClose={closeCheckout}
          onSubmitted={async (payment) => {
            if (!openUpgrade && pendingInfo) await info.submitted(pendingInfo, payment);
            else await refresh();
          }}
          onDone={() => navigate("/app")}
        />
      ) : null}
    </section>
  );
}
