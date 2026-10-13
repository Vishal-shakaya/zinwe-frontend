import { useCallback, useEffect, useLayoutEffect, useState, type ReactElement } from "react";
import { markTourDone, type TourStep } from "../features/tour";
import { DashIcon } from "./DashIcon";

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

function boxOf(selector: string): Box | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

/**
 * A spotlight tour: dims the page, rings one element, and shows a small card
 * beside it with Back / Next / Skip. Esc or Skip ends it; finishing (or
 * skipping) is remembered on this browser.
 */
export function Tour({ steps, onClose }: { steps: readonly TourStep[]; onClose: () => void }): ReactElement {
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const step = steps[index];
  const last = index === steps.length - 1;

  const finish = useCallback(() => {
    markTourDone();
    onClose();
  }, [onClose]);

  useLayoutEffect(() => {
    const el = document.querySelector(step.target);
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
    const measure = () => setBox(boxOf(step.target));
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [step.target]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight" && !last) setIndex((i) => i + 1);
      if (e.key === "ArrowLeft" && index > 0) setIndex((i) => i - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finish, last, index]);

  // Card beside the target: right of it if there's room, else below, else centred.
  const pad = 8;
  const cardW = 300;
  let cardStyle: React.CSSProperties = { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  if (box) {
    const roomRight = window.innerWidth - (box.left + box.width);
    if (roomRight > cardW + 32) {
      cardStyle = { top: Math.max(16, Math.min(box.top - 8, window.innerHeight - 260)), left: box.left + box.width + 18 };
    } else {
      const below = box.top + box.height + 14;
      cardStyle = below + 230 < window.innerHeight
        ? { top: below, left: Math.max(16, Math.min(box.left, window.innerWidth - cardW - 16)) }
        : { top: Math.max(16, box.top - 240), left: Math.max(16, Math.min(box.left, window.innerWidth - cardW - 16)) };
    }
  }

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {box ? (
        <div
          className="tour__ring"
          style={{ top: box.top - pad, left: box.left - pad, width: box.width + pad * 2, height: box.height + pad * 2 }}
        />
      ) : (
        <div className="tour__dim" />
      )}
      <div className="tour__card" style={cardStyle} key={index}>
        <span className="tour__icon" aria-hidden="true">
          <DashIcon name={step.icon} />
        </span>
        <h2 className="tour__title" id="tour-title">
          {step.title}
        </h2>
        <p className="tour__body">{step.body}</p>
        <div className="tour__foot">
          <span className="tour__dots" aria-label={`Step ${index + 1} of ${steps.length}`}>
            {steps.map((s, i) => (
              <i key={s.target} className={i === index ? "is-on" : undefined} />
            ))}
          </span>
          <button type="button" className="dash-link" onClick={finish}>
            Skip
          </button>
          {index > 0 ? (
            <button type="button" className="btn btn--ghost dash-btn-sm" onClick={() => setIndex(index - 1)}>
              Back
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn--primary dash-btn-sm"
            onClick={() => (last ? finish() : setIndex(index + 1))}
            autoFocus
          >
            {last ? "Done" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Tour;
