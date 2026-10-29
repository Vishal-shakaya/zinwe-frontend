import type { CSSProperties, ReactElement } from "react";
import { cx } from "../../lib/cx";

/**
 * The official square Zinwe mark (public/brand/zinwe-mark-*: the founder's orange Z), for small tiles where the
 * wordmark (<Brand>) does not fit: app icons in the sample screens, the article byline, the close band.
 * `tile` sets it on a white rounded square like an app icon; without it the bare mark is drawn at `size`.
 * Pass `label` when the mark stands alone (alt "Zinwe"); leave it out when the word Zinwe is already beside it.
 * Never draw a "Z" with text instead.
 */
export function SiteMark({
  size,
  tile = false,
  label = false,
  className,
}: {
  size: number;
  tile?: boolean;
  label?: boolean;
  className?: string;
}): ReactElement {
  const img = tile ? Math.round(size * 0.6) : size;
  const set = (ext: string) =>
    img <= 32 ? `/brand/zinwe-mark-64.${ext} 1x, /brand/zinwe-mark-128.${ext} 2x` : `/brand/zinwe-mark-128.${ext} 1x, /brand/zinwe-mark-256.${ext} 2x`;
  const picture = (
    <picture>
      <source type="image/webp" srcSet={set("webp")} />
      <img
        className="zs-mark__img"
        src={img <= 32 ? "/brand/zinwe-mark-64.png" : "/brand/zinwe-mark-128.png"}
        srcSet={set("png")}
        width={img}
        height={img}
        alt={label ? "Zinwe" : ""}
        decoding="async"
      />
    </picture>
  );
  return (
    <span
      className={cx("zs-mark", tile && "zs-mark--tile", className)}
      style={{ "--mark": `${size}px`, "--mark-img": `${img}px` } as CSSProperties}
      aria-hidden={label ? undefined : true}
    >
      {picture}
    </span>
  );
}
