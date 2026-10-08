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

/** The three-question setup-wizard demo on the home page (#how). */
export const wizardQuestions: WizardQuestion[] = [
  {
    question: "Can your team copy files to USB drives?",
    options: [
      { label: "Yes", rule: "USB copies allowed, but logged" },
      { label: "Only with approval", rule: "USB copies need your approval" },
      { label: "No", rule: "USB drives blocked on every PC" },
    ],
    pick: 1,
  },
  {
    question: "Who may connect to your PCs remotely?",
    options: [
      { label: "Anyone", rule: "Remote sessions allowed, but logged" },
      { label: "Our IT vendor", rule: "Only your IT vendor can connect remotely" },
      { label: "No one", rule: "All remote sessions blocked" },
    ],
    pick: 1,
  },
  {
    question: "How should we tell you?",
    options: [
      { label: "Instantly", rule: "Alerts sent the moment something happens" },
      { label: "Daily summary", rule: "One summary every evening" },
      { label: "Both", rule: "Urgent alerts now, everything else at 6 PM" },
    ],
    pick: 2,
  },
];
