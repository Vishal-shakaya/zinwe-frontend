import type { ReactElement } from "react";

/**
 * The Zinwe mark on its own: the orange Z of the official logo (public/brand/zinwe-mark-*.png/webp, square,
 * transparent). For tight spots where the wordmark (<Brand>) does not fit, e.g. the phone top bar and the
 * loading screen. Never redraw the Z as a coloured tile with a letter in it.
 */
export function BrandMark({ size = 28, className, alt = "Zinwe" }: { size?: number; className?: string; alt?: string }): ReactElement {
  // Pick files at least as large as 1x / 2x of the shown size so the mark stays crisp.
  const one = size <= 32 ? 32 : size <= 64 ? 64 : 128;
  const two = size <= 32 ? 64 : size <= 64 ? 128 : 256;
  const webp = (n: number) => (n === 32 ? 64 : n); // no 32 px WebP: the 64 px one scales down cleanly
  return (
    <picture className={className} style={{ display: "inline-flex", flex: "none", lineHeight: 0 }}>
      <source type="image/webp" srcSet={`/brand/zinwe-mark-${webp(one)}.webp 1x, /brand/zinwe-mark-${webp(two)}.webp 2x`} />
      <img
        src={`/brand/zinwe-mark-${two}.png`}
        srcSet={`/brand/zinwe-mark-${one}.png 1x, /brand/zinwe-mark-${two}.png 2x`}
        width={size}
        height={size}
        alt={alt}
        decoding="async"
        style={{ display: "block", width: size, height: size }}
      />
    </picture>
  );
}
