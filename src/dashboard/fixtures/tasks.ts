/**
 * SAMPLE (DashTasks, DashChat task cards, DashOverview Tasks card): FR-20 tasks are not served by the API yet.
 * The Tasks/Chat build fills this module; the shell only needs the "waiting for you" count for the menu badge.
 * Keep `countTasksWaiting` exported (DashNav reads it).
 */

/** Tasks waiting for the owner's OK or help (DashNav: Sneha needs help; Arjun and Emily wait for your OK). */
export function countTasksWaiting(): number {
  return 3;
}
