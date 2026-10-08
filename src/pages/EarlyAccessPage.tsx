import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { EarlyAccessForm } from "../components/forms/EarlyAccessForm";
import { Icon } from "../components/ui/Icon";
import { Smoke } from "../components/ui/Smoke";
import { StaggerTitle } from "../components/ui/StaggerTitle";
import { usePageMeta } from "../hooks/usePageMeta";

const perks: Array<{ title: string; detail: string }> = [
  { title: "Full plan, free for 3 months", detail: "Every feature, every PC, no card required." },
  { title: "Setup done with you", detail: "A 20-minute call with the founder to get your rules right." },
  { title: "A say in what ships next", detail: "Early teams decide which alerts and controls we build first." },
];

export default function EarlyAccessPage(): ReactElement {
  usePageMeta({
    title: "Early access — Zinwe",
    description: "Reserve early access to Zinwe and get the full plan free for 3 months.",
  });

  return (
    <>
      <section className="page-hero zin-host">
        <Smoke />
        <div className="wrap split" style={{ alignItems: "start" }}>
          <div>
            <div className="hero__pill fade">
              <b>EARLY ACCESS</b> Full plan · 3 months free
            </div>
            <StaggerTitle text="Be first. Pay nothing for 3 months." />
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
            <Link to="/contact" style={{ color: "var(--orange-deep)", fontWeight: 600 }}>
              Talk to us
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
