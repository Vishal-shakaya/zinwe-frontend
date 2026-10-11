import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { useHeroCtaRef } from "../layout/heroCtaContext";
import { Smoke } from "../ui/Smoke";
import { StaggerTitle } from "../ui/StaggerTitle";
import { Translator } from "./Translator";

export function Hero(): ReactElement {
  const ctaRef = useHeroCtaRef();

  return (
    <section className="hero zin-host">
      <Smoke />
      <div className="wrap">
        <div className="hero__pill fade">
          <b>EARLY ACCESS</b> For teams of 5–50 · Windows
        </div>
        <StaggerTitle text="Know what's happening to your data. In plain English." />
        <p className="lede fade" style={{ animationDelay: ".5s" }}>
          Zinwe watches USB copies, remote access, software installs and email across your team's PCs, then tells
          you what matters in words anyone can read. No IT department needed.
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
          Free forever for up to 3 PCs. No card needed.
        </p>

        {/* Signature: raw log → plain-language alert */}
        <Translator />
      </div>
    </section>
  );
}
