import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { GAMES } from "../types";
import type { GameId } from "../api/client";
import "./GameModal.css";

interface Props {
  selected: GameId;
  onChange: (id: GameId) => void;
  onClose: () => void;
}

export function GameModal({ selected, onChange, onClose }: Props) {
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const filtered = GAMES.filter(g => g.label.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    setTimeout(() => searchRef.current?.focus(), 60);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const select = (id: GameId) => { onChange(id); onClose(); };

  return createPortal(
    <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-panel" role="dialog" aria-modal="true" aria-label="Choisir un jeu">

        <div className="modal-header">
          <span className="modal-title">Choisir un jeu</span>
          <button className="modal-close" onClick={onClose} aria-label="Fermer">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="modal-search-wrap">
          <svg className="modal-search-ico" width="14" height="14" viewBox="0 0 16 16" fill="none">
            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
          <input
            ref={searchRef}
            className="modal-search"
            placeholder="Rechercher un jeu…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="modal-list">
          {filtered.length === 0
            ? <p className="modal-none">Aucun résultat</p>
            : filtered.map(g => (
              <button key={g.id} className={`modal-item ${selected === g.id ? "active" : ""}`} onClick={() => select(g.id)}>
                <span>{g.label}</span>
                {selected === g.id && (
                  <svg className="modal-item-check" width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M1.5 6l3.5 3.5L11 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            ))
          }
        </div>

      </div>
    </div>,
    document.body
  );
}