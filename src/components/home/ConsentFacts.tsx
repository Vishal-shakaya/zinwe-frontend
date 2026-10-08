import type { ReactElement } from "react";
import { Icon } from "../ui/Icon";
import { Reveal } from "../ui/Reveal";
import { Smoke } from "../ui/Smoke";

const facts: Array<{ title: string; detail: string }> = [
  {
    title: "Employees see exactly what is monitored.",
    detail: "Every PC shows the active rules. Nothing runs hidden.",
  },
  {
    title: "You decide what is logged, and for how long.",
    detail: "Full admin visibility, with retention you control.",
  },
  {
    title: "Aligned with India's DPDP Act from day one.",
    detail: "Consent and purpose are part of the setup, not a checkbox.",
  },
];

/** Dark "Consent first" band with three facts. */
export function ConsentFacts(): ReactElement {
  return (
    <section className="sec sec--ink zin-host" id="consent">
      <Smoke tone="dark" />
      <div className="wrap">
        <Reveal className="sec-head">
          <p className="eyebrow">Consent first</p>
          <h2 className="h-section">Monitoring your team can see. Not spyware.</h2>
          <p className="lede">Privacy is built into the product, not bolted on afterwards.</p>
        </Reveal>
        <div className="facts">
          {facts.map((fact, i) => (
            <Reveal key={fact.title} className="facts__item" delay={i === 0 ? undefined : (i as 1 | 2)}>
              <div className="facts__mark">
                <Icon name="check" />
              </div>
              <p>{fact.title}</p>
              <small>{fact.detail}</small>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
