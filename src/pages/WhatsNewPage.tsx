import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { ReleaseNotes } from "../components/ReleaseNotes";
import { Smoke } from "../components/ui/Smoke";
import { StaggerTitle } from "../components/ui/StaggerTitle";
import { seoFor } from "../content/seo";
import { usePageMeta } from "../hooks/usePageMeta";
import "../styles/whatsnew.css";

/** /whats-new: what changed in each Zinwe release, in plain words (FR-21). */
export default function WhatsNewPage(): ReactElement {
  usePageMeta(seoFor("/whats-new"));
  return (
    <>
      <section className="page-hero zin-host">
        <Smoke />
        <div className="wrap">
          <p className="eyebrow fade">
            <Link to="/blog">Zinwe blog</Link> · Release notes
          </p>
          <StaggerTitle text="What's new in Zinwe." />
          <p className="lede fade" style={{ animationDelay: ".4s" }}>
            Release notes in plain words: what's new, what we fixed and what you need to do, version by version.
          </p>
        </div>
      </section>
      <section className="sec--tight">
        <div className="wrap rn-wrap">
          <ReleaseNotes />
        </div>
      </section>
    </>
  );
}
