/**
 * Window event fired when a chat thread fetch just marked member replies read (opening a thread
 * reads it server-side). The layout listens and refreshes the sidebar's Chat badge right away
 * instead of waiting for its own poll.
 */
export const CHAT_READ_EVENT = "zinwe:chat-read";
