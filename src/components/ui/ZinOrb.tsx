import type { ReactElement } from "react";

// One wave through the middle of a 96x60 box; the orb sits on its centre.
const STREAM = "M0 30 C 14 16, 28 44, 48 30 S 82 16, 96 30";

/**
 * The Zin: an ember orb that takes in the raw log as grey smoke and
 * breathes it out as orange. Sits between the two translator panels.
 */
export function ZinOrb(): ReactElement {
  return (
    <div className="zin-conduit" aria-hidden="true">
      <svg className="zin-conduit__stream" viewBox="0 0 96 60" preserveAspectRatio="none">
        <defs>
          <linearGradient id="zin-stream-grad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#8c8c86" />
            <stop offset="0.5" stopColor="#c8693f" />
            <stop offset="1" stopColor="#ff5c1a" />
          </linearGradient>
          <filter id="zin-stream-blur" x="-20%" y="-60%" width="140%" height="220%">
            <feGaussianBlur stdDeviation="2.4" />
          </filter>
        </defs>
        <path className="zin-conduit__haze" d={STREAM} filter="url(#zin-stream-blur)" />
        <path className="zin-conduit__flow" d={STREAM} />
      </svg>
      <span className="zin-conduit__puff" />
      <span className="zin-conduit__puff" />
      <span className="zin-conduit__puff" />
      <span className="zin-orb">
        <picture>
          <source type="image/webp" srcSet="/brand/zinwe-mark-64.webp 1x, /brand/zinwe-mark-128.webp 2x" />
          <img className="zin-orb__z" src="/brand/zinwe-mark-64.png" width={20} height={20} alt="" />
        </picture>
      </span>
    </div>
  );
}
