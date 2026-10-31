import type { ReactElement } from "react";
import { FACE_PHOTOS } from "../../../content/site/home";
import { AVATAR_VIEWBOX, avatarArt } from "../../../dashboard/team/avatars";

/**
 * One sample person on the website: a stock portrait when there is one (FACE_PHOTOS), otherwise the drawn avatar
 * from the team library (src/dashboard/team/avatars.json, FR-44). Decorative unless `label`.
 */
export function Face({ k, size = 40, label, className }: { k: string; size?: number; label?: string; className?: string }): ReactElement | null {
  const photo = FACE_PHOTOS[k];
  if (photo) {
    return <img className={className ? `zh2-face ${className}` : "zh2-face"} src={`/people/${photo}.jpg`} width={size} height={size} alt={label ?? ""} loading="lazy" decoding="async" />;
  }
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
