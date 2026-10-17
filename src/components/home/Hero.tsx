import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { BRAND_LINE, seoFor } from "../../content/seo";
import { useHeroCtaRef } from "../layout/heroCtaContext";
import { Smoke } from "../ui/Smoke";
import { StaggerTitle } from "../ui/StaggerTitle";
import { Translator } from "./Translator";

const HOME = seoFor("/");

export function Hero(): ReactElement {
  const ctaRef = useHeroCtaRef();

  return (
    <section className="hero zin-host">
      <Smoke />
      <div className="wrap">
        <div className="hero__pill fade">
          <b>{BRAND_LINE}</b> Security, simplified for teams of 5–50
        </div>
        <StaggerTitle text={HOME.h1} />
        <p className="lede fade" style={{ animationDelay: ".5s" }}>
          Zinwe is data protection for small businesses without an IT team. It flags USB copies, files leaving the
          office, remote-access tools and new software on your team's PCs, and tells you what each one means.
        </p>
        <div className="hero__cta fade" style={{ animationDelay: ".65s" }} ref={ctaRef}>
          <Link className="btn btn--primary btn--lg" to="/signup?plan=free">
            Start free <span className="arr">→</span>
          </Link>
          <Link className="btn btn--ghost btn--lg" to="/#how">
            See how it works
          </Link>
        </div>
        <p className="hero__note fade" style={{ animationDelay: ".8s" }}>
          Free forever for up to 3 PCs · No card needed · Windows · India &amp; US
        </p>

        {/* Signature: raw event → plain-language alert */}
        <Translator />
      </div>
    </section>
  );
}
