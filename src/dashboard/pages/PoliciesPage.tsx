import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { SocialLinks } from "../../components/ui/SocialLinks";
import { COLLECTED, COMMITMENTS, NEVER } from "../../content/help";
import { usePageMeta } from "../../hooks/usePageMeta";
import { MetricsDisclosure } from "../components/MetricsDisclosure";
import { PoliciesCard } from "../help/PoliciesCard";
import { PageHead } from "../shell/PageHead";
import { ZIcon } from "../ui/ZIcon";
import "../../styles/dash13/settings.css";
import "../../styles/dash13/help.css";

/**
 * Policies (/app/policies; also Help → Policies): what Zinwe records and never does, the documents the owner agreed
 * to, and our promises. Kept as its own page for links in emails and the Terms dialog.
 */
export default function PoliciesPage(): ReactElement {
  usePageMeta({ title: "Policies — Zinwe", description: "What Zinwe records, what it never does, and who sees it." });

  return (
    <div className="zp-help">
      <PageHead
        label={<Link to="/app/help#tab=policies">Help &amp; support</Link>}
        title="Policies"
        lede="What Zinwe records, what it never does, and the documents you agreed to."
      />
      <div className="zp-col">
        <MetricsDisclosure
          title="What Zinwe records"
          sub="Across every feature, in one place. It's visible only to your company's Zinwe account."
          collected={[...COLLECTED]}
          never={[...NEVER]}
        />
        <PoliciesCard more={false} />
        <section className="z-card zp-card" aria-labelledby="prom-h" style={{ gap: 12 }}>
          <h2 id="prom-h" style={{ fontSize: 18 }}>
            Our promises
          </h2>
          <ul className="zh-rec" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {COMMITMENTS.map((point) => (
              <li key={point.title} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ color: "#17663F", paddingTop: 2 }} aria-hidden="true">
                  <ZIcon name="check" size={16} stroke={2.4} />
                </span>
                <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <b>{point.title}</b>
                  <span>{point.body}</span>
                </span>
              </li>
            ))}
          </ul>
          <span className="zp-body" style={{ fontSize: 13 }}>
            Questions about privacy or your data? Email <a href="mailto:hello@zinwe.io">hello@zinwe.io</a>.
          </span>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <span className="zp-k">Follow Zinwe for product news</span>
            <SocialLinks />
          </div>
        </section>
      </div>
    </div>
  );
}
