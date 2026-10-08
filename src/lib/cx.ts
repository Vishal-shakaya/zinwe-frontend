/** Joins truthy class names: cx("chip", on && "chip--on") -> "chip chip--on". */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
