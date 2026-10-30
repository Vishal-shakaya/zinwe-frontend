import type { ReactElement } from "react";
import { AVATAR_VIEWBOX, avatarArt } from "../../../dashboard/team/avatars";

/**
 * One drawn person from the team avatar library (src/dashboard/team/avatars.json, FR-44): the same art the
 * dashboard and the Windows app use, so the site and the product feel like one thing. Decorative unless `label`.
 */
export function Face({ k, size = 40, label, className }: { k: string; size?: number; label?: string; className?: string }): ReactElement | null {
  const art = avatarArt(k);
  if (!art) return null;
  const a11y = label ? { role: "img" as const, "aria-label": label } : { "aria-hidden": true as const };
  return (
    <svg className={className ? `zh2-face ${className}` : "zh2-face"} width={size} height={size} viewBox={AVATAR_VIEWBOX} focusable="false" {...a11y}>
      <rect width="48" height="48" fill={art.bg} />
      {art.paths.map(([d, fill], i) => (
        <path key={i} d={d} fill={fill} />
      ))}
    </svg>
  );
}
