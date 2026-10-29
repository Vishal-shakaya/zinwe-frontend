import { useEffect, useRef, useState, type ReactElement, type RefObject } from "react";
import { Link } from "react-router-dom";
import { SiteClients } from "../components/site/SiteClients";
import { SiteFaq } from "../components/site/SiteFaq";
import { ICONS } from "../components/site/icons";
import { PathIcon, PauseGlyph, PlayGlyph, Tick, Cross } from "../components/site/SiteIcon";
import { SitePortal } from "../components/site/SitePortal";
import { JsonLd } from "../components/ui/JsonLd";
import {
  CLOSE,
  FAIR,
  HERO,
  HOUR_STRIPS,
  MEMBER_QUOTE,
  PROTECTION,
  REPORT_HOURS,
  REPORT_PEOPLE,
  RULES,
  RULE_DEFAULTS,
  STEPS,
  TASK_ROWS,
  TEAM_SIDE,
  TILES_INTRO,
  type RuleKey,
} from "../content/site/home";
import { HOME_FAQ, HOME_PRICE_Q, SOFTWARE_LD, seoFor } from "../content/seo";
import { usePageMeta } from "../hooks/usePageMeta";
import { cx } from "../lib/cx";
import { homePriceAnswer } from "../lib/sitePrices";
import { usePlans } from "../portal/usePlans";
import "../styles/site-home.css";

const TONE_CLASS = { ok: "tone-green", block: "tone-red", note: "tone-blue" } as const;

