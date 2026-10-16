import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { cx } from "../../lib/cx";
import { Icon, type IconName } from "../ui/Icon";
import { Reveal } from "../ui/Reveal";

const platforms: Array<{ name: string; icon: IconName; status: string; live: boolean }> = [
  { name: "Windows", icon: "windows", status: "Available now", live: true },
  { name: "Linux", icon: "linux", status: "Coming soon", live: false },
  { name: "macOS", icon: "macos", status: "Coming soon", live: false },
];

/** Platforms + pricing split section. */
export function Platforms(): ReactElement {
  return (
    <section className="sec">
      <div className="wrap split">
        <Reveal>
          <p className="eyebrow">Platforms</p>
          <h2 className="h-section">Windows today. Linux and macOS next.</h2>
          <p className="lede">One small agent on each PC, one dashboard for you. Works for teams in India and the US.</p>
          <div className="plat">
            {platforms.map((p) => (
              <span key={p.name} className={cx("plat__item", p.live && "plat__item--live")}>
                <Icon name={p.icon} />
                {p.name} <small>{p.status}</small>
              </span>
            ))}
          </div>
        </Reveal>
        <Reveal delay={1}>
          <p className="eyebrow">Pricing</p>
          <h2 className="h-section">Free to start. Priced for small teams, not enterprises.</h2>
          <p className="lede">
            Free forever for up to 3 PCs. Then simple monthly plans priced by the number of PCs, not per person. No
            card needed to start.
          </p>
          <Link className="link-arrow" to="/plans">
            See plans and prices <span className="arr">→</span>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
