import type { ReactElement } from "react";
import { ConsentFacts } from "../components/home/ConsentFacts";
import { Faq } from "../components/home/Faq";
import { Hero } from "../components/home/Hero";
import { OfferBand } from "../components/home/OfferBand";
import { Platforms } from "../components/home/Platforms";
import { SeriesBand } from "../components/home/SeriesBand";
import { SetupWizard } from "../components/home/SetupWizard";
import { WatchPanel } from "../components/home/WatchPanel";
import { JsonLd } from "../components/ui/JsonLd";
import { Reveal } from "../components/ui/Reveal";
import { BRAND_LINE, SOFTWARE_LD, seoFor } from "../content/seo";
import { usePageMeta } from "../hooks/usePageMeta";

export default function HomePage(): ReactElement {
  usePageMeta(seoFor("/"));

  return (
    <>
      <Hero />
      <WatchPanel />

      <section className="sec" id="how">
        <div className="wrap split split--rev split--copy-first">
          <SetupWizard />
          <Reveal>
            <p className="eyebrow">Setup</p>
            <h2 className="h-section">Answer three questions. Zinwe sets the rules.</h2>
            <p className="lede">
              No policies to write and no logs to read. Pick an answer and the rule reaches every PC within about a
              minute. Change your mind any time.
            </p>
          </Reveal>
        </div>
      </section>

      <SeriesBand />
      <ConsentFacts />
      <Platforms />
      <Faq />
      <OfferBand
        title={`${BRAND_LINE} Start free today.`}
        sub="Protect up to 3 PCs at no cost, for as long as you like. Set up in an afternoon and upgrade only when you grow."
        note="No card needed."
      />
      <JsonLd data={SOFTWARE_LD} />
    </>
  );
}
