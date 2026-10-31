import type { ReactElement } from "react";
import type { ResourceArtKey } from "../../content/site/shell";

const INK = "#141414";
const ORANGE = "#F26A0A";

function Frame({ children }: { children: ReactElement | ReactElement[] }): ReactElement {
  return (
    <svg className="zpl2-res__art" viewBox="0 0 200 104" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

/** Small drawings for the Resources menu: black outlines on white with one orange mark (owner rule, 31 Oct). */
export function ResourceArt({ k }: { k: ResourceArtKey }): ReactElement {
  switch (k) {
    case "blog":
      return (
        <Frame>
          <rect x="52" y="14" width="106" height="82" rx="8" fill={INK} />
          <rect x="46" y="8" width="106" height="82" rx="8" fill="#fff" />
          <path d="M46 26h106" />
          <circle cx="58" cy="17" r="1.6" fill={INK} />
          <circle cx="66" cy="17" r="1.6" fill={INK} />
          <rect x="58" y="36" width="36" height="28" rx="4" fill={ORANGE} />
          <path d="M104 39h36M104 50h36M104 61h24M58 75h82" />
        </Frame>
      );
    case "newsletter":
      return (
        <Frame>
          <rect x="52" y="30" width="106" height="66" rx="8" fill={INK} />
          <path d="M72 44V12a4 4 0 0 1 4-4h40l16 16v20z" fill="#fff" />
          <path d="M116 8v16h16" />
          <path d="M84 30h26M84 40h36" stroke={ORANGE} />
          <rect x="46" y="24" width="106" height="66" rx="8" fill="#fff" />
          <path d="m48 29 51 36 51-36" />
          <circle cx="146" cy="30" r="10" fill={ORANGE} />
        </Frame>
      );
    case "guides":
      return (
        <Frame>
          <path d="M58 16h46l6 6 6-6h46v80h-46l-6 6-6-6H58z" fill={INK} transform="translate(-10 -2)" />
          <path d="M42 8h46a12 12 0 0 1 12 12v72a12 12 0 0 0-12-8H42zM158 8h-46a12 12 0 0 0-12 12v72a12 12 0 0 1 12-8h46z" fill="#fff" />
          <path d="M54 26h30M54 38h30M54 50h22M116 26h30M116 38h22" />
          <circle cx="136" cy="62" r="13" fill={ORANGE} />
          <path d="m130 62 4.5 4.5 8-8.5" stroke="#fff" />
        </Frame>
      );
  }
}
