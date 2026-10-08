import { Fragment, useEffect, useRef, useState, type CSSProperties, type ReactElement } from "react";
import { flushSync } from "react-dom";
import { translatorEvents, translatorNoise, type MessagePart } from "../../content/translatorEvents";
import { useInView } from "../../hooks/useInView";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { cx } from "../../lib/cx";
import { Chip } from "../ui/Chip";
import { ZinOrb } from "../ui/ZinOrb";

const TYPE_TICK_MS = 28;
const SETTLE_MS = 350;
const HOLD_MS = 4600;
const HOLD_REDUCED_MS = 6000;

interface LogState {
  /** Event whose raw line is in the terminal, or null before the first run. */
  event: number | null;
  /** Characters typed so far (>= full length means the line is complete). */
  chars: number;
  cursor: boolean;
}

interface DotState {
  /** Dot whose fill bar is animating (or finished), -1 for none. */
  on: number;
  /** Dots before this index are marked as already shown. */
  past: number;
}

function plainLine(n: number): string {
  const ev = translatorEvents[n];
  return ev.level + ev.raw;
}

function renderMessage(parts: MessagePart[]): ReactElement[] {
  return parts.map((part, i) =>
    typeof part === "string" ? <Fragment key={i}>{part}</Fragment> : <strong key={i}>{part.strong}</strong>,
  );
}

/**
 * Hero signature: a raw log line types itself out, then the card "translates"
 * it into a plain-English alert. Loops while on screen; dots jump to an example.
 */
export function Translator(): ReactElement {
  const reduce = usePrefersReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const dotRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const running = useInView(rootRef, { threshold: 0.2 });

  const [idx, setIdx] = useState(0);
  // Bumped on every dot click so clicking the current dot restarts it too.
  const [restart, setRestart] = useState(0);
  const [log, setLog] = useState<LogState>({ event: null, chars: 0, cursor: false });
  const [shown, setShown] = useState<number | null>(null);
  const [switching, setSwitching] = useState(false);
  const [dots, setDots] = useState<DotState>({ on: -1, past: 0 });

  // One effect drives one full cycle for event `idx`. Every timer it schedules
  // goes through `later`, and the cleanup cancels the pending one, so a pause
  // (off-screen), a dot click, or StrictMode's double-mount never overlaps runs.
  useEffect(() => {
    if (!running) return;

    let timer = 0;
    const later = (fn: () => void, ms: number) => {
      timer = window.setTimeout(fn, ms);
    };
    const total = plainLine(idx).length;
    const hold = reduce ? HOLD_REDUCED_MS : HOLD_MS;

    const markDot = () => {
      // Remove `is-on`, force a reflow, then re-add: restarts the CSS fill
      // animation even when the same dot is shown again (as site.js does).
      flushSync(() => setDots({ on: -1, past: idx }));
      void dotRefs.current[idx]?.offsetWidth;
      setDots({ on: idx, past: idx });
    };

    const revealCard = () => {
      setShown(idx);
      setSwitching(false);
      markDot();
      later(() => setIdx((idx + 1) % translatorEvents.length), hold);
    };

    const startCycle = () => {
      setSwitching(true);
      if (reduce) {
        setLog({ event: idx, chars: total, cursor: false });
        later(revealCard, 0);
        return;
      }
      const stepSize = Math.max(1, Math.round(total / 48));
      let typed = 0;
      const step = () => {
        typed += stepSize;
        if (typed >= total) {
          setLog({ event: idx, chars: total, cursor: true });
          later(revealCard, SETTLE_MS);
          return;
        }
        setLog({ event: idx, chars: typed, cursor: true });
        later(step, TYPE_TICK_MS);
      };
      step();
    };
    // Start on the next tick (state is only ever set from timer callbacks).
    later(startCycle, 0);

    return () => window.clearTimeout(timer);
  }, [running, idx, restart, reduce]);

  const jumpTo = (n: number) => {
    setIdx(n);
    setRestart((r) => r + 1);
  };

  const logEvent = log.event === null ? null : translatorEvents[log.event];
  const shownEvent = shown === null ? null : translatorEvents[shown];
  const complete = log.event !== null && log.chars >= plainLine(log.event).length;

  return (
    <div className="xl" ref={rootRef} aria-label="Example: what your computers report, and what Zinwe tells you">
      <div className="xl__raw">
        <span className="xl__tag">What your computers say</span>
        <pre className="xl__log" aria-live="off">
          {logEvent && complete ? (
            <>
              <span className="k">{logEvent.level}</span>
              {logEvent.raw}
            </>
          ) : logEvent ? (
            plainLine(log.event as number).slice(0, log.chars)
          ) : null}
          {log.cursor ? <i className="cur"></i> : null}
        </pre>
        <div className="xl__noise" aria-hidden="true">
          {translatorNoise.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
      </div>
      <div className="xl__link" aria-hidden="true">
        <ZinOrb />
      </div>
      <div className={cx("xl__card", switching && "is-switching")}>
        <span className="xl__tag">What Zinwe tells you</span>
        <p className="xl__msg" aria-live="polite">
          {shownEvent ? renderMessage(shownEvent.msg) : null}
        </p>
        <div className="xl__meta">
          <i className="xl__sev"></i>
          <span className="xl__meta-text">{shownEvent?.meta}</span>
        </div>
        <div className="xl__actions">
          {shownEvent?.actions.map((label, i) => (
            <Chip key={`${shown}-${i}`} on={i === 0}>
              {label}
            </Chip>
          ))}
        </div>
        <div className="xl__dots" aria-label="Switch example">
          {translatorEvents.map((_, i) => (
            <button
              key={i}
              ref={(el) => {
                dotRefs.current[i] = el;
              }}
              type="button"
              className={cx("xl__dot", dots.on === i && "is-on", i < dots.past && "is-past")}
              style={dots.on === i ? ({ "--dot-ms": `${reduce ? HOLD_REDUCED_MS : HOLD_MS}ms` } as CSSProperties) : undefined}
              aria-label={`Example ${i + 1}`}
              onClick={() => jumpTo(i)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
