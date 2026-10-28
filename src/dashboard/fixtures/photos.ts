import { sample, sampleStore } from "./index";

/**
 * SAMPLE (DashTeam avatar popover, Add a person photo): the API has no member picture yet. A person's picture —
 * one of the drawn presets, or an uploaded photo already shrunk to 256 × 256 px in the browser — is kept for the
 * tab's life, keyed by member id. No picture = their initials on the role tint (the live product today).
 *
 * When the picture API ships: `listPhotos` becomes GET members' `photo`, `savePhoto` a PATCH/upload; the types stay.
 */

export type MemberPhoto = { kind: "avatar"; key: string } | { kind: "photo"; src: string; kb: number };

const store = sampleStore<Record<string, MemberPhoto>>("photos", () => ({}));

export const PHOTOS_CHANGED_EVENT = "zinwe:photos-changed";

/** GET pictures (sample): {member id: picture}. */
export function listPhotos(signal?: AbortSignal): Promise<Record<string, MemberPhoto>> {
  return sample(store.get(), signal, 60);
}

/** Save (or clear, with null) one person's picture (sample). Returns every picture. */
export function savePhoto(memberId: number, photo: MemberPhoto | null): Record<string, MemberPhoto> {
  const next = { ...store.get() };
  if (photo) next[String(memberId)] = photo;
  else delete next[String(memberId)];
  store.set(next);
  window.dispatchEvent(new Event(PHOTOS_CHANGED_EVENT));
  return next;
}
