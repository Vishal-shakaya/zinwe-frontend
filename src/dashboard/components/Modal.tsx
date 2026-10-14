import { useEffect, useId, useRef, type ReactElement, type ReactNode } from "react";
import { DashIcon } from "./DashIcon";

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
 * A centred dialog built on the native <dialog>: the browser handles the focus
 * trap, Esc to close and inert background, so this stays tiny. Clicking the
 * backdrop also closes it. Content unmounts when closed (forms start fresh).
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
      className={`dash-modal dash-modal--${size}`}
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
      <div className="dash-modal__panel">
        <header className="dash-modal__head">
          <div>
            <h2 className="dash-modal__title" id={titleId}>
              {title}
            </h2>
            {sub ? <p className="dash-card__sub">{sub}</p> : null}
          </div>
          {dismissible ? (
            <button type="button" className="dash-modal__x" onClick={onClose} aria-label="Close">
              <DashIcon name="close" />
            </button>
          ) : null}
        </header>
        {children}
      </div>
    </dialog>
  );
}

export default Modal;
