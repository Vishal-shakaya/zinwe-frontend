import { useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { useEntitlements } from "../features/entitlements";
import { dateOf, dayShort, hmDuration } from "../team/format";
import type { MemberWeek } from "../team/teamData";
import { TipBody } from "../ui/Tooltip";
import type { Tip } from "../ui/useTip";

const DAY_LETTER = new Intl.DateTimeFormat("en-GB", { weekday: "narrow" });

interface MemberUsageProps {
  memberId: number;
  name: string;
  /** Last 7 days, oldest first; undefined while the report loads (or when it failed). */
  week: MemberWeek | undefined;
  failed?: boolean;
  /** yyyy-mm-dd of today (the last bar). */
  today: string;
  tip: Tip;
}

/**
 * DashTeam "Active time · last 7 days": the total (links to their report) and 7 bars (each links to that day on
 * Activity). Active time = time the PC was in use (keyboard or mouse), from the team report; the tooltip adds the
 * time worked that day. Plan enforcement: app usage (active time) is a Businesses feature; other plans get a note.
 */
export function MemberUsage({ memberId, name, week, failed = false, today, tip }: MemberUsageProps): ReactElement {
  const { has, upgradeFor } = useEntitlements();
  const [hot, setHot] = useState(-1);
  const first = name.trim().split(/\s+/)[0] || name;
  const firstKey = first.toLowerCase();
  const reportHref = `/app/reports#m=${encodeURIComponent(firstKey)}`;
  const defTip = tip.anchor(`def-${memberId}`, <TipBody text="Time the PC was in use (keyboard or mouse), not what was done." />);

  const head = (total: ReactElement | string) => (
    <div className="zt-usage__head">
      <span className="z-lbl zt-k">
        Active time · last 7 days
        <button
          type="button"
          className="zt-info"
          aria-label="Active time: time the PC was in use (keyboard or mouse), not what was done."
          {...defTip}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5M12 8h.01" />
          </svg>
        </button>
      </span>
      {total}
    </div>
  );

  if (!has("app_usage")) {
    const plan = upgradeFor("app_usage");
    return (
      <div className="zt-usage">
        {head("")}
        <span className="zt-muted">Active time and app usage are on the {plan?.name ?? "next"} plan.</span>
      </div>
    );
  }

  if (!week) {
    return (
      <div className="zt-usage" aria-busy={!failed}>
        {head(<b className="z-num zt-total">–</b>)}
        {failed ? (
          <span className="zt-muted">Couldn’t load the last 7 days. It tries again shortly.</span>
        ) : (
          <span className="z-sk" aria-hidden="true" style={{ display: "block", height: 56, borderRadius: 6 }} />
        )}
      </div>
    );
  }

  const total = hmDuration(week.activeSeconds);
  const totalTip = tip.anchor(
    `total-${memberId}`,
    <TipBody rows={[{ label: "Active on PC, 7 days", value: total }]} hint={`Click for ${first}’s report`} />,
  );

  return (
    <div className="zt-usage">
      {head(
        <Link className="zt-zlink z-num zt-total" to={reportHref} aria-label={`${total} active on PC in the last 7 days. Open ${first}’s report`} {...totalTip}>
          {total}
        </Link>,
      )}
      <div role="group" aria-label={`${first}’s active time, last 7 days, ${total} in all. Each bar shows the day.`}>
        <div className="zt-bars" onMouseLeave={() => setHot(-1)}>
          {week.days.map((d, i) => {
            const date = dateOf(d.date);
            const isToday = d.date === today;
            const when = isToday ? `${dayShort(date)} · today so far` : dayShort(date);
            const active = hmDuration(d.activeSeconds);
            const worked = hmDuration(d.workedSeconds);
            const on = d.workedSeconds > 0 || d.activeSeconds > 0;
            const pct = Math.max(6, Math.min(100, Math.round((d.activeSeconds / 36_000) * 100)));
            const a = tip.anchor(
              `bar-${memberId}-${i}`,
              <TipBody
                title={name}
                color="#F26A0A"
                sub={when}
                rows={[
                  { label: "Active on PC", value: active },
                  { label: "Worked", value: worked },
                ]}
                hint="Click to open this day on Activity"
              />,
              { wide: true },
            );
            const href = isToday ? `/app/activity#m=${encodeURIComponent(firstKey)}` : `/app/activity?date=${d.date}#m=${encodeURIComponent(firstKey)}`;
            return (
              <Link
                key={d.date}
                className="zt-bar"
                to={href}
                aria-label={`${when}: active on PC ${active}, worked ${worked}. Open this day on Activity`}
                style={{ opacity: hot >= 0 && hot !== i ? 0.35 : 1 }}
                {...a}
                onMouseEnter={(e) => {
                  setHot(i);
                  a.onMouseEnter(e);
                }}
                onFocus={(e) => {
                  setHot(i);
                  a.onFocus(e);
                }}
                onBlur={() => {
                  setHot(-1);
                  a.onBlur();
                }}
              >
                <span
                  className="zt-bar__fill"
                  style={on ? { height: `${pct}%`, background: "#F26A0A" } : { height: 3, background: "#E5E5E5" }}
                />
              </Link>
            );
          })}
        </div>
        <div className="zt-letters" aria-hidden="true">
          {week.days.map((d) => (
            <span key={d.date}>{DAY_LETTER.format(dateOf(d.date))}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default MemberUsage;
