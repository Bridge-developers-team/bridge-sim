import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Variant carries the OUTCOME of the action, so the consequence is readable
 * before the click (DESIGN_SPEC.md §9):
 *
 *   primary  — move forward: create, save, send
 *   default  — neutral
 *   subtle   — tertiary, quiet
 *   ghost    — icon-only in a toolbar
 *   success  — a positive decision: approve, open the door
 *   danger   — irreversible and negative: delete, revoke
 *
 * Picking a variant for how it looks rather than what it does is the one way
 * to get this wrong.
 */
export type ButtonVariant =
  | "primary"
  | "default"
  | "subtle"
  | "ghost"
  | "success"
  | "danger";

export type ButtonSize = "default" | "sm";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Square, no label. Requires `aria-label`. */
  iconOnly?: boolean;
  /** Shows a spinner and blocks the click while a mutation is in flight. */
  loading?: boolean;
  children?: ReactNode;
}

export function buttonClass(
  variant: ButtonVariant = "default",
  size: ButtonSize = "default",
  iconOnly = false,
  className?: string,
): string {
  return [
    "btn",
    `btn--${variant}`,
    size === "sm" ? "btn--sm" : "",
    iconOnly ? "btn--icon" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function Button({
  variant = "default",
  size = "default",
  iconOnly = false,
  loading = false,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={buttonClass(variant, size, iconOnly, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <svg
      className="btn__spinner"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  );
}
