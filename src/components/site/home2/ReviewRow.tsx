import { useEffect, useState, type ReactElement } from "react";
import { REVIEWS_HEAD, REVIEWS_MIN, REVIEW_KINDS } from "../../../content/site/home";
import { getTestimonials, type Testimonial } from "../../../lib/api";

/** Local preview of the layout only: never built for the live site, never real words (rule 7). */
const PREVIEW: readonly Testimonial[] = import.meta.env.DEV
  ? [
      { id: -1, kind: "owner", quote: "Layout preview. A real owner's words go here.", rating: 10, name: "Owner's name", role: "Owner", company: "Business name" },
      { id: -2, kind: "owner", quote: "Layout preview. A second owner's words go here, a little longer, to show how the row holds two lengths of text.", rating: 9, name: "Owner's name", role: "Owner", company: "Business name" },
      { id: -3, kind: "member", quote: "Layout preview. A team member's words go here.", rating: 8, name: "Member's name", role: "Their role", company: "Business name" },
    ]
  : [];

/** Home's review row: what Admin → Testimonials has published. Nothing on the page until there are enough to show. */
export function ReviewRow(): ReactElement | null {
  const [live, setLive] = useState<readonly Testimonial[]>([]);

  useEffect(() => {
    const request = new AbortController();
    getTestimonials(request.signal).then(setLive, () => undefined);
    return () => request.abort();
  }, []);

  const reviews = live.length >= REVIEWS_MIN ? live : PREVIEW;
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
          {reviews.map((r) => (
            <li key={r.id}>
              <figure className="zh2-review">
                <span className="zh2-review__top">
                  <span className="zh2-review__kind">{REVIEW_KINDS[r.kind]}</span>
                  <span className="zh2-review__rating" aria-label={`Rated ${r.rating} out of 10`}>
                    {r.rating}/10
                  </span>
                </span>
                <blockquote>“{r.quote}”</blockquote>
                <figcaption>
                  <b>{r.name}</b>
                  <span>
                    {r.role || REVIEW_KINDS[r.kind]}, {r.company}
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
