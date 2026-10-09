/** The marketing site's early-access waitlist (kept working alongside sign up). */
import { postPublic, type SubmitResult } from "./http";
import type { TeamSize } from "./types";

export type Platform = "windows" | "linux" | "macos";
export type Concern = "usb" | "remote" | "installs" | "email" | "compliance";

export interface EarlyAccessPayload {
  name: string;
  email: string;
  company: string;
  /** Empty string when not given. */
  phone: string;
  team_size: TeamSize;
  platforms: Platform[];
  concerns: Concern[];
}

export type EarlyAccessField = keyof EarlyAccessPayload;

export interface EarlyAccessResponse {
  id: number | string;
  email: string;
  status: string;
  trial_days: number;
  /** true on a 200 for an email that already reserved a spot. */
  already_registered: boolean;
  message: string;
}

export type EarlyAccessResult = SubmitResult<EarlyAccessResponse, EarlyAccessField>;

const EARLY_ACCESS_FIELDS: readonly EarlyAccessField[] = [
  "name",
  "email",
  "company",
  "phone",
  "team_size",
  "platforms",
  "concerns",
];

/** POST /api/auth/early-access/ — reserve an early-access spot. */
export function submitEarlyAccess(payload: EarlyAccessPayload): Promise<EarlyAccessResult> {
  return postPublic<EarlyAccessResponse, EarlyAccessField>("/api/auth/early-access/", payload, EARLY_ACCESS_FIELDS);
}
