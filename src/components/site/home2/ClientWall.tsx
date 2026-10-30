import type { ReactElement, ReactNode } from "react";
import { ACTIVE_MEMBERS, HOME_WALL_LEAD } from "../../../content/site/clients";

/**
 * Each client as a typographic wordmark (v1.3.2, owner's Notion reference): varied weights, cases, tracking, serif
 * and sans, all in one calm grey, so the wall reads like logos rather than a list. These are NOT the clients' own
 * logos (rule 3: no customer logo without written consent); the day a client sends theirs, it replaces the type.
 * A name without an entry here falls back to a plain Geist wordmark, so editing clients.ts never breaks the wall.
 */
const MARKS: Record<string, ReactNode> = {
  Markone: <span className="zh2-wm zh2-wm--markone">Markone</span>,
  FeelSafe: (
    <span className="zh2-wm zh2-wm--feelsafe">
      <b>Feel</b>Safe
    </span>
  ),
  "Hightech Window Blinds": (
    <span className="zh2-wm zh2-wm--stack">
      <b>Hightech</b>
      <small>Window Blinds</small>
    </span>
  ),
  "PK Elite": (
    <span className="zh2-wm zh2-wm--pk">
      <i>PK</i> Elite
    </span>
  ),
  LookLush: <span className="zh2-wm zh2-wm--looklush">LookLush</span>,
  EcoVision: (
    <span className="zh2-wm zh2-wm--eco">
      <b>Eco</b>Vision
    </span>
  ),
  "Dumbo Studio": (
    <span className="zh2-wm zh2-wm--dumbo">
      <b>Dumbo</b> <i>studio</i>
    </span>
  ),
  Nutraboat: <span className="zh2-wm zh2-wm--nutra">Nutraboat</span>,
  "Vishal Interior": <span className="zh2-wm zh2-wm--wide">Vishal Interior</span>,
  "Rudra Carpet": (
    <span className="zh2-wm zh2-wm--rudra">
      Rudra <i>Carpet</i>
    </span>
  ),
  NailMaster: <span className="zh2-wm zh2-wm--nail">NailMaster</span>,
  "Studio Lush": <span className="zh2-wm zh2-wm--mono">Studio Lush</span>,
  "Interior Bazzar": (
    <span className="zh2-wm zh2-wm--ib">
      <small>Interior</small>
      <b>Bazzar</b>
    </span>
  ),
  "AR Singh": (
    <span className="zh2-wm zh2-wm--ar">
      <b>AR</b>
      <small>Singh</small>
    </span>
  ),
  Aquaform: <span className="zh2-wm zh2-wm--aqua">Aquaform</span>,
  "Red R Audio": (
    <span className="zh2-wm zh2-wm--redr">
      <b>Red R</b>
      <small>Audio</small>
    </span>
  ),
};

function Row({ names }: { names: readonly string[] }): ReactElement {
  return (
    <>
      {names.map((name) => (
        <li key={name} className="zh2-wall__item">
          <span className="zs-sr">{name}</span>
          <span aria-hidden="true">{MARKS[name] ?? <span className="zh2-wm">{name}</span>}</span>
        </li>
      ))}
    </>
  );
}

/** Home's client wall (Notion style): one quiet line, then two centred rows of grey wordmarks with small dots. */
export function ClientWall(): ReactElement {
  const half = Math.ceil(ACTIVE_MEMBERS.length / 2);
  return (
    <section id="members" className="zh2-wall" aria-labelledby="zh2-wall-h">
      <div className="zs-wrap">
        <h2 id="zh2-wall-h" className="zh2-wall__lead">
          {HOME_WALL_LEAD}
        </h2>
        <ul className="zh2-wall__list" aria-label="Our clients">
          <Row names={ACTIVE_MEMBERS.slice(0, half)} />
          <li className="zh2-wall__break" aria-hidden="true" />
          <Row names={ACTIVE_MEMBERS.slice(half)} />
        </ul>
      </div>
    </section>
  );
}
