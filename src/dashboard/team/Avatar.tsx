import { useState, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { pictureSrc, type MemberPicture, type MemberRole } from "../../lib/api";
import { AVATAR_VIEWBOX, avatarArt, roleColors } from "./avatars";
import { initialsOf, useMemberPicture } from "./pictureState";

/** A drawn library avatar or a photo, filling a `size` px square (the caller's frame makes it round). */
export function PictureArt({
  picture,
  size,
  label,
  onBroken,
}: {
  picture: MemberPicture;
  size: number;
  label?: string;
  /** The photo failed to load (removed meanwhile, offline): the caller shows initials. */
  onBroken?: () => void;
}): ReactElement | null {
  if (picture.kind === "photo") {
    return (
      <img
        src={pictureSrc(picture)}
        width={size}
        height={size}
        alt={label ?? ""}
        loading="lazy"
        decoding="async"
        draggable={false}
        onError={onBroken}
        style={{ display: "block", width: size, height: size, objectFit: "cover" }}
      />
    );
  }
  const art = avatarArt(picture.key);
  if (!art) return null;
  const a11y = label ? { role: "img" as const, "aria-label": label } : { "aria-hidden": true as const };
  return (
    <svg width={size} height={size} viewBox={AVATAR_VIEWBOX} focusable="false" style={{ display: "block" }} {...a11y}>
      <rect width="48" height="48" fill={art.bg} />
      {art.paths.map(([d, fill], i) => (
        <path key={i} d={d} fill={fill} />
      ))}
    </svg>
  );
}

export interface AvatarPerson {
  id?: number | null;
  name: string;
  role?: MemberRole | "" | null;
  picture?: MemberPicture | null;
}

/**
 * THE member avatar (FR-44): their library avatar or photo when they have one, else their initials on a tint.
 * One component for every place a member's circle shows (Team, Add a person, Overview, Chat, Tasks…).
 *
 * - `className` / `style` keep each place's own frame (its CSS size, border, tint for the initials).
 * - `initials` overrides the letters (a place that already computes them); `children` replaces them entirely.
 * - Decorative by default (the name is always next to it); pass `label` when the avatar stands alone.
 */
export function MemberAvatar({
  member,
  size,
  className,
  style,
  initials,
  label,
  children,
}: {
  member: AvatarPerson;
  size: number;
  className?: string;
  style?: CSSProperties;
  initials?: string;
  label?: string;
  children?: ReactNode;
}): ReactElement {
  const picture = useMemberPicture(member.id, member.picture);
  const [brokenUrl, setBrokenUrl] = useState("");
  const usable = picture && !(picture.kind === "photo" && picture.url === brokenUrl) ? picture : null;
  const [, tint, ink] = roleColors(member.role || undefined);
  const frame: CSSProperties = {
    flex: "none",
    width: size,
    height: size,
    borderRadius: "50%",
    overflow: "hidden",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: Math.max(10, Math.round(size * 0.36)),
    fontWeight: 700,
    lineHeight: 1,
    background: tint,
    color: ink,
    ...style,
  };
  const a11y = label ? { role: "img" as const, "aria-label": label } : { "aria-hidden": true as const };
  if (usable) {
    return (
      <span className={className} style={{ ...frame, background: "transparent" }} {...a11y}>
        <PictureArt
          picture={usable}
          size={size}
          onBroken={() => usable.kind === "photo" && setBrokenUrl(usable.url)}
        />
      </span>
    );
  }
  return (
    <span className={className} style={frame} {...a11y}>
      {children ?? initials ?? initialsOf(member.name)}
    </span>
  );
}
