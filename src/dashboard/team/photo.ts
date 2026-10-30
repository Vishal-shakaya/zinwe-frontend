import type { CSSProperties } from "react";

/**
 * FR-44: shrink a photo in the browser before it is uploaded. The server re-encodes it anyway (256 px JPEG q82,
 * no metadata), so this is about speed: a 12 MP phone photo becomes ~15–35 KB before it leaves the PC.
 */

/** Largest source file we try to read. */
export const PHOTO_SOURCE_MAX = 10 * 1024 * 1024;
/** Stored size (px, square). */
export const PHOTO_SIDE = 256;
/** Above this, try again at a lower quality (the server takes up to 150 KB). */
export const PHOTO_TARGET_BYTES = 60 * 1024;
const QUALITY = 0.82;
const QUALITY_RETRY = 0.7;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
/** For the file picker. */
export const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";

export class PhotoError extends Error {}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new PhotoError("This browser couldn't shrink that photo."))), "image/jpeg", quality),
  );
}

function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new PhotoError("That file isn't a picture we can read. Pick a JPG, PNG or WebP photo."));
    el.src = url;
  }).finally(() => URL.revokeObjectURL(url));
}

/** Shrink any photo to a 256 × 256 px JPEG (centre square), ready to upload. Throws PhotoError with plain words. */
export async function shrinkPhoto(file: File): Promise<{ blob: Blob; kb: number }> {
  if (file.type && !ACCEPTED.includes(file.type)) {
    throw new PhotoError("Pick a JPG, PNG or WebP photo.");
  }
  if (file.size > PHOTO_SOURCE_MAX) {
    throw new PhotoError("That photo is over 10 MB. Pick a smaller one.");
  }
  const img = await loadImage(file);
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  if (!side) throw new PhotoError("That picture is empty.");
  const canvas = document.createElement("canvas");
  canvas.width = PHOTO_SIDE;
  canvas.height = PHOTO_SIDE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new PhotoError("This browser can't resize pictures.");
  ctx.fillStyle = "#fff"; // a transparent PNG goes on white, like the server does
  ctx.fillRect(0, 0, PHOTO_SIDE, PHOTO_SIDE);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, PHOTO_SIDE, PHOTO_SIDE);
  let blob = await toBlob(canvas, QUALITY);
  if (blob.size > PHOTO_TARGET_BYTES) blob = await toBlob(canvas, QUALITY_RETRY);
  return { blob, kb: Math.max(1, Math.round(blob.size / 1024)) };
}

/** Round frame for a picture. */
export function frameStyle(size: number): CSSProperties {
  return { display: "inline-flex", flex: "none", width: size, height: size, borderRadius: "50%", overflow: "hidden" };
}
