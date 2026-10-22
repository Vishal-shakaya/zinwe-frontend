import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { useResource } from "../../dashboard/useResource";
import { getGuides } from "../../lib/api/guides";
import { GuideCard } from "../guides/GuideCard";
import "../../styles/guides.css";

/** Home page: the free guides (nothing shows until one is live). */
export function GuidesBand(): ReactElement | null {
  const guides = useResource(getGuides).data?.results ?? [];
  if (!guides.length) return null;
  return (
    <section className="sec sec--guides" aria-labelledby="home-guides-title">
      <div className="wrap">
        <p className="eyebrow" id="home-guides-title">
          Free guides
        </p>
        <h2 className="h-section">Practical guides you can finish this month</h2>
        <p className="lede">
          Plain-English e-guides with workbooks and 30-day plans, for owners without an IT team.{" "}
          <Link to="/blog/guides">See every guide</Link>
        </p>
        <div className="gd-grid">
          {guides.slice(0, 4).map((g) => (
            <GuideCard key={g.slug} guide={g} from="home" />
          ))}
        </div>
      </div>
    </section>
  );
}