/** Which tiles are on screen (each tile's loop runs only then), by data-i. */
function useTilesOnScreen(count: number): [RefObject<HTMLDivElement | null>, boolean[]] {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState<boolean[]>(() => Array.from({ length: count }, () => true));
  useEffect(() => {
    const root = ref.current;
    if (!root || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        setVis((prev) => {
          const next = [...prev];
          entries.forEach((e) => {
            next[Number((e.target as HTMLElement).dataset.i)] = e.isIntersecting;
          });
          return next;
        });
      },
      { threshold: 0.15 },
    );
    root.querySelectorAll("[data-i]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return [ref, vis];
}

/**
 * Home v3.2 (board SiteHome, 29 Oct review): promise + reassurances → the live dashboard → Active members →
 * the five tiles (each loops like a GIF only while on screen; one button pauses them all; reduced motion shows the
 * end state) → protection, hands-on → mid-page sign-up → the team's side → how it works → consent first → questions
 * → close. The client quote shows only once a real client has agreed (content/site/home.ts MEMBER_QUOTE).
 */
export default function HomePage(): ReactElement {
  usePageMeta(seoFor("/"));
  const [still, setStill] = useState(false);
  const [rules, setRules] = useState<Record<RuleKey, string>>(RULE_DEFAULTS);
  const [tilesRef, vis] = useTilesOnScreen(5);
  const plans = usePlans();
  const priceAnswer = plans.data ? homePriceAnswer(plans.data) : null;
  const faqs = HOME_FAQ.map((f) => (f.q === HOME_PRICE_Q && priceAnswer ? { ...f, a: priceAnswer } : f));
  const off = (i: number) => (vis[i] ? undefined : "is-off");
  const summary = `${RULES.map((r) => r.words[rules[r.key]]).join("; ")}.`;

  return (
    <div className="zh">
      {/* 1 · Hero: one promise, two buttons, then the product itself. */}
      <section className="zs-wrap zh-hero">
        <span className="zh-badge">
          <span className="zh-badge__ok">{HERO.badge}</span>
          {HERO.badgeText}
        </span>
        <h1 className="zs-h1 zh-hero__h">{HERO.title}</h1>
        <p className="zs-lead zh-hero__lead">{HERO.lead}</p>
        <div className="zh-hero__acts">
          <Link className="zs-btn zs-btn--lg zs-btn--pri" to="/signup?plan=free">
            Start free, up to 3 PCs
          </Link>
          <a className="zs-btn zs-btn--lg" href="#tour">
            See it work
          </a>
        </div>
        <p className="zh-hero__ticks">
          {HERO.ticks.map((t) => (
            <span key={t}>
              <Tick size={14} />
              {t}
            </span>
          ))}
        </p>
      </section>

      <section id="tour" className="zs-wrap zh-tour" aria-label="The Zinwe dashboard, on sample data">
        <SitePortal />
      </section>

      {/* 2 · Who already uses it: the only client list on Home. */}
      <div id="members" className="zh-members">
        <SiteClients variant="strip" />
      </div>

      {/* 3 · The useful parts, Apple-style tiles. */}
      <section className="zs-wrap zs-wrap--wide zh-parts">
        <div className="zh-parts__intro">
          <span className="zs-eyebrow">{TILES_INTRO.eyebrow}</span>
          <h2 className="zs-h2 zh-parts__h">{TILES_INTRO.title}</h2>
          <p className="zs-lead">{TILES_INTRO.lead}</p>
          <button type="button" className="zh-pp" aria-pressed={still} onClick={() => setStill((s) => !s)}>
            {still ? <PlayGlyph /> : <PauseGlyph />}
            {still ? "Play animations" : "Pause animations"}
          </button>
        </div>

        <div className={cx("zh-tiles", still && "is-still")} ref={tilesRef}>
          {/* Chat · full width, light. Loop (10 s): Priya writes → you reply → a task → seen → in progress → she types. */}
          <Link to="/product#chat" className={cx("zh-tile zh-tile--full", off(0))} data-i="0">
            <span className="zh-tile__kick is-blue">Chat</span>
            <h3 className="zh-tile__h">Message anyone, right at their PC.</h3>
            <p className="zh-tile__p">No WhatsApp groups for work. Messages arrive in seconds, with Seen ticks.</p>
            <span className="zh-tile__link">How chat works ›</span>
            <div className="zh-vis">
              <div className="zh-shot zh-shot--chat">
                <div className="zh-chathead">
                  <span className="zh-av34 tone-blue" aria-hidden="true">
                    PN
                  </span>
                  <span className="zh-chathead__who">
                    <b>Priya Nair</b>
                    <span>At her PC · KC-ACCOUNTS-01</span>
                  </span>
                </div>
                <div className="zh-chatbody">
                  <span className="hl-lp hl-in1 zh-bub">Sharma Traders sent only 3 of 5 invoices.</span>
                  <span className="hl-lp hl-in2 zh-bub zh-bub--me">Thanks Priya. Making it a task.</span>
                  <span className="hl-lp hl-in3 zh-taskcard">
                    <span className="zh-taskcard__k">TASK</span>
                    <b>Chase Sharma Traders for 2 missing invoices</b>
                    <span className="zh-stagebars">
                      <span>
                        <span className="zh-sb is-green" />
                        Sent
                      </span>
                      <span>
                        <span className="hl-lp hl-seen zh-sb is-green" />
                        Seen
                      </span>
                      <span>
                        <span className="hl-lp hl-prog zh-sb is-orange" />
                        In progress
                      </span>
                      <span>
                        <span className="zh-sb" />
                        Done
                      </span>
                    </span>
                  </span>
                  <span className="hl-lp hl-in4 zh-seen">2:14 PM · Seen</span>
                  <span className="hl-lp hl-in5 zh-typing" aria-hidden="true">
                    <span className="hl-dot" />
                    <span className="hl-dot hl-d2" />
                    <span className="hl-dot hl-d3" />
                  </span>
                </div>
              </div>
            </div>
          </Link>

          {/* Tasks · full width, dark. Loop: the last step is ticked → Done → you approve Arjun's task. */}
          <Link to="/product#tasks" className={cx("zh-tile zh-tile--full zh-tile--dark", off(1))} data-i="1">
            <span className="zh-tile__kick is-orange">Tasks</span>
            <h3 className="zh-tile__h">Send a task. Watch it move.</h3>
            <p className="zh-tile__p">Due dates, steps and a stage bar. Approve the work when it's done.</p>
            <span className="zh-tile__link">How tasks work ›</span>
            <div className="zh-vis">
              <div className="zh-shot zh-shot--tasks">
                <div className="zh-bigtask">
                  <span className="zh-bigtask__top">
                    <b>Reconcile October GST input credit</b>
                    <span className="zh-pills">
                      <span className="zs-pill tone-red">High</span>
                      <span className="zs-pill tone-amber">Today, 5 PM</span>
                    </span>
                  </span>
                  <span className="zh-stagebars zh-stagebars--lg">
                    <span>
                      <span className="zh-sb is-green" />
                      Sent
                    </span>
                    <span>
                      <span className="zh-sb is-green" />
                      Seen
                    </span>
                    <span>
                      <span className="hl-lp hl-toGreen zh-sb is-green" />
                      In progress
                    </span>
                    <span>
                      <span className="hl-lp hl-toDone zh-sb is-orange" />
                      Done
                    </span>
                  </span>
                  <span className="zh-substeps">
                    <span>
                      <span className="zh-box is-done" aria-hidden="true">
                        ✓
                      </span>
                      <span className="zh-struck">Download the GSTR-2B for October</span>
                    </span>
                    <span>
                      <span className="zh-box is-done" aria-hidden="true">
                        ✓
                      </span>
                      <span className="zh-struck">Match it with the purchase register</span>
                    </span>
                    <span>
                      <span className="hl-lp hl-tick zh-box is-done" aria-hidden="true">
                        ✓
                      </span>
                      <span className="hl-lp hl-strike zh-struck zh-struck--last">List the mismatches for the CA</span>
                    </span>
                  </span>
                </div>
                <div className="zh-sidetasks">
                  <span className="zh-minitask">
                    <b>Ship the client-portal login fix</b>
                    <span className="zh-minitask__row">
                      <span className="zh-av24 tone-orange" aria-hidden="true">
                        AM
                      </span>
                      <span className="zh-swap">
                        <span className="zs-pill tone-green hl-lp hl-swapOut">Waiting for your OK</span>
                        <span className="zs-pill tone-solid-green hl-lp hl-swapIn">Approved ✓</span>
                      </span>
                    </span>
                  </span>
                  {TASK_ROWS.map((t) => (
                    <span key={t.ini} className="zh-minitask">
                      <b>{t.title}</b>
                      <span className="zh-minitask__row">
                        <span className={cx("zh-av24", t.tone)} aria-hidden="true">
                          {t.ini}
                        </span>
                        <span className={cx("zs-pill", t.pill)}>{t.status}</span>
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Link>

          {/* Reports · full width, light. Loop: the bars grow one after another, then each person's week fills in. */}
          <Link to="/product#reports" className={cx("zh-tile zh-tile--full", off(2))} data-i="2">
            <span className="zh-tile__kick is-green">Reports</span>
            <h3 className="zh-tile__h">See the week in ten seconds.</h3>
            <p className="zh-tile__p">Hours, tasks done, apps and websites, per person. Emailed as a PDF every Monday if you like.</p>
            <span className="zh-tile__link">What reports show ›</span>
            <div className="zh-vis">
              <div className="zh-shot zh-shot--pad">
                <b className="zh-shot__h">Hours worked, whole team</b>
                <div className="zh-bars" aria-hidden="true">
                  {REPORT_HOURS.map((h, i) => (
                    <span
                      key={`bar-${i}`}
                      className={cx("zh-bar", i === REPORT_HOURS.length - 1 && "is-today")}
                      style={{ height: `${Math.max(3, Math.round((h / 66) * 90))}px`, animationDelay: `${(i * 0.12).toFixed(2)}s` }}
                    />
                  ))}
                </div>
                <b className="zh-shot__h">Hours this week, per person</b>
                {REPORT_PEOPLE.map((p, i) => (
                  <span key={p.name} className="zh-perf">
                    <b>{p.name}</b>
                    <span className="zh-perf__track">
                      <span
                        className="zh-perf__fill"
                        style={{
                          width: `${Math.round((p.mins / Math.max(...REPORT_PEOPLE.map((x) => x.mins))) * 100)}%`,
                          animationDelay: `${(i * 0.2).toFixed(1)}s`,
                        }}
                      />
                    </span>
                    <span className="zh-perf__n zh-perf__n--wide zs-num">{p.hours}</span>
                  </span>
                ))}
              </div>
            </div>
          </Link>

          {/* Work hours · half, warm. Loop: the day fills in for everyone → you approve Emily's lunch break. */}
          <Link to="/product#hours" className={cx("zh-tile zh-tile--half zh-tile--warm", off(3))} data-i="3">
            <span className="zh-tile__kick is-amber">Work hours</span>
            <h3 className="zh-tile__h">Attendance that runs itself.</h3>
            <p className="zh-tile__p">Start day, Take a break, End day: one tap on each PC. Long breaks ask for your OK.</p>
            <span className="zh-tile__link">How work hours work ›</span>
            <div className="zh-vis">
              <div className="zh-shot zh-shot--pad zh-shot--hours">
                <span className="zh-daybtns">
                  <span className="is-start">Start day</span>
                  <span className="is-break">Take a break</span>
                  <span className="is-end">End day</span>
                </span>
                <span className="zh-approve">
                  <span className="zh-approve__t">
                    <b>Emily</b> · lunch, 42 min
                  </span>
                  <span className="zh-swap">
                    <span className="hl-lp hl-swapOut hl-press zh-mini zh-mini--pri">Approve</span>
                    <span className="hl-lp hl-swapIn zh-mini zh-mini--ok">Approved ✓</span>
                  </span>
                </span>
                {HOUR_STRIPS.map((r) => (
                  <span key={r.name} className="zh-strip">
                    <b>{r.name}</b>
                    <span className="zh-strip__track">
                      {r.segs.map(([a, b, k]) => (
                        <span
                          key={a}
                          className={cx("zh-seg", k === "b" && "is-break")}
                          style={{ left: `${((a / 600) * 100).toFixed(1)}%`, width: `${(((b - a) / 600) * 100).toFixed(1)}%` }}
                        />
                      ))}
                      <span className="hl-lp hl-reveal zh-strip__cover" aria-hidden="true" />
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </Link>

          {/* Alerts · half, dark. Loop: the PC logs a big copy → Zinwe turns it into a sentence → USB read-only. */}
          <Link to="/product#alerts" className={cx("zh-tile zh-tile--half zh-tile--dark", off(4))} data-i="4">
            <span className="zh-tile__kick is-coral">Alerts</span>
            <h3 className="zh-tile__h">Plain English, not logs.</h3>
            <p className="zh-tile__p">What happened, what it means, and one button for what to do next.</p>
            <span className="zh-tile__link">How alerts work ›</span>
            <div className="zh-vis">
              <div className="zh-shot zh-shot--pad zh-shot--alert">
                <code className="zs-mono hl-lp hl-in1 zh-rawlog">
                  [WARN] USBSTOR\Disk&amp;Ven_SanDisk write 1,932,735,283 bytes user=KC-SALES-LAPTOP-02\karan
                </code>
                <span className="hl-lp hl-in2 zh-arrow" aria-hidden="true">
                  ↓
                </span>
                <span className="hl-lp hl-in3 zh-alertcard">
                  <span className="zs-pill tone-red">Needs you</span>
                  <b>Karan copied 1.8 GB to a pen drive</b>
                  <span className="zh-alertcard__b">Above your 500 MB limit. Sizes only, never what was in the files.</span>
                  <span className="zh-alertcard__acts">
                    <span className="zh-mini zh-mini--dark">Ask Karan</span>
                    <span className="zh-swap">
                      <span className="hl-lp hl-swapOut hl-press zh-mini">Make USB read-only</span>
                      <span className="hl-lp hl-swapIn zh-mini zh-mini--soft">USB is read-only ✓</span>
                    </span>
                  </span>
                </span>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* 5 · Protection, hands-on: pick a rule, see what happens on the PC. */}
      <section id="protection" className="zs-wrap zs-wrap--wide zh-protect">
        <div className="zh-stage">
          <div className="zh-stage__head">
            <div className="zh-stage__copy">
              <span className="zs-eyebrow">{PROTECTION.eyebrow}</span>
              <h2 className="zs-h2">{PROTECTION.title}</h2>
              <p className="zs-lead">{PROTECTION.lead}</p>
            </div>
            <Link className="zs-btn zs-btn--lg" to="/product#protection">
              All six protections
            </Link>
          </div>
          <div className="zh-stage__body">
            <div className="zh-rules">
              {RULES.map((r) => (
                <fieldset key={r.key} className="zh-rule">
                  <legend className="zs-sr">{r.title}</legend>
                  <div className="zh-rule__head">
                    <span className="zh-rule__icon" aria-hidden="true">
                      <PathIcon d={r.icon} size={20} />
                    </span>
                    <span className="zh-rule__t">
                      <b>{r.title}</b>
                      <span>{r.sub}</span>
                    </span>
                  </div>
                  <div className="zh-opts" role="group" aria-label={r.title}>
                    {r.options.map(([v, label]) => (
                      <button
                        key={v}
                        type="button"
                        className={cx("zh-opt", rules[r.key] === v && "is-on")}
                        aria-pressed={rules[r.key] === v}
                        onClick={() => setRules((s) => ({ ...s, [r.key]: v }))}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
            {/* What the PC does with those answers: three moments on Karan's laptop, re-drawn when a rule changes. */}
            <div className="zh-pc">
              <div className="zh-pc__head">
                <span className="zh-pc__name">
                  <span className="zh-pc__dot" aria-hidden="true" />
                  <span className="zs-mono">KC-SALES-LAPTOP-02</span>
                </span>
                <span className="zh-pc__note">What happens on the PC</span>
              </div>
              <div className="zh-pc__list" aria-live="polite">
                {RULES.map((r) => {
                  const o = r.out[rules[r.key]];
                  const tone = TONE_CLASS[o.tone];
                  return (
                    <div key={`${r.key}-${rules[r.key]}`} className="zh-outcome zs-pop">
                      <span className={cx("zh-outcome__icon", tone)} aria-hidden="true">
                        <PathIcon d={r.icon} size={17} stroke={2.2} />
                      </span>
                      <span className="zh-outcome__t">
                        <span className="zh-outcome__when">{r.when}</span>
                        <b>{o.title}</b>
                        <span className="zh-outcome__b">{o.body}</span>
                      </span>
                      <span className={cx("zs-pill", tone)}>{o.state}</span>
                    </div>
                  );
                })}
              </div>
              <div className="zh-pc__sum">
                <PathIcon d={ICONS.shieldCheck} size={17} stroke={2.4} className="zh-pc__shield" />
                <span>
                  <b>Your rules:</b> {summary}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mid-page sign-up, so nobody scrolls back up to the hero to start. */}
      <section className="zs-wrap zh-mid">
        <Link className="zs-btn zs-btn--lg zs-btn--pri" to="/signup?plan=free">
          Start free, up to 3 PCs
        </Link>
        <span>No card needed · Simple enough to set up this afternoon</span>
      </section>

      {/* 6 · What your team gets: the tray app. */}
      <section className="zs-wrap zh-team-wrap">
        <div className="zs-card zh-team">
          <div className="zh-team__copy">
            <span className="zs-eyebrow">{TEAM_SIDE.eyebrow}</span>
            <h2 className="zs-h2 zh-team__h">{TEAM_SIDE.title}</h2>
            <p className="zs-lead zh-team__lead">{TEAM_SIDE.lead}</p>
            <ul className="zh-team__pts">
              {TEAM_SIDE.points.map((t) => (
                <li key={t}>
                  <span className="zh-team__tick" aria-hidden="true">
                    <Tick size={13} stroke={3} className="" />
                  </span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="zh-tray-wrap">
            <div className="zh-tray" aria-label="The Zinwe window on a team member's PC (sample)" role="img">
              <div className="zh-tray__head">
                <span className="zh-av34 tone-purple" aria-hidden="true">
                  EC
                </span>
                <span className="zh-tray__who">
                  <b>Good afternoon, Emily</b>
                  <span>Working · 4 h 02 min today</span>
                </span>
              </div>
              <div className="zh-tray__body">
                <div className="zh-tray__btns">
                  <span>Take a break</span>
                  <span className="is-dark">End day</span>
                </div>
                <div className="zh-tray__task">
                  <span className="zh-tray__k">NEW TASK FROM ANANYA</span>
                  <b>Update the Brightway project timeline</b>
                  <span className="zh-tray__acts">
                    <span className="is-pri">Start</span>
                    <span>Needs help</span>
                  </span>
                </div>
                <div className="zh-tray__msg">
                  <span className="zh-tray__dot" aria-hidden="true" />
                  <span>
                    <b>Ananya:</b> Lunch approved, enjoy!
                  </span>
                </div>
              </div>
              <div className="zh-tray__tabs">
                <span className="is-on">Home</span>
                <span>Chat</span>
                <span>Tasks</span>
                <span>Me</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7 · How it works, as one line (the full steps live on Download). */}
      <section className="zh-how">
        <div className="zs-wrap zh-how__in">
          <div className="zh-how__t">
            <span className="zs-eyebrow">How it works</span>
            <h2>Up and running in an afternoon.</h2>
          </div>
          <ol className="zh-how__steps">
            {STEPS.map((t, i) => (
              <li key={t}>
                <span className="zh-how__n zs-num">{i + 1}</span>
                <b>{t}</b>
                {i < STEPS.length - 1 ? (
                  <span className="zh-how__arr" aria-hidden="true">
                    →
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
          <Link className="zs-btn" to="/download">
            See the install steps
          </Link>
        </div>
      </section>

      {/* 8 · Fair by design. */}
      <section className="zh-fair">
        <div className="zs-wrap zh-fair__in">
          <div className="zh-fair__copy">
            <span className="zs-eyebrow zh-fair__eyebrow">{FAIR.eyebrow}</span>
            <h2 className="zs-h2">{FAIR.title}</h2>
            <p className="zs-lead">{FAIR.lead}</p>
          </div>
          <div className="zh-fair__cards">
            {FAIR.cards.map((f) => (
              <div key={f.t} className="zh-fair__card">
                <span className="zh-fair__icon" aria-hidden="true">
                  <PathIcon d={f.icon} size={19} />
                </span>
                <b>{f.t}</b>
                <span>{f.b}</span>
              </div>
            ))}
          </div>
          <div className="zh-nevers">
            <span className="zh-nevers__l">Never recorded:</span>
            {FAIR.nevers.map((n) => (
              <span key={n} className="zh-never">
                <Cross />
                {n}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 9 · One real client's words, only with their permission. */}
      {MEMBER_QUOTE ? (
        <section className="zh-quote-wrap">
          <figure className="zs-card zh-quote">
            <span className="zs-pill tone-green">
              <span className="zh-quote__dot" aria-hidden="true" />
              From an active member
            </span>
            <blockquote>“{MEMBER_QUOTE.quote}”</blockquote>
            <figcaption>
              <b>{MEMBER_QUOTE.name}</b>
              <span>
                {MEMBER_QUOTE.role}, {MEMBER_QUOTE.business}
              </span>
            </figcaption>
          </figure>
        </section>
      ) : null}

      {/* 10 · Questions. Plans live on their own page, not on Home. */}
      <section className="zs-wrap zs-qa zh-faq">
        <div className="zs-qa__intro">
          <span className="zs-eyebrow">Questions owners ask</span>
          <h2 className="zs-h2">Straight answers.</h2>
          <p>
            Something else?{" "}
            <Link className="zs-link" to="/contact">
              Talk to the founder
            </Link>
            .
          </p>
        </div>
        <SiteFaq items={faqs} />
      </section>

      {/* 11 · Close. */}
      <section className="zs-wrap zh-closewrap">
        <div className="zs-close">
          <span className="zs-close__z" aria-hidden="true">
            Z
          </span>
          <div className="zs-close__copy">
            <h2>{CLOSE.title}</h2>
            <p>{CLOSE.body}</p>
          </div>
          <div className="zs-close__acts">
            <Link className="zs-btn zs-btn--dark" to="/signup?plan=free">
              Start free
            </Link>
            <Link className="zs-btn zs-btn--white" to="/contact">
              Book a setup call
            </Link>
          </div>
        </div>
      </section>
      <JsonLd data={SOFTWARE_LD} />
    </div>
  );
}
