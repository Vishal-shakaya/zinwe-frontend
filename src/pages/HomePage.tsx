import { useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { ChatSpotlight } from "../components/site/home2/ChatSpotlight";
import { ClientWall } from "../components/site/home2/ClientWall";
import { Face } from "../components/site/home2/Face";
import { FeatureRail } from "../components/site/home2/FeatureRail";
import { ReviewRow } from "../components/site/home2/ReviewRow";
import { WhatCards } from "../components/site/home2/WhatCards";
import { DeviceLoops } from "../components/resources/DeviceLoops";
import { SiteFaq } from "../components/site/SiteFaq";
import { Tick } from "../components/site/SiteIcon";
import { useHeroCtaRef } from "../components/layout/heroCtaContext";
import { JsonLd } from "../components/ui/JsonLd";
import { CLOSE, FACES, HERO, HOME_FAQ_SHOWN, PROTECTION, RULES, STEPS, WHAT } from "../content/site/home";
import { HOME_FAQ, HOME_PRICE_Q, SOFTWARE_LD, seoFor } from "../content/seo";
import { useIsPhone } from "../hooks/useIsPhone";
import { usePageMeta } from "../hooks/usePageMeta";
import { cx } from "../lib/cx";
import { homePriceAnswer } from "../lib/sitePrices";
import { usePlans } from "../portal/usePlans";
import "../styles/site-home.css";
import "../styles/site-home2.css";
import "../styles/resources.css";

/**
 * Home v3.2 (board SiteHome, 29 Oct review) with the v1.3.2 simple pass below the demo (owner, 31 Oct): promise +
 * reassurances → the product on a laptop and a phone (the recorded loops) → the client wall → what Zinwe does in
 * three cards → data
 * protection, one question → chat → the feature cards → how it works, with the sign-up →
 * reviews → questions → close. Depth lives on the Product page. Everything below the demo lives in .zh2
 * (site-home2.css), on one spacing scale. The review row comes from Admin → Testimonials.
 */
const USB = RULES[0];

export default function HomePage(): ReactElement {
  usePageMeta(seoFor("/"));
  const heroCta = useHeroCtaRef();
  const phone = useIsPhone();
  const [usb, setUsb] = useState("readonly");
  const usbResult = USB.out[usb];
  const plans = usePlans();
  const priceAnswer = plans.data ? homePriceAnswer(plans.data) : null;
  const faqs = HOME_FAQ.filter((f) => HOME_FAQ_SHOWN.includes(f.q)).map((f) => (f.q === HOME_PRICE_Q && priceAnswer ? { ...f, a: priceAnswer } : f));

  return (
    <div className="zh">
      {/* 1 · Hero: one promise, two buttons, then the product itself. */}
      <section className="zs-wrap zh-hero">
        <span className="zh-badge">
          <span className="zh-badge__ok">{HERO.badge}</span>
          {HERO.badgeText}
        </span>
        <h1 className="zs-h1 zh-hero__h">{HERO.title}</h1>
        <p className="zs-lead zh-hero__lead">{phone ? HERO.leadPhone : HERO.lead}</p>
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
        <div className="zrs">
          <DeviceLoops compact />
        </div>
      </section>

      {/* ---- Below the demo caption: v1.3.2 Notion-calm (owner, 31 Oct). One spacing scale (.zh2-sec), one measure. ---- */}
      <div className="zh2">
        {/* 2 · Who already uses it: a Notion-style wall of grey wordmarks. */}
        <ClientWall />

        {/* 3 · What Zinwe does: three plain jobs, one line each. */}
        <section className="zh2-sec zh2-what" aria-labelledby="zh2-what-h">
          <div className="zs-wrap zh2-measure">
            <div className="zh2-head">
              <span className="zh2-kick">{WHAT.eyebrow}</span>
              <h2 id="zh2-what-h" className="zh2-h">
                {WHAT.title}
              </h2>
            </div>
            <WhatCards />
          </div>
        </section>

        {/* 4 · Data protection: one question, one result. */}
        <section id="protection" className="zh2-sec zh2-prot" aria-labelledby="zh2-prot-h">
          <div className="zs-wrap zh2-measure zh2-team__in">
            <div className="zh2-team__copy">
              <span className="zh2-kick">{PROTECTION.eyebrow}</span>
              <h2 id="zh2-prot-h" className="zh2-h">
                {PROTECTION.title}
              </h2>
              <p className="zh2-lead">{PROTECTION.lead}</p>
              <fieldset className="zh2-ask">
                <legend>{PROTECTION.question}</legend>
                <div className="zh2-seg" role="group" aria-label={PROTECTION.question}>
                  {USB.options.map(([v, label]) => (
                    <button key={v} type="button" className={cx("zh2-seg__opt", usb === v && "is-on")} aria-pressed={usb === v} onClick={() => setUsb(v)}>
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <Link className="zh2-more" to="/product#protection">
                All six protections <span aria-hidden="true">›</span>
              </Link>
            </div>
            {/* The rule wired to the PC and back to the owner: each change sends a dot down the line. */}
            <div className="zh2-wired" key={usb}>
              <div className="zh2-node">
                <span className="zh2-node__k">Your rule</span>
                <b>{USB.options.find(([v]) => v === usb)?.[1]}</b>
              </div>
              <span className="zh2-wire" aria-hidden="true" />
              <div className="zh2-pc">
                <div className="zh2-pc__head">
                  <Face k={FACES.karan} size={32} />
                  <span>
                    <b className="zs-mono">KC-SALES-LAPTOP-02</b>
                    <span>What happens on the PC</span>
                  </span>
                </div>
                <div className="zh2-pc__list" aria-live="polite">
                  <div key={usb} className="zh2-out zs-pop">
                    <span className="zh2-out__when">{USB.when}</span>
                    <span className="zh2-out__row">
                      <b>{usbResult.title}</b>
                      <span className={`zh2-out__state is-${usbResult.tone}`}>{usbResult.state}</span>
                    </span>
                    <span className="zh2-out__b">{usbResult.body}</span>
                  </div>
                </div>
              </div>
              <span className="zh2-wire zh2-wire--late" aria-hidden="true" />
              <div className="zh2-node">
                <span className="zh2-node__k">Your dashboard</span>
                <b>{PROTECTION.owner}</b>
              </div>
            </div>
          </div>
        </section>

        {/* 5 · Chat: the words on one side, the conversation on the other. */}
        <ChatSpotlight />

        {/* 6 · Every other feature, one card each, for those who want more. */}
        <FeatureRail />

        {/* 7 · How it works: three steps, then the sign-up. */}
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
            <div className="zh2-mid">
              <Link className="zs-btn zs-btn--lg zs-btn--pri" to="/signup?plan=free">
                Start free, up to 3 PCs
              </Link>
              <span>No card needed · Simple enough to set up this afternoon</span>
            </div>
          </div>
        </section>

        {/* 8 · Reviews from owners and team members, only with their permission. */}
        <ReviewRow />

        {/* 9 · Questions. Plans live on their own page, not on Home. */}
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

        {/* 10 · Close. */}
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
