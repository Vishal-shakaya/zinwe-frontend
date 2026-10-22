import type { ReactElement } from "react";
import { ReleaseNotes } from "../../components/ReleaseNotes";
import { usePageMeta } from "../../hooks/usePageMeta";
import { PageHeader } from "../components/States";
import "../../styles/whatsnew.css";

/** /app/whats-new: the release notes inside the dashboard (account menu → What's new), FR-21. */
export default function WhatsNewDashPage(): ReactElement {
  usePageMeta({ title: "What's new — Zinwe", description: "What changed in each Zinwe release." });
  return (
    <>
      <PageHeader title="What's new" lede="What we fixed and what you can do now, release by release." />
      <section className="dash-card rn-dash">
        <ReleaseNotes />
      </section>
    </>
  );
}
