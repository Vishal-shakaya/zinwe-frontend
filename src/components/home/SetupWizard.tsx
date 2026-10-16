import { useEffect, useRef, useState, type ReactElement } from "react";
import { wizardQuestions } from "../../content/wizard";
import { useInView } from "../../hooks/useInView";
import { prefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { useReveal } from "../../hooks/useReveal";
import { cx } from "../../lib/cx";
import { Chip } from "../ui/Chip";
import { Icon } from "../ui/Icon";

const STEP_MS = 1100;
const COUNT = wizardQuestions.length;

const noneDone = () => wizardQuestions.map(() => false);
const nonePicked = () => wizardQuestions.map((): number | null => null);
const defaultRules = () => wizardQuestions.map((q) => q.options[q.pick].rule);

function replaceAt<T>(list: T[], i: number, value: T): T[] {
  return list.map((v, j) => (j === i ? value : v));
}

/**
 * Setup-wizard demo (#how): auto-plays the three questions once it is 40%
 * visible, then shows the "3 rules active" bar with a Replay button.
 * Visitors can also click any answer to see its rule.
 */
export function SetupWizard(): ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const revealed = useReveal(ref);
  const seen = useInView(ref, { threshold: 0.4, once: true });
  const [replays, setReplays] = useState(0);
  /** 0 until first seen; every change (re)starts the demo. */
  const playKey = seen ? replays + 1 : 0;

  const [active, setActive] = useState(-1);
  const [done, setDone] = useState<boolean[]>(noneDone);
  const [picked, setPicked] = useState<Array<number | null>>(nonePicked);
  const [rules, setRules] = useState<string[]>(defaultRules);
  const [step, setStep] = useState(1);
  const [progress, setProgress] = useState(0);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    if (playKey === 0) return;

    const stepMs = prefersReducedMotion() ? 0 : STEP_MS;
    const timers: number[] = [];
    // Reset first (same-delay timers run in order, so this precedes question 1).
    timers.push(
      window.setTimeout(() => {
        setComplete(false);
        setProgress(0);
        setStep(1);
        setActive(-1);
        setDone(noneDone());
        setPicked(nonePicked());
      }, 0),
    );
    wizardQuestions.forEach((q, i) => {
      timers.push(
        window.setTimeout(() => {
          setActive(i);
          setStep(i + 1);
          setProgress(((i + 0.5) / COUNT) * 100);
        }, i * stepMs),
      );
      timers.push(
        window.setTimeout(
          () => {
            setPicked((p) => replaceAt(p, i, q.pick));
            setRules((r) => replaceAt(r, i, q.options[q.pick].rule));
            setDone((d) => replaceAt(d, i, true));
            setProgress(((i + 1) / COUNT) * 100);
          },
          i * stepMs + stepMs * 0.6,
        ),
      );
    });
    timers.push(window.setTimeout(() => setComplete(true), COUNT * stepMs + 200));

    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [playKey]);

  // Manual picks still work during and after the demo.
  const choose = (qi: number, oi: number) => {
    setPicked((p) => replaceAt(p, qi, oi));
    setDone((d) => replaceAt(d, qi, true));
    setRules((r) => replaceAt(r, qi, wizardQuestions[qi].options[oi].rule));
  };

  return (
    <div ref={ref} className={cx("wiz rv", revealed && "is-in", complete && "is-complete")} data-delay="1">
      <div className="wiz__prog">
        <i style={{ width: `${progress}%` }}></i>
      </div>
      <div className="wiz__body">
        <div className="wiz__head">
          <span>Setup wizard</span>
          <span>
            Question <b className="wiz__step">{step}</b> of {COUNT}
          </span>
        </div>
        {wizardQuestions.map((q, qi) => (
          <div key={q.question} className={cx("wiz__q", active === qi && "is-active", done[qi] && "is-done")}>
            <p className="wiz__qt">{q.question}</p>
            <div className="wiz__opts">
              {q.options.map((opt, oi) => (
                <Chip key={opt.label} on={picked[qi] === oi} onClick={() => choose(qi, oi)}>
                  {opt.label}
                </Chip>
              ))}
            </div>
            <div className="wiz__rule">
              <Icon name="check" strokeWidth={2.5} />
              <span>{rules[qi]}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="wiz__done">
        <span>
          <b>{COUNT} rules</b> active on 12 PCs, each within a minute.
        </span>
        <button className="wiz__replay" type="button" onClick={() => setReplays((r) => r + 1)}>
          Replay
        </button>
      </div>
    </div>
  );
}
