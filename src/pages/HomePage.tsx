import type { ReactElement } from "react";
import { ConsentFacts } from "../components/home/ConsentFacts";
import { Hero } from "../components/home/Hero";
import { OfferBand } from "../components/home/OfferBand";
import { Platforms } from "../components/home/Platforms";
import { SetupWizard } from "../components/home/SetupWizard";
import { WatchPanel } from "../components/home/WatchPanel";
import { Reveal } from "../components/ui/Reveal";
import { usePageMeta } from "../hooks/usePageMeta";

export default function HomePage(): ReactElement {
  usePageMeta({
    title: "Zinwe — Security, simplified",
    description:
      "Zinwe watches data transfers, remote access, software installs and email across your team's PCs, and tells you what matters in plain language. Built for businesses of 5–50 people without an IT department.",
    ogDescription: "Know what's happening to your company's data. In plain English. No IT department needed.",
  });

  return (
    <>
      <Hero />
      <WatchPanel />

      <section className="sec" id="how">
        <div className="wrap split split--rev">
          <SetupWizard />
          <Reveal>
            <p className="eyebrow">Setup</p>
            <h2 className="h-section">Answer questions. Zinwe writes the rules.</h2>
            <p className="lede">
              No policies to configure, no logs to decode. Pick an answer and the matching rule is applied to every
              PC.
            </p>
          </Reveal>
        </div>
      </section>

      <ConsentFacts />
      <Platforms />
      <OfferBand
        title="Start with Zinwe, free forever."
        sub="Protect up to 3 PCs at no cost, for as long as you like. Set up in minutes, and tell us what to build next."
        note="No card needed. Upgrade only when you grow."
      />
    </>
  );
}
