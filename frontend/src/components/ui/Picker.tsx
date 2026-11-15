import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { rankOptions, type Option } from "../../lib/options";
import { CheckIcon, ChevronIcon, SearchIcon } from "../Icons";

/**
 * Tap a row, choose from a list that unfolds right under it. No pop-up
 * window: the page keeps scrolling, nothing covers the screen, and only one
 * list is open at a time. Escape closes it and returns focus to the row.
 */

// One open list at a time, across the page.
let openId: string | null = null;
const listeners = new Set<() => void>();
function setOpen(id: string | null) {
  openId = id;
  listeners.forEach((l) => l());
}
function useOpenId() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => openId,
  );
}

const CLOSE_MS = 160;

interface ListBase {
  title: string;
  options: Option[];
  /** Show a search box (long lists). */
  searchable?: boolean;
  /** Allow a typed value that is not in the list. */
  allowCustom?: boolean;
  /** Ask the server for options as the user types (e.g. cities of a country). */
  remote?: (query: string) => Promise<string[]>;
  onClose: () => void;
}

/** Long lists render at most this many matches; typing narrows them. */
const SHOWN_MAX = 80;

interface SingleList extends ListBase {
  multiple?: false;
  value: string;
  onChange: (value: string) => void;
}

interface MultiList extends ListBase {
  multiple: true;
  value: string[];
  max: number;
  onChange: (value: string[]) => void;
}

export type OptionListProps = SingleList | MultiList;

/** The unfolding list itself. Render it where it should appear. */
export function OptionList(props: OptionListProps) {
  const { title, searchable, allowCustom, onClose, remote } = props;
  const [remoteOptions, setRemoteOptions] = useState<Option[] | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [closing, setClosing] = useState(false);
  const selected = props.multiple ? props.value : [props.value];

  const close = () => {
    if (closing) return;
    setClosing(true);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(onClose, reduce ? 0 : CLOSE_MS);
  };

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    // Bring the whole list into view without jumping the page.
    window.setTimeout(() => el.scrollIntoView({ block: "nearest", behavior: "smooth" }), 60);
    if (searchable && matchMedia("(min-width: 640px)").matches) search.current?.focus({ preventScroll: true });
  }, [searchable]);

  // Server-side options: refetch shortly after typing stops.
  useEffect(() => {
    if (!remote) return;
    let live = true;
    const t = window.setTimeout(() => {
      remote(query)
        .then((names) => live && setRemoteOptions(names.map((n) => ({ value: n, label: n }))))
        .catch(() => live && setRemoteOptions([]));
    }, query ? 160 : 0);
    return () => {
      live = false;
      window.clearTimeout(t);
    };
  }, [remote, query]);

  const options = remote ? (remoteOptions ?? []) : props.options;
  const ranked = useMemo(() => (remote ? options : rankOptions(options, query)), [options, query, remote]);
  const shown = ranked.slice(0, SHOWN_MAX);
  const more = ranked.length - shown.length;

  const custom =
    allowCustom && query.trim() && !options.some((o) => o.label.toLowerCase() === query.trim().toLowerCase()) ? query.trim() : null;

  const pick = (value: string) => {
    if (props.multiple) {
      const on = props.value.includes(value);
      if (on) props.onChange(props.value.filter((v) => v !== value));
      else if (props.value.length < props.max) props.onChange([...props.value, value]);
      setQuery("");
    } else {
      props.onChange(value);
      // Let the check mark land before the list folds away.
      window.setTimeout(close, 140);
    }
  };

  const full = props.multiple && props.value.length >= props.max;

  return (
    <div
      ref={box}
      className={`picklist ${closing ? "is-closing" : ""}`}
      role="group"
      aria-label={title}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          close();
        }
      }}
    >
      {searchable && (
        <label className="picklist__search">
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

      <div className="picklist__options">
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
        {more > 0 && <p className="picklist__more muted small">{more.toLocaleString("en-US")} more. Keep typing to narrow the list.</p>}
        {remote && remoteOptions === null && <p className="picklist__empty muted small">Loading…</p>}
        {shown.length === 0 && !custom && (remoteOptions !== null || !remote) && (
          <p className="picklist__empty muted small">{query ? `Nothing matches “${query}”.` : "Nothing to choose here."}</p>
        )}
      </div>

      {props.multiple && (
        <div className="picklist__foot">
          <span className="muted small tabular" aria-live="polite">
            {full ? `${props.value.length} of ${props.max} chosen. Remove one to pick another.` : `${props.value.length} of ${props.max} chosen`}
          </span>
          <button type="button" className="btn btn--primary btn--sm" onClick={close}>
            Done
          </button>
        </div>
      )}
    </div>
  );
}

type PickerProps = Omit<SingleList, "onClose"> | Omit<MultiList, "onClose">;

/** One settings row: label, current value, chevron. Its list unfolds below. */
export function Picker(props: PickerProps & { label: string; placeholder?: string; display?: ReactNode }) {
  const id = useId();
  const open = useOpenId() === id;
  const row = useRef<HTMLButtonElement>(null);
  const labelOf = (v: string) => props.options.find((o) => o.value === v)?.label ?? v;
  const text = props.display ?? (props.multiple ? props.value.map(labelOf).join(", ") : props.value ? labelOf(props.value) : "");

  // Close this list if the row unmounts while open.
  useEffect(() => () => {
    if (openId === id) setOpen(null);
  }, [id]);

  return (
    <div className={`setting-wrap ${open ? "is-open" : ""}`}>
      <button
        ref={row}
        type="button"
        className="setting"
        aria-expanded={open}
        onClick={() => setOpen(open ? null : id)}
      >
        <span className="setting__label">{props.label}</span>
        <span className={`setting__value ${text ? "" : "is-empty"}`}>{text || props.placeholder || "Choose"}</span>
        <span className="setting__chev" aria-hidden="true">
          <ChevronIcon />
        </span>
      </button>
      {open && (
        <OptionList
          {...({
            ...props,
            onClose: () => {
              if (openId === id) setOpen(null);
              row.current?.focus({ preventScroll: true });
            },
          } as OptionListProps)}
        />
      )}
    </div>
  );
}
