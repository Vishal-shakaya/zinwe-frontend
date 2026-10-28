/**
 * Help → Support talks to the floating Support panel (components/SupportWidget.tsx) through window events
 * (features/support.ts): `openSupport()` opens the panel on the conversation list; `showSupportButton()` brings back
 * a Support button the owner hid (the widget clears the account's "hidden" choice).
 */
export { openSupport, showSupportButton } from "../features/support";
