/**
 * Window event fired when a chat thread fetch just marked member replies read (opening a thread
 * reads it server-side). The layout listens and refreshes the sidebar's Chat badge right away
 * instead of waiting for its own poll.
 */
export const CHAT_READ_EVENT = "zinwe:chat-read";

/** On the Chat page: how often the open conversation and the team list (tiles and the Chat tab count) refresh. */
export const CHAT_POLL_MS = 15_000;
