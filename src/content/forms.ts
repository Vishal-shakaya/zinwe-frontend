import type { Concern, Platform, TeamSize } from "../lib/api";

export interface ChoiceOption<V extends string = string> {
  id: string;
  value: V;
  label: string;
}

export const teamSizeOptions: ChoiceOption<TeamSize>[] = [
  { id: "s1", value: "1-10", label: "1–10" },
  { id: "s2", value: "11-25", label: "11–25" },
  { id: "s3", value: "26-50", label: "26–50" },
  { id: "s4", value: "50+", label: "50+" },
];

export const platformOptions: ChoiceOption<Platform>[] = [
  { id: "p1", value: "windows", label: "Windows" },
  { id: "p2", value: "linux", label: "Linux" },
  { id: "p3", value: "macos", label: "macOS" },
];

export const concernOptions: ChoiceOption<Concern>[] = [
  { id: "c1", value: "usb", label: "Files copied to USB" },
  { id: "c2", value: "remote", label: "Remote access" },
  { id: "c3", value: "installs", label: "Unknown software" },
  { id: "c4", value: "email", label: "Email leaks" },
  { id: "c5", value: "compliance", label: "Privacy and consent" },
];

export type ContactTopic = "fit" | "pricing" | "partnership" | "other";

export const contactTopicOptions: ChoiceOption<ContactTopic>[] = [
  { id: "t1", value: "fit", label: "Is Zinwe right for us?" },
  { id: "t2", value: "pricing", label: "Pricing" },
  { id: "t3", value: "partnership", label: "Partnership" },
  { id: "t4", value: "other", label: "Something else" },
];
