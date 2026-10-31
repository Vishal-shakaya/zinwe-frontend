import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { FEATURES, FEATURE_SHOT, TILES_INTRO } from "../../../content/site/home";
import { ICONS } from "../icons";
import { PathIcon } from "../SiteIcon";

/**
 * The features as an Apple-style rail: native horizontal scroll with snap (swipe on touch, trackpad, Shift+wheel),
 * the next card peeking, and left and right arrows above the row. No scroll-jacking; reduced motion jumps instead.
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
        <div className="zh2-head zh2-head--center">
          <span className="zh2-kick">{TILES_INTRO.eyebrow}</span>
          <h2 id="zh2-feat-h" className="zh2-h">
            {TILES_INTRO.title}
          </h2>
          <p className="zh2-lead">{TILES_INTRO.lead}</p>
        </div>
        <div className="zh2-rail__nav">
          <button type="button" className="zh2-arrow" aria-label="Previous feature" disabled={edge.start} onClick={() => go(-1)}>
            <PathIcon d={ICONS.chevron} size={18} stroke={2.4} className="zh2-arrow__l" />
          </button>
          <button type="button" className="zh2-arrow" aria-label="Next feature" disabled={edge.end} onClick={() => go(1)}>
            <PathIcon d={ICONS.chevron} size={18} stroke={2.4} className="zh2-arrow__r" />
          </button>
        </div>
      </div>
      <ul className="zh2-rail" ref={rail} onScroll={measure} aria-label="What Zinwe does">
        {FEATURES.map((f) => (
          <li key={f.key} className={`zh2-card zh2-card--${f.key}`}>
            <div className="zh2-card__text">
              <span className="zh2-card__kick">
                <b className="zs-num">{f.time}</b> · {f.kick}
              </span>
              <h3 className="zh2-card__h">{f.title}</h3>
              <p className="zh2-card__p">{f.body}</p>
            </div>
            <div className="zh2-card__vis" aria-hidden="true">
              <img src={`/media/home/${f.key}.webp`} width={FEATURE_SHOT.width} height={FEATURE_SHOT.height} alt="" loading="lazy" decoding="async" />
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
    </section>
  );
}
