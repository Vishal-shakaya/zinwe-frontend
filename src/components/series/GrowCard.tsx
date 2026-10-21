import { useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { trackEvent } from "../../lib/analytics";
import { shareUrl, startFreeUrl, type Reader } from "../../lib/api/series";

/**
 * After an episode (and on the series page for members): the two things the series is for. Send it to a business
 * owner who needs it (the link carries the member's share code) and start Zinwe free.
 */
export function GrowCard({
  seriesSlug,
  seriesTitle,
  episode,
  reader,
}: {
  seriesSlug: string;
  seriesTitle: string;
  episode: number | null;
  reader: Reader | null;
}): ReactElement {
  const [copied, setCopied] = useState(false);
  const link = (source: string) => shareUrl(seriesSlug, reader?.ref_code, source);
  const text = `${seriesTitle}: short stories about the small mistakes that put company data at risk, each with a 10-minute fix. Free to join.`;
  const shared = (channel: string) => trackEvent("share", { method: channel, content_type: "series", item_id: seriesSlug });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link("copy"));
      setCopied(true);
      shared("copy");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <section className="sx-grow" aria-label="Share the series and start Zinwe free">
      <div className="sx-grow__share">
        <b>Know a business owner who'd want this?</b>
        <span>Send them {seriesTitle}. Membership is free for them too.</span>
        <div className="sx-grow__buttons">
          <a href={`https://wa.me/?text=${encodeURIComponent(`${text} ${link("whatsapp")}`)}`} target="_blank" rel="noreferrer" onClick={() => shared("whatsapp")}>
            WhatsApp
          </a>
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link("linkedin"))}`}
            target="_blank"
            rel="noreferrer"
            onClick={() => shared("linkedin")}
          >
            LinkedIn
          </a>
          <a href={`mailto:?subject=${encodeURIComponent(seriesTitle)}&body=${encodeURIComponent(`${text}\n\n${link("email")}`)}`} onClick={() => shared("email")}>
            Email
          </a>
          <button type="button" onClick={() => void copy()}>
            {copied ? "Link copied" : "Copy link"}
          </button>
        </div>
      </div>
      <div className="sx-grow__start">
        <b>See what leaves your own team's PCs</b>
        <span>Zinwe tells you in plain English when company files leave by USB, upload or email. Free forever for up to 3 PCs.</span>
        <Link className="sx-btn sx-btn--red" to={startFreeUrl(episode)} onClick={() => trackEvent("select_promotion", { promotion_name: "tlf_start_free", item_id: episode ?? 0 })}>
          Start Zinwe free
        </Link>
      </div>
    </section>
  );
}
