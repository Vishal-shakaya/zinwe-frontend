import { useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { ChatSpotlight } from "../components/site/home2/ChatSpotlight";
import { ClientWall } from "../components/site/home2/ClientWall";
import { Face } from "../components/site/home2/Face";
import { FeatureRail } from "../components/site/home2/FeatureRail";
import { SiteFaq } from "../components/site/SiteFaq";
import { ICONS } from "../components/site/icons";
import { PathIcon, Tick, Cross } from "../components/site/SiteIcon";
import { SitePortal } from "../components/site/SitePortal";
import { useHeroCtaRef } from "../components/layout/heroCtaContext";
import { Brand } from "../components/ui/Brand";
import { JsonLd } from "../components/ui/JsonLd";
import { CLOSE, FACES, FAIR, HERO, MEMBER_QUOTE, PROTECTION, RULES, RULE_DEFAULTS, STEPS, TEAM_SIDE, type RuleKey } from "../content/site/home";
import { HOME_FAQ, HOME_PRICE_Q, SOFTWARE_LD, seoFor } from "../content/seo";
import { usePageMeta } from "../hooks/usePageMeta";
import { cx } from "../lib/cx";
import { homePriceAnswer } from "../lib/sitePrices";
import { usePlans } from "../portal/usePlans";
import "../styles/site-home.css";
import "../styles/site-home2.css";

/**
 * Home v3.2 (board SiteHome, 29 Oct review) with the v1.3.2 calm pass below the demo (owner, 31 Oct): promise +
 * reassurances → the live dashboard (both unchanged) → the client wall (Notion style) → the features as an
 * Apple-style card rail with faces → chat in depth → protection, hands-on, with the mid-page sign-up → the team's
 * side → how it works → consent first → questions → close. Everything below the demo lives in .zh2 (site-home2.css),
 * on one spacing scale. The client quote shows only once a real client has agreed (content/site/home.ts MEMBER_QUOTE).
 */
export default function HomePage(): ReactElement {
  usePageMeta(seoFor("/"));
  const heroCta = useHeroCtaRef();
  const [rules, setRules] = useState<Record<RuleKey, string>>(RULE_DEFAULTS);
  const plans = usePlans();
  const priceAnswer = plans.data ? homePriceAnswer(plans.data) : null;
  const faqs = HOME_FAQ.map((f) => (f.q === HOME_PRICE_Q && priceAnswer ? { ...f, a: priceAnswer } : f));
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
        <div className="zh-hero__acts" ref={heroCta}>
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

      {/* ---- Below the demo caption: v1.3.2 Notion-calm (owner, 31 Oct). One spacing scale (.zh2-sec), one measure. ---- */}
      <div className="zh2">
        {/* 2 · Who already uses it: a Notion-style wall of grey wordmarks. */}
        <ClientWall />

        {/* 3 · What it does: an Apple-style rail of glass cards with faces. */}
        <FeatureRail />

        {/* 4 · Chat, in depth: the words and the conversation itself. */}
        <ChatSpotlight />

        {/* 5 · Protection, hands-on: pick a rule, see what happens on the PC. */}
        <section id="protection" className="zh2-sec zh2-prot" aria-labelledby="zh2-prot-h">
          <div className="zs-wrap zh2-measure">
            <div className="zh2-head zh2-head--split">
              <div>
                <span className="zh2-kick">{PROTECTION.eyebrow}</span>
                <h2 id="zh2-prot-h" className="zh2-h">
                  {PROTECTION.title}
                </h2>
                <p className="zh2-lead">{PROTECTION.lead}</p>
              </div>
              <Link className="zh2-more" to="/product#protection">
                All six protections <span aria-hidden="true">›</span>
              </Link>
            </div>
            <div className="zh2-prot__grid">
              <div className="zh2-rules">
                {RULES.map((r) => (
                  <fieldset key={r.key} className="zh2-rulerow">
                    <legend className="zs-sr">{r.title}</legend>
                    <div className="zh2-rulerow__head">
                      <PathIcon d={r.icon} size={20} className="zh2-rulerow__icon" />
                      <span className="zh2-rulerow__t">
                        <b>{r.title}</b>
                        <span>{r.sub}</span>
                      </span>
                    </div>
                    <div className="zh2-seg" role="group" aria-label={r.title}>
                      {r.options.map(([v, label]) => (
                        <button
                          key={v}
                          type="button"
                          className={cx("zh2-seg__opt", rules[r.key] === v && "is-on")}
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
              <div className="zh2-pc">
                <div className="zh2-pc__head">
                  <Face k={FACES.karan} size={32} />
                  <span>
                    <b className="zs-mono">KC-SALES-LAPTOP-02</b>
                    <span>What happens on the PC</span>
                  </span>
                </div>
                <div className="zh2-pc__list" aria-live="polite">
                  {RULES.map((r) => {
                    const o = r.out[rules[r.key]];
                    return (
                      <div key={`${r.key}-${rules[r.key]}`} className="zh2-out zs-pop">
                        <span className="zh2-out__when">{r.when}</span>
                        <span className="zh2-out__row">
                          <b>{o.title}</b>
                          <span className={`zh2-out__state is-${o.tone}`}>{o.state}</span>
                        </span>
                        <span className="zh2-out__b">{o.body}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="zh2-pc__sum">
                  <PathIcon d={ICONS.shieldCheck} size={17} stroke={2.4} className="zh2-pc__shield" />
                  <span>
                    <b>Your rules:</b> {summary}
                  </span>
                </p>
              </div>
            </div>
            {/* Mid-page sign-up, so nobody scrolls back up to the hero to start. */}
            <div className="zh2-mid">
              <Link className="zs-btn zs-btn--lg zs-btn--pri" to="/signup?plan=free">
                Start free, up to 3 PCs
              </Link>
              <span>No card needed · Simple enough to set up this afternoon</span>
            </div>
          </div>
        </section>

        {/* 6 · What your team gets: the tray app. */}
        <section className="zh2-sec zh2-team" aria-labelledby="zh2-team-h">
          <div className="zs-wrap zh2-measure zh2-team__in">
            <div className="zh2-team__copy">
              <span className="zh2-kick">{TEAM_SIDE.eyebrow}</span>
              <h2 id="zh2-team-h" className="zh2-h">
                {TEAM_SIDE.title}
              </h2>
              <p className="zh2-lead">{TEAM_SIDE.lead}</p>
              <ul className="zh2-ticks">
                {TEAM_SIDE.points.map((t) => (
                  <li key={t}>
                    <Tick size={15} stroke={2.6} className="zh2-tick" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="zh2-team__vis">
              <div className="zh-tray" aria-label="The Zinwe window on a team member's PC (sample)" role="img">
                <div className="zh-tray__title">
                  <Brand variant="static" height={16} />
                  <span>Kitecrest Digital</span>
                </div>
                <div className="zh-tray__head">
                  <Face k={FACES.emily} size={34} className="zh2-face--round" />
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

        {/* 7 · How it works: three steps (the full steps live on Download). */}
        <section className="zh2-sec zh2-how" aria-labelledby="zh2-how-h">
          <div className="zs-wrap zh2-measure">
            <div className="zh2-head zh2-head--center">
              <span className="zh2-kick">How it works</span>
              <h2 id="zh2-how-h" className="zh2-h">
                Up and running in an afternoon.
              </h2>
            </div>
            <ol className="zh2-steps">
              {STEPS.map((t, i) => (
                <li key={t}>
                  <span className="zh2-steps__n zs-num">{i + 1}</span>
                  <b>{t}</b>
                </li>
              ))}
            </ol>
            <p className="zh2-center">
              <Link className="zh2-more" to="/download">
                See the install steps <span aria-hidden="true">›</span>
              </Link>
            </p>
          </div>
        </section>

        {/* 8 · Fair by design. */}
        <section className="zh2-sec zh2-fair" aria-labelledby="zh2-fair-h">
          <div className="zs-wrap zh2-measure">
            <div className="zh2-head">
              <span className="zh2-kick">{FAIR.eyebrow}</span>
              <h2 id="zh2-fair-h" className="zh2-h">
                {FAIR.title}
              </h2>
              <p className="zh2-lead">{FAIR.lead}</p>
            </div>
            <div className="zh2-cols">
              {FAIR.cards.map((f) => (
                <div key={f.t} className="zh2-col">
                  <PathIcon d={f.icon} size={22} className="zh2-col__icon" />
                  <b>{f.t}</b>
                  <span>{f.b}</span>
                </div>
              ))}
            </div>
            <p className="zh2-nevers">
              <span className="zh2-nevers__l">Never recorded:</span>
              {FAIR.nevers.map((n) => (
                <span key={n} className="zh2-never">
                  <Cross size={11} className="zh2-never__x" />
                  {n}
                </span>
              ))}
            </p>
          </div>
        </section>

        {/* 9 · One real client's words, only with their permission. */}
        {MEMBER_QUOTE ? (
          <section className="zh2-sec zh2-quote">
            <figure className="zs-wrap zh2-measure zh2-quote__in">
              <span className="zh2-kick">From an active member</span>
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
        <section className="zh2-sec zh2-faq">
          <div className="zs-wrap zh2-measure zs-qa">
            <div className="zs-qa__intro">
              <span className="zh2-kick">Questions owners ask</span>
              <h2 className="zh2-h">Straight answers.</h2>
              <p>
                Something else?{" "}
                <Link className="zs-link" to="/contact">
                  Talk to the founder
                </Link>
                .
              </p>
            </div>
            <SiteFaq items={faqs} className="zh2-faqlist" />
          </div>
        </section>

        {/* 11 · Close. */}
        <section className="zh2-sec zh2-close">
          <div className="zs-wrap zh2-measure">
            <div className="zs-close">
              <img className="zs-close__z" src="/brand/zinwe-mark-256.png" width={256} height={256} alt="" aria-hidden="true" />
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
          </div>
        </section>
      </div>
      <JsonLd data={SOFTWARE_LD} />
    </div>
  );
}
