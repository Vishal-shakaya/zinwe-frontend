import type { ReactElement } from "react";
import type { MemberPhoto } from "../fixtures/photos";
import { AVATARS, isAvatarKey } from "./avatars";

/** A person's picture: an uploaded photo, a drawn preset, or nothing (the caller shows initials). */
export function PictureArt({ photo, size, label }: { photo: MemberPhoto; size: number; label?: string }): ReactElement | null {
  const a11y = label ? { role: "img" as const, "aria-label": label } : { "aria-hidden": true as const };
  if (photo.kind === "photo") {
    return <img src={photo.src} width={size} height={size} alt={label ?? ""} style={{ display: "block", objectFit: "cover" }} />;
  }
  if (!isAvatarKey(photo.key)) return null;
  const art = AVATARS[photo.key];
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" {...a11y}>
      <rect width="40" height="40" fill={art.bg} />
      {art.p.map(([d, fill]) => (
        <path key={d} d={d} fill={fill} />
      ))}
    </svg>
  );
}
