import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { FACES, FEATURES, TILES_INTRO, type FeatureKey } from "../../../content/site/home";
import { AVATARS } from "../../../dashboard/team/avatars";
import { ICONS } from "../icons";
import { PathIcon } from "../SiteIcon";
import { Face } from "./Face";

/** Each card's little scene: glass panels with the demo company's people (sample data, never real customers). */
function Scene({ k }: { k: FeatureKey }): ReactElement {
  switch (k) {
    case "chat":
      return (
        <div className="zh2-glass zh2-sc-chat">
          <span className="zh2-msg">
            <Face k={FACES.priya} size={30} />
            <span className="zh2-bub">Sharma Traders sent only 3 of 5 invoices.</span>
          </span>
          <span className="zh2-msg zh2-msg--me">
            <span className="zh2-bub zh2-bub--me">Thanks Priya. Making it a task.</span>
          </span>
          <span className="zh2-seen">2:14 PM · Seen</span>
        </div>
      );
    case "tasks":
      return (
        <div className="zh2-glass zh2-sc-task">
          <span className="zh2-sc-task__top">
            <Face k={FACES.arjun} size={30} />
            <b>Reconcile October GST input credit</b>
          </span>
          <span className="zh2-stages" aria-hidden="true">
            <span className="is-done" />
            <span className="is-done" />
            <span className="is-now" />
            <span />
          </span>
          <span className="zh2-stages__l">
            <span>Sent</span>
            <span>Seen</span>
            <span>In progress</span>
            <span>Done</span>
          </span>
          <span className="zh2-chip zh2-chip--orange">Today, 5 PM</span>
        </div>
      );
    case "reports":
      return (
        <div className="zh2-glass zh2-sc-rep">
          <b className="zh2-sc__h">Hours this week</b>
          {(
            [
              [FACES.arjun, "Arjun", 34],
              [FACES.priya, "Priya", 33],
              [FACES.sneha, "Sneha", 27],
            ] as const
          ).map(([face, name, h]) => (
            <span key={name} className="zh2-rep">
              <Face k={face} size={28} />
              <span className="zh2-rep__n">{name}</span>
              <span className="zh2-rep__bar">
                <span style={{ width: `${Math.round((h / 34) * 100)}%` }} />
              </span>
              <span className="zh2-rep__h zs-num">{h} h</span>
            </span>
          ))}
        </div>
      );
    case "protection":
      return (
        <div className="zh2-glass zh2-sc-prot">
          {(
            [
              [ICONS.usb, "Pen drives", "Open files only"],
              [ICONS.app, "Remote-control apps", "Only ours"],
              [ICONS.web, "Risky websites", "Blocked"],
            ] as const
          ).map(([icon, t, v]) => (
            <span key={t} className="zh2-rule">
              <PathIcon d={icon} size={17} />
              <span className="zh2-rule__t">{t}</span>
              <span className="zh2-chip">{v}</span>
            </span>
          ))}
        </div>
      );
    case "hours":
      return (
        <div className="zh2-glass zh2-sc-hours">
          <span className="zh2-ask">
            <Face k={FACES.emily} size={30} />
            <span className="zh2-ask__t">
              <b>Emily</b> · lunch, 42 min
            </span>
            <span className="zh2-chip zh2-chip--ink">Approve</span>
          </span>
          {(
            [
              [FACES.arjun, [[6, 52], [60, 92]]],
              [FACES.priya, [[10, 48], [56, 94]]],
              [FACES.emily, [[4, 58]]],
            ] as const
          ).map(([face, segs]) => (
            <span key={face} className="zh2-day">
              <Face k={face} size={24} />
              <span className="zh2-day__track">
                {segs.map(([a, b]) => (
                  <span key={a} style={{ left: `${a}%`, width: `${b - a}%` }} />
                ))}
              </span>
            </span>
          ))}
        </div>
      );
    case "alerts":
      return (
        <div className="zh2-glass zh2-sc-alert">
          <span className="zh2-chip zh2-chip--orange">Needs you</span>
          <span className="zh2-sc-alert__who">
            <Face k={FACES.karan} size={30} />
            <b>Karan copied 1.8 GB to a pen drive</b>
          </span>
          <span className="zh2-sc-alert__b">Sizes only, never what was in the files.</span>
          <span className="zh2-sc-alert__acts">
            <span className="zh2-chip zh2-chip--ink">Ask Karan</span>
            <span className="zh2-chip">Make USB read-only</span>
          </span>
        </div>
      );
    case "pictures":
      return (
        <div className="zh2-glass zh2-sc-pics">
          {AVATARS.slice(0, 12).map((a, i) => (
            <Face key={a.key} k={a.key} size={44} className={i === 4 ? "is-picked" : undefined} />
          ))}
        </div>
      );
  }
}

/**
 * The features as an Apple-style rail: native horizontal scroll with snap (swipe on touch, trackpad, Shift+wheel),
 * the next card peeking, and two arrow buttons on wider screens. No scroll-jacking; reduced motion jumps instead.
 */
export function FeatureRail(): ReactElement {
  const rail = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const el = rail.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdge({ start: el.scrollLeft <= 4, end: el.scrollLeft >= max - 4 });
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  const go = (dir: 1 | -1) => {
    const el = rail.current;
    const card = el?.querySelector<HTMLElement>(".zh2-card");
    if (!el || !card) return;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * (card.offsetWidth + gap), behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <section className="zh2-sec zh2-feat" aria-labelledby="zh2-feat-h">
      <div className="zs-wrap zh2-feat__head">
        <div className="zh2-head">
          <span className="zh2-kick">{TILES_INTRO.eyebrow}</span>
          <h2 id="zh2-feat-h" className="zh2-h">
            {TILES_INTRO.title}
          </h2>
          <p className="zh2-lead">{TILES_INTRO.lead}</p>
        </div>
      </div>
      <ul className="zh2-rail" ref={rail} onScroll={measure} aria-label="What Zinwe does">
        {FEATURES.map((f) => (
          <li key={f.key} className={`zh2-card zh2-card--${f.key}`}>
            <div className="zh2-card__text">
              <span className="zh2-card__kick">{f.kick}</span>
              <h3 className="zh2-card__h">{f.title}</h3>
              <p className="zh2-card__p">{f.body}</p>
            </div>
            <div className="zh2-card__vis" aria-hidden="true">
              <Scene k={f.key} />
            </div>
            {f.href ? (
              <Link className="zh2-card__link" to={f.href} aria-label={f.link}>
                <span className="zh2-card__more">
                  <PathIcon d={ICONS.chevron} size={18} stroke={2.4} className="zh2-arrow__r" />
                </span>
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="zs-wrap zh2-rail__nav">
        <button type="button" className="zh2-arrow" aria-label="Previous feature" disabled={edge.start} onClick={() => go(-1)}>
          <PathIcon d={ICONS.chevron} size={18} stroke={2.4} className="zh2-arrow__l" />
        </button>
        <button type="button" className="zh2-arrow" aria-label="Next feature" disabled={edge.end} onClick={() => go(1)}>
          <PathIcon d={ICONS.chevron} size={18} stroke={2.4} className="zh2-arrow__r" />
        </button>
      </div>
    </section>
  );
}
