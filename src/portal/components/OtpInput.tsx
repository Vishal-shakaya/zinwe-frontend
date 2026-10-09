import {
  useEffect,
  useRef,
  type ClipboardEvent,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactElement,
} from "react";
import { cx } from "../../lib/cx";
import { OTP_LENGTH, otpDigits } from "../otp";

interface OtpInputProps {
  /** One character per box; a space marks an empty box in the middle. */
  value: string;
  onChange: (value: string) => void;
  /** Called once all six boxes hold a digit (typing, paste or autofill). */
  onComplete?: (code: string) => void;
  idPrefix: string;
  label?: string;
  /** id of the error message, linked with aria-describedby. */
  errorId?: string;
  invalid?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}

function toSlots(value: string): string[] {
  return Array.from({ length: OTP_LENGTH }, (_, i) => (/\d/.test(value[i] ?? "") ? value[i] : ""));
}

function fromSlots(slots: string[]): string {
  return slots
    .map((s) => s || " ")
    .join("")
    .trimEnd();
}

/**
 * Six one-digit boxes for an emailed code. Typing advances, Backspace on an
 * empty box steps back, and pasting (or the browser's one-time-code autofill)
 * fills every box at once. Numeric keyboard on phones.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  idPrefix,
  label = "6-digit code",
  errorId,
  invalid = false,
  disabled = false,
  autoFocus = false,
}: OtpInputProps): ReactElement {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const slots = toSlots(value);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const focusBox = (index: number) => {
    const box = refs.current[Math.max(0, Math.min(OTP_LENGTH - 1, index))];
    box?.focus();
    box?.select();
  };

  const commit = (next: string[], focusIndex: number) => {
    const joined = fromSlots(next);
    onChange(joined);
    focusBox(focusIndex);
    if (next.every((s) => s !== "")) onComplete?.(next.join(""));
  };

  /** Write `digits` starting at box `start`. */
  const fill = (start: number, digits: string) => {
    const next = [...slots];
    const chars = digits.slice(0, OTP_LENGTH - start).split("");
    chars.forEach((d, k) => {
      next[start + k] = d;
    });
    commit(next, start + chars.length);
  };

  const onBoxChange = (index: number) => (event: ChangeEvent<HTMLInputElement>) => {
    const digits = otpDigits(event.target.value);
    if (digits === "") {
      const next = [...slots];
      next[index] = "";
      commit(next, index);
      return;
    }
    // A whole code arriving in one box (autofill, some keyboards): fill from the start.
    if (digits.length >= OTP_LENGTH) return fill(0, digits);
    // The box selects its content on focus, so a new digit replaces the old one;
    // keep the last typed digit in case the browser appended instead.
    if (digits.length === 2 && slots[index]) return fill(index, digits.slice(-1));
    fill(index, digits);
  };

  const onKeyDown = (index: number) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && slots[index] === "" && index > 0) {
      event.preventDefault();
      const next = [...slots];
      next[index - 1] = "";
      commit(next, index - 1);
    } else if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusBox(index - 1);
    } else if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      event.preventDefault();
      focusBox(index + 1);
    }
  };

  const onPaste = (index: number) => (event: ClipboardEvent<HTMLInputElement>) => {
    const digits = otpDigits(event.clipboardData.getData("text"));
    if (digits === "") return;
    event.preventDefault();
    fill(digits.length >= OTP_LENGTH ? 0 : index, digits);
  };

  const legendId = `${idPrefix}-legend`;

  return (
    <fieldset className={cx("otp", invalid && "is-invalid")} disabled={disabled} aria-describedby={errorId}>
      <legend className="otp__legend" id={legendId}>
        {label}
      </legend>
      <div className="otp__boxes">
        {slots.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={i === 0 ? idPrefix : `${idPrefix}-${i + 1}`}
            className="otp__box"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={OTP_LENGTH}
            value={digit}
            onChange={onBoxChange(i)}
            onKeyDown={onKeyDown(i)}
            onPaste={onPaste(i)}
            onFocus={(e) => e.target.select()}
            aria-label={`Digit ${i + 1} of ${OTP_LENGTH}`}
            aria-invalid={invalid || undefined}
            aria-describedby={errorId}
          />
        ))}
      </div>
    </fieldset>
  );
}
