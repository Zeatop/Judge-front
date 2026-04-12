import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { GAMES } from "../types";
import type { GameId } from "../api/client";
import "./Gameselector.css";

interface Props {
  selected: GameId;
  onChange: (id: GameId) => void;
  disabled?: boolean;
}

export function GameSelector({ selected, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const current = GAMES.find((g) => g.id === selected)!;
  const filtered = GAMES.filter((g) => g.label.toLowerCase().includes(search.toLowerCase()));

  // Calculer la position du dropdown par rapport au bouton
  const openDropdown = () => {
    if (disabled || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.top - 8, left: r.left, width: Math.max(r.width, 200) });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      const target = e.target as Node;
      const dropdown = document.getElementById("gs-portal-dropdown");
      if (!btnRef.current?.contains(target) && !dropdown?.contains(target)) {
        setOpen(false); setSearch("");
      }
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 40);
  }, [open]);

  const select = (id: GameId) => { onChange(id); setOpen(false); setSearch(""); };

  const dropdown = open && createPortal(
    <div
      id="gs-portal-dropdown"
      className="gs-dropdown"
      style={{ position: "fixed", bottom: `calc(100vh - ${pos.top}px)`, left: pos.left, minWidth: 200 }}
    >
      <div className="gs-search-row">
        <svg className="gs-search-ico" width="12" height="12" viewBox="0 0 16 16" fill="none">
          <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.6"/>
          <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
        <input ref={searchRef} className="gs-search-input" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="gs-list">
        {filtered.length === 0
          ? <p className="gs-none">Aucun résultat</p>
          : filtered.map(g => (
            <button key={g.id} className={`gs-item ${selected === g.id ? "active" : ""}`} onClick={() => select(g.id)}>
              <span>{g.label}</span>
              {selected === g.id && (
                <svg className="gs-check" width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1.5 6l3.5 3.5L10.5 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          ))
        }
      </div>
    </div>,
    document.body
  );

  return (
    <div className="gs-wrap">
      <button ref={btnRef} className={`gs-btn ${open ? "open" : ""}`} onClick={openDropdown} disabled={disabled}>
        <span className="gs-label">{current.label}</span>
        <svg className="gs-chevron" width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M1.5 3.5L5 7l3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {dropdown}
    </div>
  );
}