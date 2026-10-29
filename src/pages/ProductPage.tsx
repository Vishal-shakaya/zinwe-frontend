import { useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { useHeroCtaRef } from "../components/layout/heroCtaContext";
import { SiteClients } from "../components/site/SiteClients";
import { ICONS } from "../components/site/icons";
import { Cross, PathIcon, Tick } from "../components/site/SiteIcon";
import { PERSON_TONE } from "../content/site/portalDemo";
import {
  ALERTS,
  CHAT,
  HOURS,
  PLAN_TAG,
  PRIVACY,
  PRODUCT_CLOSE,
  PRODUCT_HERO,
  PROTECTION,
  REPORTS,
  TASKS,
  type DemoKey,
} from "../content/site/product";
import { seoFor } from "../content/seo";
import { useHashTarget } from "../hooks/useHashTarget";
import { usePageMeta } from "../hooks/usePageMeta";
import { cx } from "../lib/cx";
import { SiteMark } from "../components/site/SiteMark";
import "../styles/site-product.css";

function Ticks({ items }: { items: readonly string[] }): ReactElement {
  return (
    <ul className="zs-ticks">
      {items.map((t) => (
        <li key={t}>
          <Tick />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

function Av({ ini, size = 28 }: { ini: string; size?: 24 | 28 }): ReactElement {
  return (
    <span aria-hidden="true" className={cx("zf-av", size === 24 && "zf-av--24", `tone-${PERSON_TONE[ini] ?? "grey"}`)}>
      {ini}
    </span>
  );
}

/**
 * Product (board SiteFeatures): one section per thing owners use, each with the real UI piece beside it.
 * Home tiles and the footer link here with #chat, #tasks, #hours, #reports, #alerts, #protection, #privacy
 * (the layout's useScrollOnNavigate scrolls to the anchor).
 */
export default function ProductPage(): ReactElement {
  usePageMeta(seoFor("/product"));
  const heroCta = useHeroCtaRef();
  useHashTarget();
  const [demo, setDemo] = useState<DemoKey>("usb");
  const d = ALERTS.demos[demo];

  return (
    <div className="zf-page">
      <section className="zs-wrap zf-hero">
        <span className="zs-eyebrow">{PRODUCT_HERO.eyebrow}</span>
        <h1 className="zs-h1 zf-hero__h">{PRODUCT_HERO.title}</h1>
        <p className="zs-lead zf-hero__lead">{PRODUCT_HERO.lead}</p>
        <nav className="zf-jumps" aria-label="On this page" ref={heroCta}>
          {PRODUCT_HERO.jumps.map((j) => (
            <a key={j.href} className="zf-jump" href={j.href}>
              <span className={cx("zf-dot", `zf-dot--${j.dot}`)} aria-hidden="true" />
              {j.label}
            </a>
          ))}
        </nav>
      </section>

      {/* CHAT */}
      <section id="chat" className="zf-feat" aria-labelledby="chat-h">
        <div className="zf-txt">
          <span className="zs-pill tone-blue zf-pill">{CHAT.pill}</span>
          <h2 id="chat-h" className="zf-h2">
            {CHAT.title}
          </h2>
          <p className="zf-lead">{CHAT.lead}</p>
          <Ticks items={CHAT.points} />
        </div>
        <div className="zf-vis">
          <div className="zs-card zf-chat">
            <div className="zf-chat__list">
              {CHAT.people.map((c) => (
                <span key={c.ini} className={cx("zf-chat__row", c.on && "is-on")}>
                  <Av ini={c.ini} />
                  <span className="zf-chat__who">
                    <b>{c.name}</b>
                    <span>{c.last}</span>
                  </span>
                </span>
              ))}
            </div>
            <div className="zf-chat__thread">
              <span className="zf-day">Today</span>
              <span className="zf-bub">The Figma file is view-only for me. Can you give me edit access?</span>
              <span className="zf-bub zf-bub--me">
                <span className="zf-quote">Can you give me edit access?</span>
                Done. Check now.
              </span>
              <span className="zf-meta">2:16 PM · Seen</span>
              <span className="zf-bub">Got it, thank you! Exporting now.</span>
              <div className="zf-compose" aria-hidden="true">
                <span className="zf-compose__in">Message Sneha</span>
                <span className="zf-compose__b">+ Task</span>
                <span className="zf-compose__b is-dark">Send</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TASKS */}
      <section className="zf-band">
        <div id="tasks" className="zf-feat zf-feat--flip" aria-labelledby="tasks-h">
          <div className="zf-txt">
            <span className="zs-pill tone-orange zf-pill">{TASKS.pill}</span>
            <h2 id="tasks-h" className="zf-h2">
              {TASKS.title}
            </h2>
            <p className="zf-lead">{TASKS.lead}</p>
            <Ticks items={TASKS.points} />
          </div>
          <div className="zf-vis">
            <div className="zf-panel">
              <div className="zs-card zf-task">
                <span className="zf-task__top">
                  <b>Reconcile October GST input credit</b>
                  <span className="zf-pills">
                    <span className="zs-pill tone-red">High</span>
                    <span className="zs-pill tone-amber">Today, 5 PM</span>
                  </span>
                </span>
                <span className="zf-task__who">
                  <Av ini="PN" size={24} />
                  Priya Nair · sent by you at 9:40 AM
                </span>
                <div className="zf-stages">
                  {["Sent", "Seen", "In progress", "Done"].map((label, i) => (
                    <span key={label} className={cx("zf-stage", i < 2 && "is-past", i === 2 && "is-now")}>
                      <span className="zf-stage__bar" />
                      {label}
                    </span>
                  ))}
                </div>
                <ul className="zf-steps">
                  {TASKS.steps.map((s) => (
                    <li key={s.label}>
                      <span aria-hidden="true" className={cx("zf-box", s.done && "is-done")}>
                        {s.done ? "✓" : ""}
                      </span>
                      <span className={s.done ? "zf-struck" : "zf-todo"}>{s.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="zf-inapp">
                <span className="zf-inapp__l">In their Zinwe app:</span>
                <span className="zf-mini">Confirm</span>
                <span className="zf-mini zf-mini--pri">Start</span>
                <span className="zf-mini">Needs help</span>
                <span className="zf-mini zf-mini--ok">Mark done</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WORK HOURS */}
      <section id="hours" className="zf-feat" aria-labelledby="hours-h">
        <div className="zf-txt">
          <span className="zs-pill tone-amber zf-pill">{HOURS.pill}</span>
          <h2 id="hours-h" className="zf-h2">
            {HOURS.title}
          </h2>
          <p className="zf-lead">{HOURS.lead}</p>
          <Ticks items={HOURS.points} />
        </div>
        <div className="zf-vis">
          <div className="zs-card zf-hours">
            <span className="zf-hours__top">
              <b>Everyone, today</b>
              <span className="zf-legend">
                <span>
                  <span className="zf-key" aria-hidden="true" />
                  Working
                </span>
                <span>
                  <span className="zf-key is-break" aria-hidden="true" />
                  Break
                </span>
              </span>
            </span>
            {HOURS.strips.map((r) => (
              <div key={r.name} className="zf-strip">
                <b>{r.name}</b>
                <span className="zf-strip__track" role="img" aria-label={`${r.name}: ${r.total} worked today`}>
                  {r.segs.map(([a, b, k]) => (
                    <span
                      key={a}
                      className={cx("zf-seg", k === "b" && "is-break")}
                      style={{ left: `${((a / 600) * 100).toFixed(1)}%`, width: `${(((b - a) / 600) * 100).toFixed(1)}%` }}
                    />
                  ))}
                </span>
                <span className="zf-strip__total zs-num">{r.total}</span>
              </div>
            ))}
            <div className="zf-axis" aria-hidden="true">
              <span>9 AM</span>
              <span>12 PM</span>
              <span>3 PM</span>
              <span>7 PM</span>
            </div>
            <div className="zf-ask">
              <span className="zf-ask__t">
                <b>Emily wants her lunch break approved.</b> “Client lunch, back by 2.” 42 min so far.
              </span>
              <span className="zf-pills">
                <span className="zf-mini zf-mini--pri">Approve</span>
                <span className="zf-mini">Not approved</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* REPORTS */}
      <section className="zf-band">
        <div id="reports" className="zf-feat zf-feat--flip" aria-labelledby="rep-h">
          <div className="zf-txt">
            <span className="zs-pill tone-green zf-pill">{REPORTS.pill}</span>
            <h2 id="rep-h" className="zf-h2">
              {REPORTS.title}
            </h2>
            <p className="zf-lead">{REPORTS.lead}</p>
            <ul className="zs-ticks">
              {REPORTS.points.map((t) => (
                <li key={t.text}>
                  <Tick />
                  <span>
                    {t.text} <span className={cx("zs-pill", PLAN_TAG[t.tag].tone)}>{PLAN_TAG[t.tag].label}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="zf-vis">
            <div className="zf-panel">
              <div className="zf-kpis">
                {REPORTS.kpis.map((k) => (
                  <div key={k.l} className="zs-card zf-kpi">
                    <span>{k.l}</span>
                    <b className="zs-num">{k.v}</b>
                    <span className="zf-kpi__s">{k.s}</span>
                  </div>
                ))}
              </div>
              <div className="zs-card zf-perfcard">
                <span className="zf-perfcard__h">
                  <b>Hours per person, this week</b>
                  <span className="zs-pill tone-grey">All plans</span>
                </span>
                {REPORTS.people.map((p) => (
                  <span key={p.name} className="zf-perf">
                    <b>{p.name}</b>
                    <span className="zf-perf__track">
                      <span
                        className="zf-perf__fill"
                        style={{ width: `${Math.round((p.mins / Math.max(...REPORTS.people.map((x) => x.mins))) * 100)}%` }}
                      />
                    </span>
                    <span className="zf-perf__n zf-perf__n--wide zs-num">{p.hours}</span>
                  </span>
                ))}
                <span className="zf-next">
                  <b>Top apps:</b> Excel, Chrome and Tally Prime.
                </span>
              </div>
              <div className="zs-card zf-weekly">
                <PathIcon d={ICONS.mail} size={18} className="zf-weekly__i" />
                <span className="zf-weekly__t">
                  <b>Weekly team report</b> · PDF every Monday, 9:00 AM
                </span>
                <span className="zs-pill tone-green">Startups and up</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ALERTS */}
      <section id="alerts" className="zf-feat" aria-labelledby="al-h">
        <div className="zf-txt">
          <span className="zs-pill tone-red zf-pill">{ALERTS.pill}</span>
          <h2 id="al-h" className="zf-h2">
            {ALERTS.title}
          </h2>
          <p className="zf-lead">{ALERTS.lead}</p>
          <ul className="zs-ticks">
            {ALERTS.points.map((t) => (
              <li key={t.text}>
                <Tick />
                <span>
                  {t.text} {t.tag ? <span className="zs-pill tone-green">{t.tag}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="zf-vis zf-alerts">
          <div className="zf-demotabs" role="group" aria-label="Example alerts">
            {(Object.keys(ALERTS.demos) as DemoKey[]).map((k) => (
              <button key={k} type="button" className={cx("zf-demotab", k === demo && "is-on")} aria-pressed={k === demo} onClick={() => setDemo(k)}>
                {ALERTS.demos[k].label}
              </button>
            ))}
          </div>
          <div className="zf-raw">
            <span className="zs-mono">WHAT THE PC LOGGED</span>
            <code className="zs-mono">{d.raw}</code>
          </div>
          <div className="zf-down" aria-hidden="true">
            <PathIcon d={ICONS.arrowDown} size={20} />
          </div>
          <div className="zs-card zf-said" aria-live="polite">
            <span className="zf-said__top">
              <span className="zs-mono">WHAT ZINWE TELLS YOU</span>
              <span className={cx("zs-pill", d.tone)}>{d.level}</span>
            </span>
            <b>{d.title}</b>
            <span className="zf-said__b">{d.body}</span>
            <span className="zf-said__acts">
              <span className="zf-act is-dark">{d.action}</span>
              <span className="zf-act">{d.action2}</span>
            </span>
          </div>
        </div>
      </section>

      {/* PROTECTION */}
      <section id="protection" className="zf-band zf-protect" aria-labelledby="pr-h">
        <div className="zs-wrap zf-protect__in">
          <div className="zf-protect__head">
            <span className="zs-pill tone-ink zf-pill">{PROTECTION.pill}</span>
            <h2 id="pr-h" className="zf-h2">
              {PROTECTION.title}
            </h2>
            <p className="zf-lead">{PROTECTION.lead}</p>
          </div>
          <div className="zf-doors">
            {PROTECTION.doors.map((door) => (
              <div key={door.title} className="zf-door">
                <span className="zf-door__icon" aria-hidden="true">
                  <PathIcon d={door.icon} size={20} />
                </span>
                <b>{door.title}</b>
                <span className="zf-door__b">{door.body}</span>
                <span className="zf-door__modes">
                  {door.modes.map((m) => (
                    <span key={m} className="zs-pill zf-mode">
                      {m}
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAIR BY DESIGN: the team's side, the consent screen. */}
      <section id="privacy" className="zf-feat" aria-labelledby="pv-h">
        <div className="zf-txt">
          <span className="zs-pill tone-green zf-pill">{PRIVACY.pill}</span>
          <h2 id="pv-h" className="zf-h2">
            {PRIVACY.title}
          </h2>
          <p className="zf-lead">{PRIVACY.lead}</p>
          <Ticks items={PRIVACY.points} />
        </div>
        <div className="zf-vis zf-vis--center">
          <div className="zf-consent">
            <div className="zf-consent__head">
              <span className="zf-consent__app">
                <SiteMark size={22} />
                Zinwe on this PC
              </span>
              <b>Kitecrest Digital uses Zinwe on this PC. Here is what it records.</b>
            </div>
            <div className="zf-consent__body">
              <div className="zf-consent__grp">
                <span className="zf-consent__k is-green">RECORDED</span>
                {PRIVACY.recorded.map((r) => (
                  <span key={r} className="zf-consent__row">
                    <Tick size={15} />
                    {r}
                  </span>
                ))}
              </div>
              <div className="zf-consent__grp">
                <span className="zf-consent__k is-red">NEVER RECORDED</span>
                {PRIVACY.never.map((r) => (
                  <span key={r} className="zf-consent__row">
                    <Cross size={15} className="zf-x" />
                    {r}
                  </span>
                ))}
              </div>
            </div>
            <div className="zf-consent__acts" aria-hidden="true">
              <span>I don't agree</span>
              <span className="is-pri">I agree</span>
            </div>
          </div>
        </div>
      </section>

      <div className="zf-wall">
        <SiteClients variant="wall" />
      </div>

      <section className="zs-wrap zf-close-wrap">
        <div className="zf-close">
          <div className="zf-close__copy">
            <h2>{PRODUCT_CLOSE.title}</h2>
            <p>{PRODUCT_CLOSE.body}</p>
          </div>
          <div className="zf-close__acts">
            <Link className="zs-btn zs-btn--pri zs-btn--flat" to="/signup?plan=free">
              Start free
            </Link>
            <Link className="zs-btn zs-btn--ghost-dark" to="/plans">
              Compare plans
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
