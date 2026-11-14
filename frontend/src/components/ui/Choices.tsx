import { useId } from "react";

/** Tap-to-choose instead of typing: a row of pills that scrolls sideways on a
 * phone. Single choice behaves like radios, multiple like checkboxes. */
export function Choices<T extends string | number>({
  label,
  options,
  value,
  onChange,
  hint,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  hint?: string;
}) {
  const id = useId();
  return (
    <fieldset className="choices">
      <legend className="field__label" id={id}>
        {label}
      </legend>
      <div className="choices__row" role="radiogroup" aria-labelledby={id}>
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            className={`chip ${o.value === value ? "chip--on" : ""}`}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
      {hint && <p className="field__hint">{hint}</p>}
    </fieldset>
  );
}

export function MultiChoices({
  label,
  options,
  value,
  onChange,
  max,
  hint,
}: {
  label: string;
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  max: number;
  hint?: string;
}) {
  const toggle = (option: string) => {
    if (value.includes(option)) onChange(value.filter((v) => v !== option));
    else if (value.length < max) onChange([...value, option]);
  };
  return (
    <fieldset className="choices">
      <legend className="field__label">{label}</legend>
      <div className="choices__row">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            aria-pressed={value.includes(o)}
            className={`chip ${value.includes(o) ? "chip--on" : ""}`}
            onClick={() => toggle(o)}
          >
            {o}
          </button>
        ))}
      </div>
      {hint && <p className="field__hint">{hint}</p>}
    </fieldset>
  );
}
