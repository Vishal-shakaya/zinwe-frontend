import type { ReactElement } from "react";
import { ContactForm } from "../components/forms/ContactForm";
import { OfferBand } from "../components/home/OfferBand";
import { SocialLinks } from "../components/ui/SocialLinks";
import { COMPANY_EMAIL } from "../content/company";
import { Smoke } from "../components/ui/Smoke";
import { StaggerTitle } from "../components/ui/StaggerTitle";
import { seoFor } from "../content/seo";
import { usePageMeta } from "../hooks/usePageMeta";

export default function ContactPage(): ReactElement {
  usePageMeta(seoFor("/contact"));

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
                <a href={`mailto:${COMPANY_EMAIL}`}>{COMPANY_EMAIL}</a>
              </li>
              <li>
                <small>Office</small>
                <span>SKYTECHNO · New Delhi, India</span>
              </li>
              <li>
                <small>Hours</small>
                <span>Mon–Sat, 10:00–19:00 IST</span>
              </li>
              <li>
                <small>Follow us</small>
                <SocialLinks />
              </li>
            </ul>
          </div>

          <ContactForm />
        </div>
      </section>

      <OfferBand title="Rather just try it?" sub="Zinwe is free forever for up to 3 PCs." />
    </>
  );
}
