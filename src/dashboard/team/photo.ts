import type { CSSProperties } from "react";

/** Shrink any image to a 256 × 256 px square (centre crop), as a JPEG data URL, and say how big it is. */
export async function shrinkPhoto(file: File): Promise<{ src: string; kb: number }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("That file isn't a picture we can read."));
      el.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    if (!side) throw new Error("That picture is empty.");
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser can't resize pictures.");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, 256, 256);
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, 256, 256);
    const src = canvas.toDataURL("image/jpeg", 0.86);
    const kb = Math.max(1, Math.round(((src.length - src.indexOf(",") - 1) * 3) / 4 / 1024));
    return { src, kb };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Round frame for a picture (44 px on the card, 48 px in the Add form). */
export function frameStyle(size: number): CSSProperties {
  return { display: "inline-flex", flex: "none", width: size, height: size, borderRadius: "50%", overflow: "hidden" };
}
