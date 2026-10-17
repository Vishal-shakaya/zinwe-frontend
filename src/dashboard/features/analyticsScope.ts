/**
 * Who and when for a protection page's analytics: everyone or one team member (see memberFilter.ts), and
 * the range in days. Pages pass `member` and `days` to their data hooks; `label` goes in card subtitles.
 */
import { useCallback, useState } from "react";
import { listMembers, type Member } from "../../lib/api";
import { useResource } from "../useResource";
import { rangeLabel, useMemberFilter } from "./memberFilter";

export interface AnalyticsScope {
  /** The team member's id, or null for everyone (an id that's no longer on the team counts as everyone). */
  member: number | null;
  /** The picked person, once the team has loaded. */
  person: Member | null;
  members: Member[] | undefined;
  setMember: (id: number | null) => void;
  days: number;
  setDays: (days: number) => void;
  /** "Everyone · last 7 days" / "Asha Verma · last 7 days", for card subtitles. */
  label: string;
}

export function useAnalyticsScope(initialDays = 7): AnalyticsScope {
  const { member: wanted, setMember } = useMemberFilter();
  const [days, setDays] = useState(initialDays);
  const load = useCallback((signal: AbortSignal) => listMembers(signal), []);
  const team = useResource(load, { pollMs: 60_000 });
  const members = team.data?.filter((m) => m.is_active);
  const person = wanted !== null ? (members?.find((m) => m.id === wanted) ?? null) : null;
  // Until the team loads, trust the URL; after, a stale id (removed member) means everyone.
  const member = members === undefined ? wanted : person ? person.id : null;
  const who = person ? person.name : "Everyone";
  return { member, person, members, setMember, days, setDays, label: `${who} · ${rangeLabel(days)}` };
}
