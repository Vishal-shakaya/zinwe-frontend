import { useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { hasSettledPlan } from "../../auth/steps";
import { Smoke } from "../../components/ui/Smoke";
import { ErrorState } from "../../dashboard/components/States";
import { seoFor } from "../../content/seo";
import { usePageMeta } from "../../hooks/usePageMeta";
import { errorMessage, type Plan } from "../../lib/api";
import { cx } from "../../lib/cx";
import { PcPicker } from "../components/PcPicker";
import { PlanCards, PlanCardsLoading } from "../components/PlanCards";
import { planChargesGst, planCtaLabel, planForPcs, pcsForTeamSize, type ShowCurrency } from "../plan";
import { usePlans } from "../usePlans";
import "../../styles/dashboard.css";
import "../../styles/portal.css";

const CURRENCY_KEY = "zinwe.plans-currency";

/** The visitor's last "Show prices in" choice (storage can throw: private mode, blocked site data). */
function storedCurrency(): ShowCurrency | null {
  try {
    const value = window.localStorage.getItem(CURRENCY_KEY);
    return value === "INR" || value === "USD" ? value : null;
  } catch {
    return null;
  }
}

/** A first guess for a visitor: rupees on an Indian time zone, dollars elsewhere. Only for showing prices. */
function guessCurrency(): ShowCurrency {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return zone === "Asia/Kolkata" || zone === "Asia/Calcutta" ? "INR" : "USD";
  } catch {
    return "INR";
  }
}

/**
 * Public /plans (marketing layout). Signed-out CTAs go to /signup?plan=<code>.
 * "Show prices in" (2026-10-23) shows every plan in rupees or US dollars: it starts on the owner's own currency
 * (signed in), else the visitor's last choice, else a guess from their time zone. It only changes what's shown:
 * what an owner pays always follows the country on their company profile (the upgrade page and checkout).
 */
export default function PlansPage(): ReactElement {
  usePageMeta(seoFor("/plans"));
  const { token, onboarding, account } = useAuth();
  const plans = usePlans();
  // "How many PCs?": a signed-in owner starts from the team size they gave on the company form.
  const teamPcs = pcsForTeamSize(account?.company?.team_size);
  const [typed, setTyped] = useState<number | null | undefined>(undefined);
  const pcs = typed === undefined ? teamPcs : typed;
  const fitPlan = pcs && plans.data ? planForPcs(plans.data, pcs) : null;
  const fit = fitPlan && pcs ? { code: fitPlan.code, pcs } : null;
  // "+ GST" and the GST invoice are promised only when the server charges GST (seller registered).
  const gst = plans.data ? plans.data.some((p) => planChargesGst(p)) : false;
  // The owner's own billing currency (signed in, with a company): what they'd actually pay in.
  const billed = (plans.data?.find((p) => p.quote)?.quote?.currency ?? null) as ShowCurrency | null;
  const [chosen, setChosen] = useState<ShowCurrency | null>(() => storedCurrency());
  const currency: ShowCurrency = chosen ?? billed ?? guessCurrency();
  const choose = (value: ShowCurrency) => {
    setChosen(value);
    try {
      window.localStorage.setItem(CURRENCY_KEY, value);
    } catch {
      // Storage unavailable: the choice lasts until the page closes.
    }
  };

  const ctaFor = (plan: Plan, highlighted: boolean): ReactElement => {
    const className = cx("btn btn--block", highlighted ? "btn--primary" : "btn--ghost");
    if (token) {
      const inApp = onboarding ? hasSettledPlan(onboarding.step) : false;
      return (
        <Link className={className} to={inApp ? "/app/settings/billing" : "/onboarding/plan"}>
          {inApp ? "See your plan" : planCtaLabel(plan)}
        </Link>
      );
    }
    return (
      <Link className={className} to={`/signup?plan=${encodeURIComponent(plan.code)}`}>
        {planCtaLabel(plan)}
        <span className="arr">→</span>
      </Link>
    );
  };

  return (
    <>
      <section className="page-hero zin-host plans-hero">
        <Smoke />
        <div className="wrap">
          <p className="eyebrow">Plans</p>
          <h1 className="h-display">Simple plans. Start free.</h1>
          <p className="lede">
            Every plan has plain-English alerts, employee consent on every PC and a setup you can finish in an
            afternoon. Priced by the number of PCs, not per person.
          </p>
        </div>
      </section>

      <section className="sec--tight plans-sec">
        <div className="wrap">
          {plans.data ? (
            <>
              <div className="plans-currency">
                <label className="plans-currency__field">
                  <span>Show prices in</span>
                  <select value={currency} onChange={(e) => choose(e.target.value as ShowCurrency)}>
                    <option value="INR">₹ Indian rupees (INR)</option>
                    <option value="USD">$ US dollars (USD)</option>
                  </select>
                </label>
                {billed && billed !== currency ? (
                  <p className="plans-currency__note">
                    You're billed in {billed === "INR" ? "rupees" : "US dollars"}, from the country on your{" "}
                    <Link to="/app/settings/company">company profile</Link>.
                  </p>
                ) : null}
              </div>
              <PcPicker plans={plans.data} pcs={pcs} onPcs={setTyped} fromTeamSize={typed === undefined && teamPcs !== null} />
              <PlanCards plans={plans.data} renderAction={ctaFor} fit={fit} currency={currency} />
            </>
          ) : plans.error ? (
            <div className="dash-card">
              <ErrorState
                title="We couldn't load the plans"
                message={errorMessage(plans.error)}
                onRetry={plans.reload}
                retrying={plans.pending}
              />
            </div>
          ) : (
            <PlanCardsLoading />
          )}
          <p className="plans-note">
            In India: rupees, billed monthly{gst ? ", plus 18% GST" : ""}; pay online (UPI apps, cards, netbanking) or by
            bank transfer. Outside India: US dollars, billed yearly, no Indian GST; pay by card or US bank transfer. You
            pay in the currency of the country on your company profile.{" "}
            {gst ? "You get a GST invoice for every payment." : "You get an invoice for every payment."} Questions?{" "}
            <Link to="/contact">Talk to us</Link>
          </p>
        </div>
      </section>
    </>
  );
}
