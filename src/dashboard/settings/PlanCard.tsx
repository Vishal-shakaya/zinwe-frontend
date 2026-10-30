import { useState, type ReactElement, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { PAYMENT_CHECKED_LABEL, SUBSCRIPTION_STATUS_LABEL } from "../../content/portal";
import type { BillingCycle, Plan, Subscription } from "../../lib/api";
import { formatDate, formatMoney, isZero } from "../../lib/format";
import { planChargesGst } from "../../portal/plan";
import { daysLeftLabel, isTrialSubscription, subscriptionPrice } from "../../portal/subscription";
import { higherPlans } from "../features/upgrade";
import { useTip } from "../ui/useTip";
import { TipBody } from "../ui/Tooltip";

function historyLabel(days: number | undefined): string | null {
  if (days === undefined) return null;
  if (days === 0) return "unlimited history";
  if (days % 365 === 0) return `${days / 365 === 1 ? "1 year" : `${days / 365} years`} of history`;
  return `${days} days of history`;
}

function cycleOf(sub: Subscription): BillingCycle {
  return sub.billing_cycle === "yearly" ? "yearly" : "monthly";
}

/** What the switch to `pick` means, in one line; null when it can't be done here. */
export type PlanChange =
  | { kind: "upgrade"; plan: Plan; cycle: BillingCycle }
  | { kind: "cycle"; cycle: BillingCycle };

/**
 * Settings → Plan & billing → Your plan (board DashSettings): plan, price, paid until, next payment and PCs used,
 * then Change plan (an inline plan picker) and Pay next month now. Upgrades go through the plan page's checkout
 * (/onboarding/plan?plan=&cycle=); a new billing period for the same plan goes through the renewal checkout.
 */
export function PlanCard({
  sub,
  plans,
  devicesUsed,
  maxDevices,
  people,
  checking,
  canRenew,
  onPayEarly,
  onChange,
  children,
}: {
  sub: Subscription;
  plans: Plan[] | undefined;
  devicesUsed: number;
  maxDevices: number;
  people: number | null;
  /** A payment is being checked: nothing can be changed until it's confirmed. */
  checking: boolean;
  canRenew: boolean;
  onPayEarly: () => void;
  onChange: (change: PlanChange) => void;
  /** Notices under the plan (being checked, refused, renew soon). */
  children?: ReactNode;
}): ReactElement {
  const tip = useTip();
  const plan = sub.plan;
  const current = cycleOf(sub);
  const [changing, setChanging] = useState(false);
  const [pick, setPick] = useState(plan.code);
  const [pickCycle, setPickCycle] = useState<BillingCycle>(current);

  const currency = sub.currency === "USD" ? "USD" : "INR";
  const money = (n: string | number) => formatMoney(n, currency);
  const due = sub.amount_due ?? null;
  const gst = (due?.taxes.length ?? 0) > 0 || (currency === "INR" && planChargesGst(plan));
  const isTrial = isTrialSubscription(sub);
  const free = isZero(sub.amount_inr) && !isTrial;
  const active = sub.status === "active";

  const price = subscriptionPrice(sub) + (due && due.taxes.length > 0 ? ` (${money(due.total)} incl GST)` : "");
  const limit = plan.max_devices > 0 ? `up to ${plan.max_devices} PCs` : "no PC limit";
  const hist = historyLabel(plan.history_days);
  const daysLeft = daysLeftLabel(sub);
  const soon = sub.days_left !== null && sub.days_left <= 7;
  const slotsFree = maxDevices > 0 ? Math.max(0, maxDevices - devicesUsed) : null;
  const usedPct = maxDevices > 0 ? Math.min(100, Math.round((devicesUsed / maxDevices) * 100)) : 0;

  const pill = (() => {
    if (sub.status === "pending_payment" && checking) return <span className="z-pill amber">{PAYMENT_CHECKED_LABEL}</span>;
    if (active && isTrial) return <span className="z-pill blue">Free trial</span>;
    const tone = active ? "green" : sub.status === "pending_payment" ? "amber" : "red";
    return <span className={`z-pill ${tone}`}>{SUBSCRIPTION_STATUS_LABEL[sub.status]}</span>;
  })();

  // ---- The picker ----
  const eligible = new Set(plans ? higherPlans(plans, plan.code, sub).map((p) => p.code) : []);
  const pickedPlan = plans?.find((p) => p.code === pick) ?? null;
  const samePlan = pick === plan.code && pickCycle === current;
  const change: PlanChange | null = checking
    ? null
    : pick === plan.code
      ? pickCycle !== current && canRenew
        ? { kind: "cycle", cycle: pickCycle }
        : null
      : pickedPlan && eligible.has(pick)
        ? { kind: "upgrade", plan: pickedPlan, cycle: pickCycle }
        : null;
  const changeNote = checking
    ? "A payment is being checked. You can change plan once it's confirmed."
    : samePlan
      ? "Pick a different plan or billing period."
      : change?.kind === "upgrade"
        ? `Switch to ${change.plan.name}${pickCycle === "yearly" ? ", yearly" : ", monthly"}: you pay the difference today.`
        : change?.kind === "cycle"
          ? `Switch to ${plan.name}, ${pickCycle}: from ${formatDate(sub.ends_at)}, paid ${pickCycle === "yearly" ? "a year" : "a month"} at a time.`
          : pick === plan.code
            ? "You can change the billing period when your next payment is due."
            : "To move to a smaller plan, message us from Help & support.";

  const cyclePrice = (p: Plan, cycle: BillingCycle) => Number(p.prices?.[currency]?.[cycle]?.price ?? (cycle === "monthly" ? p.price_inr_monthly : 0)) || 0;
  const cycleList = (p: Plan, cycle: BillingCycle) => Number(p.prices?.[currency]?.[cycle]?.list ?? p.list_price_inr_monthly ?? 0) || 0;

  return (
    <section className="z-card zp-plan" aria-labelledby="plan-h">
      <div className="zp-plan__who">
        <span className="zp-k">YOUR PLAN</span>
        <span className="zp-plan__name">
          <b id="plan-h">{plan.name}</b>
          {pill}
        </span>
        <span className="zp-body">{[price, limit, hist].filter(Boolean).join(" · ")}</span>
        {!free && !isTrial ? (
          <span style={{ fontSize: 13, color: "#404040" }}>
            Billed {current}
            {gst && currency === "INR" ? " · India prices are + 18% GST" : ""}
          </span>
        ) : null}
      </div>

      <div className="zp-plan__facts">
        {active && sub.ends_at ? (
          <div>
            <span className="zp-k">{isTrial ? "Trial ends" : free ? "Ends" : "Paid until"}</span>
            <br />
            <b>{formatDate(sub.ends_at)}</b>
            {daysLeft ? (
              <>
                <br />
                <span style={{ fontSize: 12, color: soon ? "#A84505" : "#6B6B6B" }}>{daysLeft}</span>
              </>
            ) : null}
          </div>
        ) : null}
        {active && plan.requires_payment && due && sub.ends_at ? (
          <div>
            <span className="zp-k">Next payment</span>
            <br />
            <b>
              {money(due.total)} on {formatDate(sub.ends_at)}
            </b>
            <br />
            <span style={{ fontSize: 12, color: "#6B6B6B" }}>We remind you a week before</span>
          </div>
        ) : null}
        <div style={{ gridColumn: "1 / -1" }}>
          <span className="zp-k">PCs used</span>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span className="zp-bar" aria-hidden="true">
              <span style={{ width: `${usedPct}%` }} />
            </span>
            <b className="z-num">{maxDevices > 0 ? `${devicesUsed} of ${maxDevices}` : `${devicesUsed}`}</b>
          </div>
          <span style={{ fontSize: 12, color: "#6B6B6B" }}>
            {[slotsFree !== null ? `${slotsFree} free slot${slotsFree === 1 ? "" : "s"}` : "No PC limit", people !== null ? `${people} ${people === 1 ? "person" : "people"}` : null]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
      </div>

      <div className="zp-plan__acts">
        <button
          type="button"
          className="z-btn sm"
          aria-expanded={changing}
          aria-controls="plan-picker"
          onClick={() => {
            setChanging((v) => !v);
            setPick(plan.code);
            setPickCycle(current);
          }}
        >
          Change plan
        </button>
        {canRenew && plan.requires_payment ? (
          <button type="button" className="z-btn sm" onClick={onPayEarly}>
            Pay next {current === "yearly" ? "year" : "month"} now
          </button>
        ) : null}
      </div>

      {changing ? (
        <div className="zp-plan__full" id="plan-picker">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
            <div role="group" aria-label="Billing period" className="z-segs">
              {(["monthly", "yearly"] as const).map((c) => (
                <button key={c} type="button" className={`z-seg${pickCycle === c ? " on" : ""}`} aria-pressed={pickCycle === c} onClick={() => setPickCycle(c)}>
                  {c === "monthly" ? "Monthly" : "Yearly"}
                </button>
              ))}
            </div>
            <span style={{ fontSize: 13, color: "#404040" }}>
              {pickCycle === "yearly" ? "Yearly is 12 months paid at once." : "Monthly, cancel or change any time."}
            </span>
          </div>
          {plans === undefined ? (
            <span className="zp-k" role="status">
              Loading plans…
            </span>
          ) : (
            <div className="zp-plangrid">
              {plans.map((p) => {
                const isMine = p.code === plan.code;
                const tooSmall = p.max_devices > 0 && p.max_devices < devicesUsed;
                const up = eligible.has(p.code);
                const off = tooSmall || (!up && !isMine) || checking;
                const amount = cyclePrice(p, pickCycle);
                const was = pickCycle === "monthly" ? cycleList(p, "monthly") : 0;
                const pGst = currency === "INR" && planChargesGst(p);
                const zero = amount === 0 && isZero(p.price_inr_monthly);
                const note = isMine
                  ? "Your plan"
                  : tooSmall
                    ? `Too small: you use ${devicesUsed} PCs`
                    : up
                      ? "Starts today, unused days carry over"
                      : "Message us to move down";
                return (
                  <button
                    key={p.code}
                    type="button"
                    className={`zp-popt${pick === p.code ? " on" : ""}`}
                    aria-pressed={pick === p.code}
                    disabled={off}
                    onClick={() => setPick(p.code)}
                  >
                    <b>{p.name}</b>
                    <br />
                    <span style={{ fontSize: 13, color: "#404040" }}>{p.max_devices > 0 ? `Up to ${p.max_devices} PCs` : "Any number of PCs"}</span>
                    <br />
                    <span className="z-num" style={{ fontSize: 14, fontWeight: 700 }}>
                      {zero ? money(0) : pickCycle === "yearly" ? `${money(amount)} a year${pGst ? " + GST" : ""}` : `${money(amount)}/mo${pGst ? " + GST" : ""}`}
                    </span>
                    {was > amount && !zero ? (
                      <>
                        {" "}
                        <s className="z-num">{money(was)}</s>
                      </>
                    ) : null}
                    <br />
                    <span className="z-num" style={{ fontSize: 12, color: "#404040" }}>
                      {zero ? "Free forever" : pGst ? `${money(Math.round(amount * 1.18))} incl GST` : "No GST added"}
                    </span>
                    <br />
                    <span style={{ fontSize: 12, color: tooSmall ? "#C0331C" : "#6B6B6B" }}>{note}</span>
                  </button>
                );
              })}
            </div>
          )}
          <span style={{ width: "100%", fontSize: 13, color: "#404040" }}>
            More than 50 PCs? Custom plans are priced with you.{" "}
            <Link to="/contact" style={{ fontWeight: 600 }}>
              Talk to us
            </Link>
          </span>
          <div className="zp-save" style={{ justifyContent: "space-between" }}>
            <span style={{ color: "#404040" }}>{changeNote}</span>
            <button
              type="button"
              className="z-btn sm dark"
              aria-disabled={change === null}
              {...(change === null ? tip.anchor("confirm", <TipBody text={<><b>Confirm is off</b> — {changeNote.charAt(0).toLowerCase() + changeNote.slice(1)}</>} />) : {})}
              onClick={() => {
                if (change) onChange(change);
              }}
            >
              Confirm
            </button>
          </div>
        </div>
      ) : null}
      {children}
      {tip.node}
    </section>
  );
}
