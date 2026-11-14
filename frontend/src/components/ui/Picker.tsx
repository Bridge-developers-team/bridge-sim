import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Option } from "../../lib/options";
import { CheckIcon, ChevronIcon, CloseIcon, SearchIcon } from "../Icons";

/**
 * Tap a row, choose from a scrollable list. On a wide screen the list opens
 * as a popover that grows out of the row you clicked; on a phone it slides up
 * as a bottom sheet. Built on <dialog>, so Escape, focus trapping and the top
 * layer come from the browser.
 */

const WIDE = "(min-width: 640px)";
const CLOSE_MS = 140;

interface SheetBase {
  title: string;
  options: Option[];
  /** Show a search box (long lists). */
  searchable?: boolean;
  /** Allow a typed value that is not in the list. */
  allowCustom?: boolean;
  /** The element the popover grows from (wide screens). */
  anchor: HTMLElement | null;
  onClose: () => void;
}

interface SingleSheet extends SheetBase {
  multiple?: false;
  value: string;
  onChange: (value: string) => void;
}

interface MultiSheet extends SheetBase {
  multiple: true;
  value: string[];
  max: number;
  onChange: (value: string[]) => void;
}

export type OptionSheetProps = SingleSheet | MultiSheet;

export function OptionSheet(props: OptionSheetProps) {
  const { title, options, searchable, allowCustom, anchor, onClose } = props;
  const dialog = useRef<HTMLDialogElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [closing, setClosing] = useState(false);
  const [place, setPlace] = useState<React.CSSProperties>({});
  const selected = props.multiple ? props.value : [props.value];

  const close = () => {
    if (closing) return;
    setClosing(true);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => {
      dialog.current?.close();
      onClose();
    }, reduce ? 0 : CLOSE_MS);
  };

  // Open as a modal, lock page scroll, and place the popover next to its row.
  useLayoutEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (matchMedia(WIDE).matches && anchor) {
      const r = anchor.getBoundingClientRect();
      const width = Math.max(r.width, 320);
      const below = window.innerHeight - r.bottom - 16;
      const above = r.top - 16;
      const openUp = below < 280 && above > below;
      const maxHeight = Math.min(440, openUp ? above - 8 : below - 8);
      setPlace({
        left: Math.min(r.left, window.innerWidth - width - 16),
        width,
        maxHeight,
        ...(openUp ? { bottom: window.innerHeight - r.top + 8 } : { top: r.bottom + 8 }),
        transformOrigin: openUp ? "bottom left" : "top left",
      });
    }
    d.showModal();
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = before;
    };
  }, [anchor]);

  useEffect(() => {
    // Focus the search box on a wide screen; on a phone that would pop the
    // keyboard over the list, so focus the chosen option instead.
    if (searchable && matchMedia(WIDE).matches) search.current?.focus();
    else dialog.current?.querySelector<HTMLButtonElement>(".opt[aria-pressed='true'], .opt")?.focus();
  }, [searchable]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const custom = allowCustom && query.trim() && !options.some((o) => o.label.toLowerCase() === query.trim().toLowerCase()) ? query.trim() : null;

  const pick = (value: string) => {
    if (props.multiple) {
      const on = props.value.includes(value);
      if (on) props.onChange(props.value.filter((v) => v !== value));
      else if (props.value.length < props.max) props.onChange([...props.value, value]);
      setQuery("");
    } else {
      props.onChange(value);
      // Let the check mark land before the sheet closes.
      window.setTimeout(close, 120);
    }
  };

  const full = props.multiple && props.value.length >= props.max;

  return (
    <dialog
      ref={dialog}
      className={`sheet ${closing ? "is-closing" : ""}`}
      style={place}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close(); // backdrop
      }}
    >
      <div className="sheet__inner">
        <header className="sheet__head">
          <span className="sheet__grip" aria-hidden="true" />
          <h2 className="sheet__title">{title}</h2>
          {props.multiple && (
            <span className="sheet__count tabular" aria-live="polite">
              {props.value.length} of {props.max}
            </span>
          )}
          <button type="button" className="icon-btn" aria-label="Close" onClick={close}>
            <CloseIcon />
          </button>
        </header>

        {searchable && (
          <label className="sheet__search">
            <SearchIcon />
            <input
              ref={search}
              type="search"
              value={query}
              placeholder={allowCustom ? "Search or type your own" : "Search"}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const first = shown[0]?.value ?? custom;
                  if (first) pick(first);
                }
              }}
              aria-label={`Search ${title.toLowerCase()}`}
            />
          </label>
        )}

        <div className="sheet__list" role="group" aria-label={title}>
          {shown.map((o) => {
            const on = selected.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                className="opt"
                aria-pressed={on}
                disabled={!on && Boolean(full)}
                onClick={() => pick(o.value)}
              >
                <span>{o.label}</span>
                <span className="opt__check" aria-hidden="true">
                  <CheckIcon />
                </span>
              </button>
            );
          })}
          {props.multiple &&
            props.value
              .filter((v) => !options.some((o) => o.value === v))
              .map((v) => (
                <button key={v} type="button" className="opt" aria-pressed onClick={() => pick(v)}>
                  <span>{v}</span>
                  <span className="opt__check" aria-hidden="true">
                    <CheckIcon />
                  </span>
                </button>
              ))}
          {custom && (
            <button type="button" className="opt opt--custom" disabled={Boolean(full)} onClick={() => pick(custom)}>
              <span>
                Use “<strong>{custom}</strong>”
              </span>
            </button>
          )}
          {shown.length === 0 && !custom && <p className="sheet__empty muted small">Nothing matches “{query}”.</p>}
        </div>

        {props.multiple && (
          <footer className="sheet__foot">
            <span className="muted small">{full ? `That's ${props.max}. Remove one to pick another.` : `Pick up to ${props.max}.`}</span>
            <button type="button" className="btn btn--primary" onClick={close}>
              Done
            </button>
          </footer>
        )}
      </div>
    </dialog>
  );
}

type PickerProps = Omit<SingleSheet, "anchor" | "onClose"> | Omit<MultiSheet, "anchor" | "onClose">;

/** One settings row: label, current value, chevron. Opens an OptionSheet. */
export function Picker(props: PickerProps & { label: string; placeholder?: string; display?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const row = useRef<HTMLButtonElement>(null);
  const labelOf = (v: string) => props.options.find((o) => o.value === v)?.label ?? v;
  const text = props.display ?? (props.multiple ? props.value.map(labelOf).join(", ") : props.value ? labelOf(props.value) : "");

  return (
    <>
      <button
        ref={row}
        type="button"
        className="setting"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span className="setting__label">{props.label}</span>
        <span className={`setting__value ${text ? "" : "is-empty"}`}>{text || props.placeholder || "Choose"}</span>
        <span className="setting__chev" aria-hidden="true">
          <ChevronIcon />
        </span>
      </button>
      {open && (
        <OptionSheet
          {...({
            ...props,
            anchor: row.current,
            onClose: () => {
              setOpen(false);
              row.current?.focus();
            },
          } as OptionSheetProps)}
        />
      )}
    </>
  );
}
