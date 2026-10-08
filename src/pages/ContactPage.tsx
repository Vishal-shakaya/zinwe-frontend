import type { ReactElement } from "react";
import { ContactForm } from "../components/forms/ContactForm";
import { OfferBand } from "../components/home/OfferBand";
import { Smoke } from "../components/ui/Smoke";
import { StaggerTitle } from "../components/ui/StaggerTitle";
import { usePageMeta } from "../hooks/usePageMeta";

export default function ContactPage(): ReactElement {
  usePageMeta({
    title: "Contact — Zinwe",
    description: "Talk to the Zinwe team about data protection and activity monitoring for your business.",
  });

  return (
    <>
      <section className="page-hero zin-host">
        <Smoke />
        <div className="wrap split" style={{ alignItems: "start" }}>
          <div>
            <p className="eyebrow fade">Contact</p>
            <StaggerTitle text="Talk to a person, not a ticket." />
            <p className="lede fade" style={{ animationDelay: ".4s" }}>
              Questions about setup, pricing, or whether Zinwe fits your business. You'll hear back from the founder
              within a working day.
            </p>
            <ul className="contact-list fade" style={{ animationDelay: ".55s" }}>
              <li>
                <small>Email</small>
                <a href="mailto:hello@zinwe.io">hello@zinwe.io</a>
              </li>
              <li>
                <small>Office</small>
                <span>SKYTECHNO · New Delhi, India</span>
              </li>
              <li>
                <small>Hours</small>
                <span>Mon–Sat, 10:00–19:00 IST</span>
              </li>
            </ul>
          </div>

          <ContactForm />
        </div>
      </section>

      <OfferBand title="Rather just try it?" sub="Early-access teams get the full plan free for 3 months." />
    </>
  );
}
