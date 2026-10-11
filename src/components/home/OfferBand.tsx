import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { Reveal } from "../ui/Reveal";

interface OfferBandProps {
  title: string;
  sub: string;
  /** Small print under the button (omitted when not given). */
  note?: string;
}

/** Orange call-to-action band with the faint "₹0" watermark. */
export function OfferBand({ title, sub, note }: OfferBandProps): ReactElement {
  return (
    <section className="sec--tight">
      <div className="wrap">
        <Reveal className="offer">
          <div>
            <h2 className="h-section">{title}</h2>
            <p className="offer__sub">{sub}</p>
          </div>
          <div className="offer__cta">
            <Link className="btn btn--ink btn--lg" to="/signup?plan=free">
              Start free <span className="arr">→</span>
            </Link>
            {note ? <small>{note}</small> : null}
          </div>
          <div className="offer__big" aria-hidden="true">
            ₹0
          </div>
        </Reveal>
      </div>
    </section>
  );
}
