import type { ReactElement } from "react";
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
          <p className="eyebrow fade">What's new</p>
          <StaggerTitle text="What's new in Zinwe." />
          <p className="lede fade" style={{ animationDelay: ".4s" }}>
            What we fixed and what you can do now, release by release.
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
