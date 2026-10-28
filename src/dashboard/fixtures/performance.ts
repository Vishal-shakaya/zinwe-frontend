/**
 * Reports → Performance (FR-34, sample until the ranking ships).
 *
 * Score = tasks done 50% · worked time 50%. Keyboard and mouse activity is never part of it.
 * - Worked time is REAL: the person's worked seconds in GET reports/ for the period, against their usual day.
 * - Tasks done and the usual day length are SAMPLE: each person's rate (tasks a day, share done, usual hours)
 *   comes from the board's Kitecrest team, laid onto the account's real active members in order (wrapping),
 *   the same idea as `withPeople` in tasks.ts.
 *
 * When FR-34 ships, `getPerformanceInputs` becomes the API call (per member: tasks assigned / done in the period
 * and their usual hours), and the page keeps working out score and rank the same way.
 */
import type { Member } from "../../lib/api";
import { sample } from "./index";

/** One sample person's rates (board DashReports PEOPLE: tpd, tr, usual). */
interface SampleRate {
  sampleName: string;
  /** Tasks given a day. */
  tasksPerDay: number;
  /** Share of those done (0..1). */
  doneShare: number;
  /** Expected hours a working day. */
  usualHours: number;
}

/** Ordered so a small team still gets a spread of scores (top, middle, low). */
const RATES: readonly SampleRate[] = [
  { sampleName: "Arjun Mehta", tasksPerDay: 2, doneShare: 1, usualHours: 8 },
  { sampleName: "Priya Nair", tasksPerDay: 1.5, doneShare: 0.78, usualHours: 8 },
  { sampleName: "Karan Malhotra", tasksPerDay: 1.6, doneShare: 0.25, usualHours: 8 },
  { sampleName: "Olivia Martinez", tasksPerDay: 1.6, doneShare: 0.86, usualHours: 8 },
  { sampleName: "Sneha Reddy", tasksPerDay: 1.8, doneShare: 0.92, usualHours: 8 },
  { sampleName: "Michael Chen", tasksPerDay: 1.8, doneShare: 0.66, usualHours: 8 },
  { sampleName: "Vikram Singh", tasksPerDay: 1.4, doneShare: 0.88, usualHours: 8 },
  { sampleName: "Emily Carter", tasksPerDay: 1.6, doneShare: 0.9, usualHours: 8 },
  { sampleName: "Jake Thompson", tasksPerDay: 1.6, doneShare: 0.55, usualHours: 8 },
  { sampleName: "Fatima Sheikh", tasksPerDay: 1.2, doneShare: 0.8, usualHours: 7 },
];

/** What the score is worked out from, for one real member. */
export interface PerformanceInput {
  memberId: number;
  name: string;
  tasksPerDay: number;
  doneShare: number;
  usualHours: number;
}

/** Lay the sample rates onto the account's real active members (in order, wrapping). */
export function withPeople(members: readonly Member[] | undefined): PerformanceInput[] {
  return (members ?? [])
    .filter((m) => m.is_active)
    .map((m, i) => {
      const r = RATES[i % RATES.length];
      return { memberId: m.id, name: m.name, tasksPerDay: r.tasksPerDay, doneShare: r.doneShare, usualHours: r.usualHours };
    });
}

/** GET performance inputs (sample): per member, their task rate and usual day. */
export function getPerformanceInputs(signal: AbortSignal, members: readonly Member[] | undefined): Promise<PerformanceInput[]> {
  return sample(withPeople(members), signal);
}

/** One ranked person on the Performance tab. */
export interface PerformanceRow {
  memberId: number;
  name: string;
  first: string;
  assigned: number;
  done: number;
  /** Worked time as a share of usual (0..1). */
  wp: number;
  /** Average first log-in, minutes after midnight (null when unknown). */
  usualStart: number | null;
  score: number;
  days: number;
}

/** Score and rank everyone who worked in the period: real days and worked time, sample task rates. High to low. */
export function rankPerformance(
  people: ReadonlyArray<{ member_id: number | null; name: string; days_worked: number; worked_seconds: number; first_in: number | null }>,
  inputs: readonly PerformanceInput[],
): PerformanceRow[] {
  const byId = new Map(inputs.map((x) => [x.memberId, x]));
  return people
    .filter((p) => p.member_id !== null && p.days_worked > 0 && byId.has(p.member_id))
    .map((p) => {
      const x = byId.get(p.member_id!)!;
      const assigned = Math.max(1, Math.round(p.days_worked * x.tasksPerDay));
      const done = Math.min(assigned, Math.round(assigned * x.doneShare));
      const wp = Math.min(1, p.worked_seconds / Math.max(1, p.days_worked * x.usualHours * 3600));
      return {
        memberId: p.member_id!,
        name: p.name,
        first: p.name.split(/\s+/)[0],
        assigned,
        done,
        wp,
        usualStart: p.first_in,
        score: Math.round(100 * (0.5 * (done / assigned) + 0.5 * wp)),
        days: p.days_worked,
      };
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}
