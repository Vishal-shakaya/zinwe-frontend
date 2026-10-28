import { useEffect, useId, useRef, type ReactElement, type ReactNode } from "react";
import { ZIcon } from "../ui/ZIcon";
import "../../styles/dash13/float.css";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** One line under the title. */
  sub?: ReactNode;
  children: ReactNode;
  /** "sm" for confirmations, default for forms, "lg" for plan cards. */
  size?: "sm" | "md" | "lg";
  /** False for a required step: no ✕, and Esc / backdrop clicks don't close it. */
  dismissible?: boolean;
}

/**
 * A dialog in the v1.3 look (the boards' `.zn-dialog`: white, radius 16, border #E7E3DA; a bottom sheet on a phone),
 * built on the native <dialog>: the browser handles the focus trap, Esc to close and inert background, so this stays
 * tiny. Clicking the backdrop also closes it. Content unmounts when closed (forms start fresh).
 */
export function Modal({
  open,
  onClose,
  title,
  sub,
  children,
  size = "md",
  dismissible = true,
}: ModalProps): ReactElement | null {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={ref}
      // dash-modal* stay for the content rules older pages rely on (e.g. the feedback scale); zn-modal is the look.
      className={`zn-modal zn-modal--${size} dash-modal dash-modal--${size}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (dismissible) onClose();
      }}
      onClick={(event) => {
        // A click on the <dialog> itself (not its panel) is a click on the backdrop.
        if (dismissible && event.target === event.currentTarget) onClose();
      }}
    >
      <div className="zn-modal__panel">
        <header className="zn-dialog-head">
          <div>
            <h2 id={titleId}>{title}</h2>
            {sub ? <p>{sub}</p> : null}
          </div>
          {dismissible ? (
            <button type="button" className="z-x" onClick={onClose} aria-label="Close">
              <ZIcon name="close" size={16} stroke={2.2} />
            </button>
          ) : null}
        </header>
        {children}
      </div>
    </dialog>
  );
}

export default Modal;
