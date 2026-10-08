import { useState, type ReactElement } from "react";
import { watchItems } from "../../content/watchItems";
import { cx } from "../../lib/cx";
import { Icon } from "../ui/Icon";
import { Reveal } from "../ui/Reveal";

/** "What it watches" section: five live on/off switches with an active count. */
export function WatchPanel(): ReactElement {
  const [enabled, setEnabled] = useState<boolean[]>(() => watchItems.map(() => true));
  const activeCount = enabled.filter(Boolean).length;

  const toggle = (i: number) => setEnabled((prev) => prev.map((on, j) => (j === i ? !on : on)));

  return (
    <section className="sec sec--paper" id="watch">
      <div className="wrap split">
        <Reveal>
          <p className="eyebrow">What it watches</p>
          <h2 className="h-section">Five doors your data can leave through. All covered.</h2>
          <p className="lede">One switch each. Turn on what matters to your business, leave the rest.</p>
        </Reveal>
        <Reveal className="panel" delay={1}>
          <div className="panel__bar">
            <span>
              <b>Acme Interiors</b> · 12 PCs
            </span>
            <span className="panel__status" data-watch-count="">
              {`${activeCount} of ${watchItems.length} active`}
            </span>
          </div>
          <ul className="watch">
            {watchItems.map((item, i) => (
              <li key={item.id} className={cx("watch__row", !enabled[i] && "is-off")}>
                <div className="watch__ico">
                  <Icon name={item.icon} />
                </div>
                <div>
                  <p className="watch__name">{item.name}</p>
                  <p className="watch__what">{item.what}</p>
                </div>
                <button
                  className="toggle"
                  type="button"
                  role="switch"
                  aria-checked={enabled[i]}
                  aria-label={item.switchLabel}
                  onClick={() => toggle(i)}
                ></button>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
