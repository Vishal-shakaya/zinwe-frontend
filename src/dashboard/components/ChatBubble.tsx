import { useEffect, type ReactElement } from "react";
import { createPortal } from "react-dom";
import type { ChatBubbleRequest } from "../features/chatBubble";
import { ChatWindow } from "../float/ChatWindow";
import { closeWin, holdDock, openWin, setWinMin, useDock } from "../float/dock";
import { useFloatSlot } from "../float/slots";
import "../../styles/dash13/float.css";

/**
 * The floating chat (board DashFloat `wins`): each request opens a docked window beside the Chat / Support buttons,
 * up to 3 side by side (2 under 1180 px; on a phone the newest one as a bottom sheet). A window shows the alert it's
 * about, the conversation so far and the tagged composer; it can be minimised to its header and reopened.
 * AppLayout passes the latest request; picking someone already docked brings their window back. Closing the last
 * window calls `onClose`.
 */
export function ChatBubble({ request, onClose }: { request: ChatBubbleRequest; onClose: () => void }): ReactElement | null {
  const slot = useFloatSlot("dock");
  const wins = useDock();

  useEffect(() => holdDock(), []);
  useEffect(() => {
    openWin(request);
  }, [request]);

  if (!slot) return null;
  return createPortal(
    wins.map((w) => (
      <ChatWindow
        key={w.key}
        win={w}
        onToggle={() => setWinMin(w.key, !w.min)}
        onClose={() => {
          if (closeWin(w.key) === 0) onClose();
        }}
      />
    )),
    slot,
  );
}

export default ChatBubble;
