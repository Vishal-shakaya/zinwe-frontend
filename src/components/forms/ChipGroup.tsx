import { Fragment, type ReactElement, type Ref } from "react";
import type { ChoiceOption } from "../../content/forms";

interface ChipGroupProps<V extends string> {
  type: "radio" | "checkbox";
  name: string;
  options: ChoiceOption<V>[];
  /** Currently checked values (at most one for radios). */
  selected: readonly V[];
  onToggle: (value: V, checked: boolean) => void;
  /** id of the visible group label. */
  labelledBy: string;
  /** Marks the group as required (set on the first input, like the static form). */
  required?: boolean;
  /** Receives the first input, so validation can focus the group. */
  firstInputRef?: Ref<HTMLInputElement>;
}

/**
 * `.seg` row of visually hidden radios/checkboxes, each followed by a
 * `label.chip` (CSS styles `input:checked + label`).
 */
export function ChipGroup<V extends string>({
  type,
  name,
  options,
  selected,
  onToggle,
  labelledBy,
  required,
  firstInputRef,
}: ChipGroupProps<V>): ReactElement {
  return (
    <div className="seg" role={type === "radio" ? "radiogroup" : "group"} aria-labelledby={labelledBy}>
      {options.map((opt, i) => (
        <Fragment key={opt.id}>
          <input
            ref={i === 0 ? firstInputRef : undefined}
            type={type}
            name={name}
            id={opt.id}
            value={opt.value}
            checked={selected.includes(opt.value)}
            required={required && i === 0 ? true : undefined}
            onChange={(e) => onToggle(opt.value, e.target.checked)}
          />
          <label className="chip" htmlFor={opt.id}>
            {opt.label}
          </label>
        </Fragment>
      ))}
    </div>
  );
}
