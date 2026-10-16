import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { EarlyAccessForm } from "../components/forms/EarlyAccessForm";
import { Icon } from "../components/ui/Icon";
import { Smoke } from "../components/ui/Smoke";
import { StaggerTitle } from "../components/ui/StaggerTitle";
import { seoFor } from "../content/seo";
import { usePageMeta } from "../hooks/usePageMeta";

const perks: Array<{ title: string; detail: string }> = [
  { title: "Free forever for up to 3 PCs", detail: "Start protecting your team at no cost, no card required." },
  { title: "Setup done with you", detail: "A 20-minute call with the founder to get your rules right." },
  { title: "A say in what ships next", detail: "Early teams decide which alerts and controls we build first." },
];

export default function EarlyAccessPage(): ReactElement {
  usePageMeta(seoFor("/early-access"));

  return (
    <>
      <section className="page-hero zin-host">
        <Smoke />
        <div className="wrap split" style={{ alignItems: "start" }}>
          <div>
            <div className="hero__pill fade">
              <b>EARLY ACCESS</b> Free forever · Setup done with you
            </div>
            <StaggerTitle text="Be first. Start free, stay free." />
            <p className="lede fade" style={{ animationDelay: ".4s" }}>
              Reserve a spot before launch and we'll set you up personally the week we go live.
            </p>
            <ul className="perks fade" style={{ animationDelay: ".55s" }}>
              {perks.map((perk) => (
                <li key={perk.title}>
                  <span className="perks__mark">
                    <Icon name="check" />
                  </span>
                  <div>
                    <b>{perk.title}</b>
                    <span>{perk.detail}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <EarlyAccessForm />
        </div>
      </section>

      <section className="sec--tight">
        <div className="wrap">
          <p className="hero__note" style={{ textAlign: "center" }}>
            Questions first?{" "}
            <Link to="/contact" style={{ color: "var(--orange-text)", fontWeight: 600 }}>
              Talk to us
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
