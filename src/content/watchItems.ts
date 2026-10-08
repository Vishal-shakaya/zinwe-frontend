import type { IconName } from "../components/ui/Icon";

export interface WatchItem {
  id: string;
  name: string;
  what: string;
  icon: IconName;
  /** Accessible name of the on/off switch. */
  switchLabel: string;
}

/** The "five doors" in the What-it-watches panel. All start switched on. */
export const watchItems: WatchItem[] = [
  {
    id: "transfer",
    name: "Data transfer",
    what: "USB drives, cloud uploads, large copies",
    icon: "transfer",
    switchLabel: "Data transfer monitoring",
  },
  {
    id: "remote",
    name: "Remote access",
    what: "Who connects to which PC, for how long",
    icon: "remote",
    switchLabel: "Remote access monitoring",
  },
  {
    id: "installs",
    name: "Software installs",
    what: "Apps that aren't on your approved list",
    icon: "install",
    switchLabel: "Software install monitoring",
  },
  {
    id: "lan",
    name: "LAN activity",
    what: "Unusual traffic between your machines",
    icon: "lan",
    switchLabel: "LAN activity monitoring",
  },
  {
    id: "email",
    name: "Email",
    what: "Sensitive files leaving the company",
    icon: "email",
    switchLabel: "Email monitoring",
  },
];
