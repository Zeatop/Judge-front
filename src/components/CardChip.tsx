import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./CardChip.css";

async function fetchSuggestions(query: string, signal: AbortSignal): Promise<string[]> {
  const res = await fetch(
    `https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(query)}`,
    { signal }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.data as string[]) ?? [];
}

interface Props {
  name: string;
  onChange: (name: string) => void;
  onConfirm: (name: string) => void;
  onDelete: () => void;
  onSelectAll: () => void;
}

export interface CardChipHandle {
  focus(): void;
}

export const CardChip = forwardRef<CardChipHandle, Props>(
  function CardChip({ name, onChange, onConfirm, onDelete, onSelectAll }, ref) {
    const inputRef = useRef<HTMLInputElement>(null);
    const chipRef = useRef<HTMLSpanElement>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [open, setOpen] = useState(false);
    const [dropPos, setDropPos] = useState({ bottom: 0, left: 0, minWidth: 0 });

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
    }));

    // Debounced Scryfall autocomplete
    useEffect(() => {
      if (name.length < 4) {
        setSuggestions([]);
        setOpen(false);
        return;
      }
      const ctrl = new AbortController();
      const timer = setTimeout(async () => {
        try {
          const results = await fetchSuggestions(name, ctrl.signal);
          setSuggestions(results);
          if (results.length > 0 && chipRef.current) {
            const r = chipRef.current.getBoundingClientRect();
            setDropPos({ bottom: window.innerHeight - r.top + 4, left: r.left, minWidth: Math.max(r.width, 220) });
            setOpen(true);
          } else {
            setOpen(false);
          }
        } catch {
          // aborted or network error — silently ignore
        }
      }, 500);
      return () => {
        clearTimeout(timer);
        ctrl.abort();
      };
    }, [name]);

    // Close dropdown on outside click
    useEffect(() => {
      if (!open) return;
      const fn = (e: MouseEvent) => {
        if (!chipRef.current?.contains(e.target as Node)) setOpen(false);
      };
      document.addEventListener("mousedown", fn);
      return () => document.removeEventListener("mousedown", fn);
    }, [open]);

    const confirm = (cardName: string) => {
      setOpen(false);
      onConfirm(cardName);
    };

    return (
      <span ref={chipRef} className="card-chip">
        <span className="chip-inner">
          <span className="chip-sizer" aria-hidden="true">{name || "nom de carte…"}</span>
          <input
            ref={inputRef}
            className="chip-input"
            value={name}
            placeholder="nom de carte…"
            onChange={e => onChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") { e.preventDefault(); confirm(name); }
              if (e.key === "Backspace" && name === "") { e.preventDefault(); onDelete(); }
              if (e.key === "Escape") setOpen(false);
              if (e.key === "a" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); onSelectAll(); }
            }}
          />
        </span>

        {open && createPortal(
          <ul
            className="chip-dropdown"
            style={{ position: "fixed", bottom: dropPos.bottom, left: dropPos.left, minWidth: dropPos.minWidth }}
          >
            {suggestions.map(s => (
              <li key={s}>
                <button
                  className="chip-suggestion"
                  onMouseDown={e => { e.preventDefault(); confirm(s); }}
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>,
          document.body
        )}
      </span>
    );
  }
);
