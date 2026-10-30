/**
 * FR-44 team pictures: a member's library avatar or uploaded photo (null = their initials on the role tint).
 *
 * - PUT    /api/devices/members/<id>/picture/  JSON {kind: "avatar", key} or multipart `file` -> {picture}
 * - DELETE /api/devices/members/<id>/picture/  -> 204
 *
 * Every member payload carries `picture`; this module also keeps the latest picture per member id in memory,
 * so a change on the Team card shows at once in the chat, Tasks and Overview without a refetch.
 */
import { API_BASE, ApiError, authedRequest } from "./http";

export type MemberPicture =
  | { kind: "avatar"; key: string }
  | { kind: "photo"; url: string; updated_at: string | null };

const PICTURE_COPY: Record<string, string> = {
  unknown_avatar: "That picture isn't in the library any more. Pick another one.",
  too_large: "That photo is still too big after shrinking. Try a different photo.",
  not_an_image: "That file isn't a picture we can use. Pick a JPG, PNG or WebP photo.",
  too_big_dimensions: "That photo is too large. Use one under 4096 px on each side.",
};

/** Plain words for anything a picture call throws. */
export function pictureErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const code = error.fieldErrors.code?.[0];
    if (code && PICTURE_COPY[code]) return PICTURE_COPY[code];
    if (error.kind === "rate_limited") return "That's a lot of picture changes. Try again in a while.";
    return error.fieldErrors.detail?.[0] ?? error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return "That picture couldn't be saved. Try again.";
}

/** The photo's address for an <img>: absolute from the API, or relative to the API base. */
export function pictureSrc(picture: Extract<MemberPicture, { kind: "photo" }>): string {
  return /^(https?:|blob:|data:)/i.test(picture.url) ? picture.url : `${API_BASE}${picture.url}`;
}

// ---- The latest picture per member (in memory, for every avatar on the page) ----

const known = new Map<number, MemberPicture | null>();
const listeners = new Set<() => void>();
let stamp = 0;

function emit(): void {
  stamp += 1;
  listeners.forEach((fn) => fn());
}

export function subscribePictures(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Changes whenever any picture does (for useSyncExternalStore). */
export function picturesStamp(): number {
  return stamp;
}

/** The latest picture we know for a member: undefined = never heard (use the payload's), null = initials. */
export function knownPicture(memberId: number | null | undefined): MemberPicture | null | undefined {
  return memberId == null ? undefined : known.get(memberId);
}

function same(a: MemberPicture | null | undefined, b: MemberPicture | null | undefined): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/** Remember pictures from a members payload (older backends leave `picture` out: nothing is learnt). */
export function rememberPictures(members: ReadonlyArray<{ id: number; picture?: MemberPicture | null }>): void {
  let changed = false;
  for (const m of members) {
    if (m.picture === undefined) continue;
    if (!known.has(m.id) || !same(known.get(m.id), m.picture)) {
      known.set(m.id, m.picture);
      changed = true;
    }
  }
  if (changed) emit();
}

/** Set one member's picture locally (optimistic update, or a rollback). */
export function rememberPicture(memberId: number, picture: MemberPicture | null): void {
  if (known.has(memberId) && same(known.get(memberId), picture)) return;
  known.set(memberId, picture);
  emit();
}

// ---- Calls ----

interface PictureReply {
  picture: MemberPicture | null;
}

/** PUT a library avatar. */
export async function setMemberAvatar(memberId: number, key: string): Promise<MemberPicture | null> {
  const reply = await authedRequest<PictureReply>(`/api/devices/members/${memberId}/picture/`, {
    method: "PUT",
    body: { kind: "avatar", key },
  });
  return reply.picture;
}

/** PUT a photo, already shrunk in the browser (team/photo.ts). */
export async function uploadMemberPhoto(memberId: number, jpeg: Blob): Promise<MemberPicture | null> {
  const form = new FormData();
  form.append("file", jpeg, "photo.jpg");
  const reply = await authedRequest<PictureReply>(`/api/devices/members/${memberId}/picture/`, { method: "PUT", form });
  return reply.picture;
}

/** DELETE: back to initials. */
export async function removeMemberPicture(memberId: number): Promise<void> {
  await authedRequest<null>(`/api/devices/members/${memberId}/picture/`, { method: "DELETE" });
}
