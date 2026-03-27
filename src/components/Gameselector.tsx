import { useState, useRef, useEffect } from "react";
import { GAMES } from "../types";
import type { GameId } from "../api/client";
import "./GameSelector.css";

interface Props {
  selected: GameId;
  onChange: (id: GameId) => void;
  disabled?: boolean;
}

export function GameSelector({ selected, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const currentGame = GAMES.find((g) => g.id === selected)!;

  const filtered = GAMES.filter((g) =>
    g.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]);

  const handleSelect = (id: GameId) => {
    onChange(id);
    setOpen(false);
    setSearch("");
  };

  return (
    <div className="gs-container" ref={containerRef}>
      <button
        className={`gs-trigger ${open ? "open" : ""}`}
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="gs-current">{currentGame.label}</span>
        <svg className="gs-chevron" width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M2 4.5L6 8l4-3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <div className="gs-separator" aria-hidden />

      {open && (
        <div className="gs-dropdown" role="listbox">
          <div className="gs-search-wrap">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="gs-search-icon">
              <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.6"/>
              <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            <input
              ref={searchRef}
              className="gs-search"
              placeholder="Rechercher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="gs-list">
            {filtered.length === 0 ? (
              <p className="gs-empty">Aucun résultat</p>
            ) : (
              filtered.map((game) => (
                <button
                  key={game.id}
                  className={`gs-option ${selected === game.id ? "active" : ""}`}
                  onClick={() => handleSelect(game.id)}
                  role="option"
                  aria-selected={selected === game.id}
                >
                  <span className="gs-option-label">{game.label}</span>
                  {selected === game.id && (
                    <svg className="gs-check" width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <path d="M2 6.5l3.5 3.5L11 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}