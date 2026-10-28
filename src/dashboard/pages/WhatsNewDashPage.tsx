import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { usePageMeta } from "../../hooks/usePageMeta";
import { WhatsNewList } from "../help/WhatsNewList";
import { PageHead } from "../shell/PageHead";
import "../../styles/dash13/settings.css";
import "../../styles/dash13/help.css";

/** /app/whats-new: the release notes inside the dashboard (FR-21). The same list as Help → What's new. */
export default function WhatsNewDashPage(): ReactElement {
  usePageMeta({ title: "What's new — Zinwe", description: "What changed in each Zinwe release." });
  return (
    <div className="zp-help">
      <PageHead
        label={<Link to="/app/help#tab=whats-new">Help &amp; support</Link>}
        title="What’s new"
        lede="What we fixed and what you can do now, release by release."
      />
      <div className="zp-col">
        <WhatsNewList />
      </div>
    </div>
  );
}
