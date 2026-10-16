import type { ReactElement } from "react";
import { FAQ_LD, HOME_FAQ } from "../../content/seo";
import { JsonLd } from "../ui/JsonLd";
import { Reveal } from "../ui/Reveal";

/**
 * Home-page FAQ: the questions owners ask before they install anything. Native <details>, so it works
 * without JavaScript and with the keyboard; the same Q&As go out as FAQPage structured data.
 */
export function Faq(): ReactElement {
  return (
    <section className="sec sec--paper" id="faq" aria-labelledby="faq-title">
      <div className="wrap faq">
        <Reveal className="sec-head">
          <p className="eyebrow">Questions</p>
          <h2 className="h-section" id="faq-title">
            Questions owners ask
          </h2>
          <p className="lede">Straight answers about what Zinwe does, what it never does, and what it costs.</p>
        </Reveal>
        <Reveal className="faq__list" delay={1}>
          {HOME_FAQ.map(({ q, a }, i) => (
            <details key={q} className="faq__item" open={i === 0}>
              <summary className="faq__q">
                <span>{q}</span>
                <span className="faq__mark" aria-hidden="true" />
              </summary>
              <p className="faq__a">{a}</p>
            </details>
          ))}
        </Reveal>
      </div>
      <JsonLd data={FAQ_LD} />
    </section>
  );
}
