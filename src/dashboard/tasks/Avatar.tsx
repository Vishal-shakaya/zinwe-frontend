import type { ReactElement } from "react";
import type { TaskPerson } from "./model";

/** Initials on the person's tint (the boards' avatar; real members have no photo). */
export function Avatar({ person, size }: { person: Pick<TaskPerson, "initials" | "tint">; size: number }): ReactElement {
  return (
    <span
      aria-hidden="true"
      style={{
        flex: "none",
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.round(size * 0.4),
        fontWeight: 700,
        color: "#3A352E",
        background: person.tint,
      }}
    >
      {person.initials}
    </span>
  );
}
