/**
 * How each newsletter series talks about itself on the site: its campaign tag (UTM `utm_campaign` and the
 * sign-up source prefix, e.g. "tlf:ep07:email"), its words for an episode, its pace and its member perks.
 * The backend keeps the same campaign codes (z_blog/series_brand.py). A series not listed here gets neutral
 * wording and a code made from its slug's initials.
 */
export interface SeriesVoice {
  campaign: string;
  /** "the rest of this <unit> is for members" */
  unit: string;
  /** "Members get <pace>, in order." */
  pace: string;
  inside: string[];
  filesTitle: string;
  freeLede: string;
  joinLede: string;
  perks: { title: string; text: string }[];
  shareText: (title: string) => string;
  disclaimer: string;
}

const TLF: SeriesVoice = {
  campaign: "tlf",
  unit: "case file",
  pace: "one episode a morning, four days a week",
  inside: ["The full story, to the last scene", "The lesson, in plain English", "Your 10-minute challenge"],
  filesTitle: "Case file downloads",
  freeLede:
    "This episode is free for everyone. The rest are for members: one a morning, four days a week, with the case files and worksheets. Membership costs nothing.",
  joinLede:
    "Membership is free. Episode 1 arrives the moment you confirm, then one episode a morning, four days a week, in order. Every released episode stays open to you here, on any device you open your link on.",
  perks: [
    { title: "The full case file", text: "Every episode in full: the story, what went wrong, and the plain-English lesson." },
    { title: "A 10-minute fix", text: "One practical step per episode that a small team can do today, with no IT department." },
    { title: "Downloads to keep", text: "Many episodes come with case-file PDFs and checklists, for you and your team." },
  ],
  shareText: (title) => `${title}: short stories about the small mistakes that put company data at risk, each with a 10-minute fix. Free to join.`,
  disclaimer: "The companies and people in our series are fictional. The mistakes are common, and the lessons are real.",
};

const IUA: SeriesVoice = {
  campaign: "iua",
  unit: "episode",
  pace: "one episode a week, every Wednesday morning",
  inside: ["The rest of the story", "The lesson, in plain English", "This week's 10-minute action"],
  filesTitle: "Episode downloads",
  freeLede:
    "This episode is free for everyone. The rest are for members: one a week, every Wednesday morning, each with a printable action card. Membership costs nothing.",
  joinLede:
    "Membership is free. Episode 1 arrives the moment you confirm, then one episode every Wednesday morning, in order. Every released episode stays open to you here, on any device you open your link on.",
  perks: [
    { title: "Every episode in full", text: "The story, the moment something didn't fit, and the plain-English lesson." },
    { title: "One 10-minute action", text: "A single protective step per episode, for you, your family or your team." },
    { title: "Action cards to keep", text: "A printable card with every episode, and the whole Identity Check at the end." },
  ],
  shareText: (title) => `${title}: short stories about how identities get impersonated and taken over, each with a 10-minute fix. Free to join.`,
  disclaimer: "The people and incidents in our series are fictional composites. The risks are common, and the lessons are real.",
};

const VOICES: Record<string, SeriesVoice> = { "the-last-file": TLF, "identity-under-attack": IUA };

export function seriesVoice(slug: string): SeriesVoice {
  const known = VOICES[slug];
  if (known) return known;
  const campaign = slug.split("-").filter(Boolean).map((w) => w[0]).join("").slice(0, 8) || "series";
  return {
    ...IUA,
    campaign,
    pace: "each episode by email, in order",
    freeLede: "This episode is free for everyone. The rest are for members, by email, in order. Membership costs nothing.",
    joinLede:
      "Membership is free. Episode 1 arrives the moment you confirm, then the rest by email, in order. Every released episode stays open to you here.",
    perks: IUA.perks.slice(0, 2),
    shareText: (title) => `${title}: a short Zinwe series, each episode with a 10-minute fix. Free to join.`,
  };
}
