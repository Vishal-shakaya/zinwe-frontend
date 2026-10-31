/**
 * /whats-new (New release): the latest release, shown above the device loops' changelog. Older releases still come
 * from the release-notes API (Admin → What's new); a published API note for the same version replaces nothing here,
 * the page simply skips API notes whose version starts with LATEST_RELEASE.version.
 * Only shipped features (marketing context §3.4). Node-safe: build/staticPages.ts pre-renders it.
 */

export type ReleaseIcon = "tasks" | "chat" | "pictures" | "bell" | "windows" | "logo";

export interface ReleaseItem {
  icon: ReleaseIcon;
  tag: string;
  title: string;
  text: string;
}

export const LATEST_RELEASE = {
  version: "1.3",
  /** Live on zinwe.io (prod-20261030). */
  date: "2026-10-30",
  dateLabel: "30 October 2026",
  title: "Tasks, team pictures and a bell that knows what needs you",
  summary:
    "Send your team tasks they can tick off on their PC, see everyone with a friendly picture, and open one bell for everything that needs you. The Windows app is now 1.3.2.",
  items: [
    {
      icon: "tasks",
      tag: "New",
      title: "Tasks",
      text: "Send a task to anyone on your team, with steps, a due time and a priority. It lands in the Zinwe window on their PC. They confirm it, tick off steps, ask for help or mark it done, and you give the OK. The Tasks page puts what needs you first, as a list or a board.",
    },
    {
      icon: "chat",
      tag: "Improved",
      title: "Chat, with tasks inside",
      text: "Tasks sit in the conversation as live cards that update while the person works, with Reply in chat one tap away. New messages stay in view, sending has a small animation, and the chat fits your screen without a long page scroll.",
    },
    {
      icon: "pictures",
      tag: "New",
      title: "Team pictures",
      text: "Give each person a picture from a library of 16 friendly illustrations, or upload a photo. People can also pick their own in the Zinwe window on their PC. Pictures show on team cards, in chat and on tasks.",
    },
    {
      icon: "bell",
      tag: "New",
      title: "A bell for what needs you",
      text: "The bell at the top of your dashboard lists real things only: alerts that need you, unread chats, break and end-of-day requests waiting for your OK, tasks that need help or your sign-off, and Zinwe news.",
    },
    {
      icon: "windows",
      tag: "Update",
      title: "Zinwe for Windows 1.3.2",
      text: "Your team's Zinwe window gets a Tasks tab: your tasks with their steps, due times and notes, plus each person's own to-dos on that PC. Task cards show up live in chat, and each person can change their picture under Me. Task updates made while the PC is offline are sent when it's back online.",
    },
    {
      icon: "logo",
      tag: "Refreshed",
      title: "The official Zinwe logo",
      text: "The official logo is now on the website, the dashboard and the Windows app, so every Zinwe screen looks like one product.",
    },
  ] satisfies ReleaseItem[],
} as const;

/** The device loops above the notes. Recorded from the dashboard's production build on demo data. */
export const RELEASE_LOOPS = {
  laptop: {
    base: "/media/whats-new/zinwe-1-3-laptop",
    width: 1280,
    height: 800,
    label: "The Zinwe dashboard on a laptop: the Tasks board, then a chat where a task card shows a request for help and the owner replies.",
  },
  phone: {
    base: "/media/whats-new/zinwe-1-3-phone",
    width: 540,
    height: 1168,
    label: "The Zinwe dashboard on a phone: the overview, the bell, then a finished task approved with one tap.",
  },
} as const;

