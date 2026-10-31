import type { ReactElement } from "react";
import { FACES, WHAT, type WhatKey } from "../../../content/site/home";
import { ICONS } from "../icons";
import { PathIcon, Tick } from "../SiteIcon";
import { Face } from "./Face";

const TEAM = [
  { face: FACES.priya, name: "Priya", state: "Working", on: false },
  { face: FACES.emily, name: "Emily", state: "On a break", on: true },
  { face: FACES.arjun, name: "Arjun", state: "Working", on: false },
] as const;

/** A small piece of the product on sample data (the demo company). A drawing: hidden from screen readers. */
function Scene({ k }: { k: WhatKey }): ReactElement {
  switch (k) {
    case "safe":
      return (
        <div className="zh2-job__ui">
          <span className="zh2-job__float">
            <PathIcon d={ICONS.usb} size={22} stroke={2} />
          </span>
          <div className="zh2-job__line">
            <Face k={FACES.karan} size={38} />
            <span>
              <b>Karan copied 1.8 GB</b>
              <small>To a SanDisk pen drive · 3:12 PM</small>
            </span>
          </div>
          <span className="zh2-job__btn">Ask Karan</span>
        </div>
      );
    case "day":
      return (
        <div className="zh2-job__ui">
          {TEAM.map((p) => (
            <div key={p.name} className="zh2-job__line">
              <Face k={p.face} size={34} />
              <b>{p.name}</b>
              <em className={p.on ? "is-on" : undefined}>{p.state}</em>
            </div>
          ))}
        </div>
      );
    case "talk":
      return (
        <div className="zh2-job__chat">
          <span className="zh2-job__me">Can you call Sharma Traders?</span>
          <span className="zh2-job__them">
            <Face k={FACES.priya} size={30} />
            <span>On it, calling them now.</span>
          </span>
          <small>
            <Tick size={13} stroke={2.6} /> Seen
          </small>
        </div>
      );
  }
}

/** "What Zinwe does": three tinted cards in the Notion manner, each with one short promise and a playful product moment. */
export function WhatCards(): ReactElement {
  return (
    <>
      <div className="zh2-jobs">
        {WHAT.jobs.map((j) => (
          <article key={j.key} className={`zh2-job zh2-job--${j.key}`}>
            <h3>{j.t}</h3>
            <p>{j.b}</p>
            <div className="zh2-job__scene" aria-hidden="true">
              <Scene k={j.key} />
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
