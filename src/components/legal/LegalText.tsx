import type { ReactElement } from "react";
import type { LegalDoc } from "../../content/legal";
import "./legal.css";

/** One policy's sections as readable text (website pages and the agree dialogs). */
export function LegalText({ doc, headingLevel = 2 }: { doc: LegalDoc; headingLevel?: 2 | 3 }): ReactElement {
  const H = headingLevel === 2 ? "h2" : "h3";
  return (
    <div className="legal-text">
      {doc.sections.map((section) => (
        <section key={section.heading} className="legal-text__section">
          <H className="legal-text__h">{section.heading}</H>
          {section.blocks.map((block, i) =>
            typeof block === "string" ? (
              <p key={i}>{block}</p>
            ) : (
              <ul key={i}>
                {block.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ),
          )}
        </section>
      ))}
    </div>
  );
}

export default LegalText;
