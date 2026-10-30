/**
 * The Protection pages' analytics scope banner. Who and when are picked in the page header (protection/parts
 * HeaderFilters); while one person is picked, this slim bar says so and offers "Show everyone". When nothing can
 * be collected from them yet (no PC, or they haven't agreed / said no), it says so plainly and offers to remind
 * them, instead of every card just saying "no activity" (J5-16). Rules always apply to every PC.
 */
import type { ReactElement } from "react";
import type { AnalyticsScope } from "../features/analyticsScope";
import { useChatBubble } from "../features/chatBubble";
import { useEntitlements } from "../features/entitlements";
import { consentOf, consentReminder } from "../features/memberStatus";
import { MemberAvatar } from "../team/Avatar";
import "../../styles/dash13/protection.css";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function ScopeBanner({ scope }: { scope: AnalyticsScope }): ReactElement | null {
  const bubble = useChatBubble();
  const chatOn = useEntitlements().has("team_chat");
  if (!scope.person) return null;
  const person = scope.person;
  const device = person.device;
  const consent = consentOf(device);
  const first = person.name.trim().split(/\s+/)[0] || person.name;
  const clear = (
    <button type="button" className="z-btn sm ghost" onClick={() => scope.setMember(null)}>
      Show everyone
    </button>
  );
  if (consent !== "given") {
    const message =
      consent === "none"
        ? `${first} hasn't connected a PC yet, so nothing is collected. Install Zinwe on their PC with their ID from Team & devices.`
        : consent === "declined"
          ? `${first} said no to monitoring on their PC, so Zinwe collects nothing from it. Work hours and chat still work.`
          : `${first} hasn't agreed on their PC yet, so nothing is collected. Ask them to open Zinwe and agree.`;
    return (
      <div className="zp-banner warn" role="status">
        <span className="zp-banner__text">
          <b>{message}</b>
        </span>
        {consent !== "none" && chatOn ? (
          <button
            type="button"
            className="z-btn sm"
            onClick={() =>
              bubble.open({
                person: { id: person.id, name: person.name, email: person.email, hostname: device?.hostname },
                draft: consentReminder(person.name, consent),
              })
            }
          >
            {consent === "declined" ? `Talk to ${first}` : `Remind ${first}`}
          </button>
        ) : null}
        {clear}
      </div>
    );
  }
  return (
    <div className="zp-banner" role="status">
      <MemberAvatar
        member={person}
        size={28}
        className="zp-banner__avatar"
        initials={initialsOf(person.name)}
        style={{ background: "#fdebdc", color: "#8a3a04", fontSize: 11 }}
      />
      <span className="zp-banner__text">
        Showing <b>{person.name}</b>
        {device?.hostname ? (
          <>
            {" "}
            (<span className="z-mono">{device.hostname}</span>)
          </>
        ) : null}{" "}
        only.
      </span>
      {clear}
    </div>
  );
}
