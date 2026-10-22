import { useState, type ReactElement } from "react";
import { trackEvent } from "../../lib/analytics";

/**
 * SAFE BY DESIGN: send this episode's Family Card to your child. The card lives on a public, script-free page
 * (/family/NN: no sign-up, cookies or tracking), so what the parent forwards carries no reader key or share code.
 */
export function FamilyShare({ episode }: { episode: number }): ReactElement {
  const [copied, setCopied] = useState(false);
  const n = String(episode).padStart(2, "0");
  const page = `${window.location.origin}/family/${n}`;
  const text = `A little card for you from me. Let's look at it together: ${page}`;
  const shared = (method: string) => trackEvent("share", { method, content_type: "family_card", item_id: `sbd-${n}` });
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const share = async () => {
    try {
      await navigator.share({ title: `Family Card ${n}`, text: "A little card for you from me. Let's look at it together.", url: page });
      shared("native");
    } catch {
      /* closed or not allowed */
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(page);
      setCopied(true);
      shared("copy");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <section className="sx-family" aria-labelledby="family-title">
      <a className="sx-family__card" href={`/family/${n}`} target="_blank" rel="noreferrer" onClick={() => shared("open")}>
        <img src={`/family/cards/thumb-${n}.jpg`} width={360} height={450} alt={`Family Card ${n}`} loading="lazy" />
      </a>
      <div className="sx-family__text">
        <p className="sx-family__eyebrow">For your child · Family Card {n}</p>
        <h2 id="family-title">Send this week's card to your child</h2>
        <p>
          A kind card with one rule, three small things to do, a question to talk about and a badge to collect. Its page has
          no sign-up, no cookies and no tracking.
        </p>
        <div className="sx-family__buttons">
          {canShare ? (
            <button type="button" className="is-main" onClick={() => void share()}>
              Share the card
            </button>
          ) : null}
          <a className={canShare ? undefined : "is-main"} href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" onClick={() => shared("whatsapp")}>
            WhatsApp
          </a>
          <a href={`mailto:?subject=${encodeURIComponent("A little card for you")}&body=${encodeURIComponent(text)}`} onClick={() => shared("email")}>
            Email
          </a>
          <button type="button" onClick={() => void copy()}>
            {copied ? "Link copied" : "Copy link"}
          </button>
          <a href={`/family/cards/${n}.pdf`} target="_blank" rel="noreferrer" onClick={() => shared("print")}>
            Print
          </a>
        </div>
      </div>
    </section>
  );
}
