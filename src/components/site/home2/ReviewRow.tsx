import type { ReactElement } from "react";
import { REVIEWS, REVIEWS_HEAD, REVIEW_KINDS, type Review } from "../../../content/site/home";

/** Local preview of the layout only: never built for the live site, never real words (rule 7). */
const PREVIEW: readonly Review[] = import.meta.env.DEV
  ? [
      { kind: "owner", quote: "Layout preview. A real owner's words go here.", name: "Owner's name", role: "Owner", business: "Business name" },
      { kind: "owner", quote: "Layout preview. A second owner's words go here, a little longer, to show how the row holds two lengths.", name: "Owner's name", role: "Owner", business: "Business name" },
      { kind: "member", quote: "Layout preview. A team member's words go here.", name: "Member's name", role: "Their role", business: "Business name" },
    ]
  : [];

/** Home's review row: real words from owners and team members, shown only with written permission. Empty = no section. */
export function ReviewRow(): ReactElement | null {
  const preview = REVIEWS.length === 0 && PREVIEW.length > 0;
  const reviews = preview ? PREVIEW : REVIEWS;
  if (reviews.length === 0) return null;
  return (
    <section className="zh2-sec zh2-reviews" aria-labelledby="zh2-reviews-h">
      <div className="zs-wrap zh2-measure">
        <div className="zh2-head">
          <span className="zh2-kick">{REVIEWS_HEAD.eyebrow}</span>
          <h2 id="zh2-reviews-h" className="zh2-h">
            {REVIEWS_HEAD.title}
          </h2>
        </div>
        <ul className="zh2-reviews__row">
          {reviews.map((r, i) => (
            <li key={i}>
              <figure className="zh2-review">
                <span className="zh2-review__kind">{REVIEW_KINDS[r.kind]}</span>
                <blockquote>“{r.quote}”</blockquote>
                <figcaption>
                  <b>{r.name}</b>
                  <span>
                    {r.role}, {r.business}
                  </span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
