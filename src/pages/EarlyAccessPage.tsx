import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { EarlyAccessForm } from "../components/forms/EarlyAccessForm";
import { Icon } from "../components/ui/Icon";
import { Smoke } from "../components/ui/Smoke";
import { StaggerTitle } from "../components/ui/StaggerTitle";
import { seoFor } from "../content/seo";
import { usePageMeta } from "../hooks/usePageMeta";

const PAGE = seoFor("/early-access");

const perks: Array<{ title: string; detail: string }> = [
  { title: "A 20-minute call, free", detail: "The founder sets up Zinwe with you: your rules, your first PCs, your questions." },
  { title: "Free forever for up to 3 PCs", detail: "Start today at no cost, no card needed. Upgrade only when you grow." },
  { title: "Your rules right the first time", detail: "USB, websites and work hours set the way your office actually works." },
];

/** /early-access (kept for old links): "Book a free setup call". Zinwe is live; the call helps you set it up. */
export default function EarlyAccessPage(): ReactElement {
  usePageMeta(PAGE);

  return (
    <>
      <section className="page-hero zin-host">
        <Smoke />
        <div className="wrap split" style={{ alignItems: "start" }}>
          <div>
            <div className="hero__pill fade">
              <b>SETUP CALL</b> Free · 20 minutes · With the founder
            </div>
            <StaggerTitle text={PAGE.h1} />
            <p className="lede fade" style={{ animationDelay: ".4s" }}>
              {PAGE.intro[0]}
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
            <p className="hero__note fade" style={{ animationDelay: ".7s" }}>
              Rather set it up yourself?{" "}
              <Link to="/signup?plan=free" style={{ color: "var(--orange-text)", fontWeight: 600 }}>
                Start free now
              </Link>
            </p>
          </div>

          <EarlyAccessForm />
        </div>
      </section>

      <section className="sec--tight">
        <div className="wrap">
          <p className="hero__note" style={{ textAlign: "center" }}>
            A quick question instead?{" "}
            <Link to="/contact" style={{ color: "var(--orange-text)", fontWeight: 600 }}>
              Talk to us
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
