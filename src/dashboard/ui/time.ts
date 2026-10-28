/** "2:20 PM", as in the boards' "Updated 2:20 PM". */
export function clockTime(at: number | Date | null | undefined): string {
  if (!at) return "just now";
  const d = typeof at === "number" ? new Date(at) : at;
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}
