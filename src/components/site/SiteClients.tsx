import { useState, type ReactElement } from "react";
import { ACTIVE_MEMBERS, MEMBER_TONES, WALL_COPY, memberInitials } from "../../content/site/clients";
import { cx } from "../../lib/cx";
import { PauseGlyph, PlayGlyph } from "./SiteIcon";

function Mark({ name, i, big = false }: { name: string; i: number; big?: boolean }): ReactElement {
  return (
    <span aria-hidden="true" className={cx("zs-mono-mark", big && "zs-mono-mark--big", `tone-${MEMBER_TONES[i % MEMBER_TONES.length]}`)}>
      {memberInitials(name)}
    </span>
  );
}

/**
 * Active members (board SiteClients). `strip` = one line that drifts slowly; hover, focus and the pause button
 * stop it (WCAG 2.2.2), and reduced motion holds it still and wraps. `wall` = a grid of every member (Product).
 */
export function SiteClients({ variant = "strip" }: { variant?: "strip" | "wall" }): ReactElement {
  const [paused, setPaused] = useState(false);

  if (variant === "wall") {
    return (
      <section className="zs-wrap zs-wall" aria-labelledby="zs-wall-h">
        <div className="zs-wall__head">
          <span className="zs-clients__live">
            <span className="zs-clients__dot" aria-hidden="true" />
            ACTIVE MEMBERS
          </span>
          <h2 id="zs-wall-h">{WALL_COPY.title}</h2>
          <p>{WALL_COPY.body}</p>
        </div>
        <ul className="zs-wall__grid" aria-label="Our clients">
          {ACTIVE_MEMBERS.map((name, i) => (
            <li key={name} className="zs-wall__item">
              <Mark name={name} i={i} big />
              <span className="zs-wall__name">
                <span className={`zs-word-${i % 4}`}>{name}</span>
                <span className="zs-wall__active">Active member</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  const label = paused ? "Play the client list" : "Pause the client list";
  const items = () =>
    ACTIVE_MEMBERS.map((name, i) => (
      <li key={name} className="zs-clients__item">
        <Mark name={name} i={i} />
        <span className={`zs-word-${i % 4}`}>{name}</span>
      </li>
    ));

  return (
    <section className="zs-wrap" aria-labelledby="zs-clients-h">
      <div className="zs-clients__box">
        <div className="zs-clients__head">
          <span className="zs-clients__live">
            <span className="zs-clients__dot" aria-hidden="true" />
            ACTIVE MEMBERS
          </span>
          <h2 id="zs-clients-h">Small businesses that run their office on Zinwe</h2>
        </div>
        <div className="zs-clients__mask zs-clients__strip">
          <div className={cx("zs-clients__track", paused && "is-paused")}>
            <ul className="zs-clients__list" aria-label="Our clients">
              {items()}
            </ul>
            <ul className="zs-clients__list zs-clients__copy" aria-hidden="true">
              {items()}
            </ul>
          </div>
        </div>
        <button type="button" className="zs-clients__pp" aria-label={label} aria-pressed={paused} title={label} onClick={() => setPaused((p) => !p)}>
          {paused ? <PlayGlyph size={14} /> : <PauseGlyph size={14} />}
        </button>
      </div>
    </section>
  );
}
