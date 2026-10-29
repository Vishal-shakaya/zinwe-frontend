import type { Member } from "../../lib/api";
import { sample, sampleStore, SAMPLES_ON } from "./index";

/**
 * SAMPLE (DashTeam person card, DashActivity timeline): "Two PCs per person" (FR-36) is not served by the API —
 * a member has one `device`. The board's case: Vikram Singh connected a second PC (LAPTOP-VIKRAM) today at
 * 11:05 AM; it agreed on its own screen and is protected; the owner can keep both or remove one.
 *
 * Laid onto a real account: the board person ("vikram") maps onto a real active member who
 * has a PC (in order, wrapping), and the second PC is named after them (LAPTOP-<FIRST NAME>). Keep both / Remove
 * are kept for the tab's life.
 *
 * When FR-36 ships: `listSecondPcs` reads each member's `devices[]`; `keepBoth` / `removeSecondPc` become API calls.
 * SAMPLES_ON off (production): nobody has a second PC, so the card block, notice and timeline line never show.
 */

export interface SecondPc {
  memberId: number;
  /** Hostname of the second PC. */
  name: string;
  /** When it connected, "11:05 AM" today. */
  connectedAt: string;
  /** Its own line on the card ("Online · protected"). */
  state: string;
  /** The "connected a second PC" notice is still showing (not answered with Keep both). */
  isNew: boolean;
}

interface PcsState {
  kept: boolean;
  removed: boolean;
}

const store = sampleStore<PcsState>("pcs", () => ({ kept: false, removed: false }));

/** The board person who has two PCs: Vikram Singh, 9th in the board's team (Priya, Arjun, Sneha, Karan, Emily, Olivia,
 * Jake, Michael, Vikram, Fatima), laid onto the real members in the same order. */
const SAMPLE_INDEX = 8;

function hostFor(name: string): string {
  const first = (name.trim().split(/\s+/)[0] || "PC").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return `LAPTOP-${first || "PC"}`;
}

/** Which real member the sample second PC belongs to (null: nobody with a PC yet). */
export function secondPcOwner(members: readonly Member[] | undefined): Member | null {
  if (!SAMPLES_ON) return null;
  const real = (members ?? []).filter((m) => m.is_active && m.device);
  if (!real.length) return null;
  return real[SAMPLE_INDEX % real.length];
}

function build(members: readonly Member[] | undefined): SecondPc[] {
  const st = store.get();
  const owner = secondPcOwner(members);
  if (!owner || st.removed) return [];
  return [{ memberId: owner.id, name: hostFor(owner.name), connectedAt: "11:05 AM", state: "Online · protected", isNew: !st.kept }];
}

/** GET second PCs (sample). */
export function listSecondPcs(members: readonly Member[] | undefined, signal?: AbortSignal): Promise<SecondPc[]> {
  return sample(build(members), signal, 80);
}

/** The second PC as it is now, without waiting (Activity's timeline). */
export function secondPcsNow(members: readonly Member[] | undefined): SecondPc[] {
  return build(members);
}

/** "Keep both": the notice goes, both PCs stay protected. */
export function keepBoth(members: readonly Member[] | undefined): SecondPc[] {
  if (!SAMPLES_ON) return [];
  store.set({ ...store.get(), kept: true });
  return build(members);
}

/** Remove the second PC: protection stops there and its slot frees up. */
export function removeSecondPc(members: readonly Member[] | undefined): SecondPc[] {
  if (!SAMPLES_ON) return [];
  store.set({ ...store.get(), removed: true });
  return build(members);
}
