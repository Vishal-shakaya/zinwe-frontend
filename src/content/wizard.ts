export interface WizardOption {
  label: string;
  /** Rule shown under the question when this option is picked. */
  rule: string;
}

export interface WizardQuestion {
  question: string;
  options: WizardOption[];
  /** Index of the option the auto-play demo picks. */
  pick: number;
}

/**
 * The three-question setup demo on the home page (#how). Every answer is a real setting in the
 * dashboard (USB mode, remote-tool blocking, website blocking), so the demo never promises more.
 */
export const wizardQuestions: WizardQuestion[] = [
  {
    question: "Can your team use USB drives?",
    options: [
      { label: "Yes", rule: "USB drives allowed, every copy recorded" },
      { label: "Open files only", rule: "USB drives read-only on every PC" },
      { label: "No", rule: "USB drives blocked on every PC" },
    ],
    pick: 1,
  },
  {
    question: "Remote-access tools like AnyDesk?",
    options: [
      { label: "Allowed", rule: "Allowed, and recorded whenever one runs" },
      { label: "Only the one we use", rule: "Every other remote tool is blocked" },
      { label: "None", rule: "Remote-access tools blocked on every PC" },
    ],
    pick: 1,
  },
  {
    question: "Risky websites?",
    options: [
      { label: "Just show me", rule: "Sites visited are listed, nothing blocked" },
      { label: "Block risky ones", rule: "Malware, phishing, gambling and adult sites blocked" },
      { label: "Block my list", rule: "Only the sites you list are blocked" },
    ],
    pick: 1,
  },
];
