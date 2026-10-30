import type { ReactElement } from "react";
import { MemberAvatar } from "../team/Avatar";
import type { TaskPerson } from "./model";

/** The person's picture (FR-44), else their initials on the person's tint (the boards' avatar). */
export function Avatar({ person, size }: { person: Pick<TaskPerson, "initials" | "tint" | "memberId" | "name" | "member">; size: number }): ReactElement {
  return (
    <MemberAvatar
      member={{ id: person.memberId, name: person.name, picture: person.member?.picture }}
      size={size}
      initials={person.initials}
      style={{ fontSize: Math.round(size * 0.4), color: "#3A352E", background: person.tint }}
    />
  );
}
