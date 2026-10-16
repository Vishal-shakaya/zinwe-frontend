import type { IconName } from "../components/ui/Icon";

export interface WatchItem {
  id: string;
  name: string;
  what: string;
  icon: IconName;
  /** Accessible name of the on/off switch. */
  switchLabel: string;
}

/**
 * The "What Zinwe covers" panel on the home page. Each line is something the Windows agent does
 * today (marketing-context §3 rule 4: only what ships). All start switched on.
 */
export const watchItems: WatchItem[] = [
  {
    id: "usb",
    name: "USB drives",
    what: "Every copy to a pen drive, with its size. Allow, make read-only, or block.",
    icon: "usb",
    switchLabel: "USB drive protection",
  },
  {
    id: "transfer",
    name: "Files leaving the office",
    what: "Large copies to shared folders, Outlook attachments and web uploads.",
    icon: "transfer",
    switchLabel: "File transfer alerts",
  },
  {
    id: "remote",
    name: "Remote-access tools",
    what: "An alert when AnyDesk, TeamViewer and others run. Block the ones you don't use.",
    icon: "remote",
    switchLabel: "Remote-access tool alerts",
  },
  {
    id: "installs",
    name: "New software",
    what: "Every program installed on a PC, the day it appears.",
    icon: "install",
    switchLabel: "New software alerts",
  },
  {
    id: "web",
    name: "Websites",
    what: "See which sites your team uses. Block risky categories or any site you choose.",
    icon: "globe",
    switchLabel: "Website protection",
  },
  {
    id: "work",
    name: "Work hours",
    what: "Log in, breaks and log out, from each person's own Zinwe widget.",
    icon: "clock",
    switchLabel: "Work hours",
  },
];
