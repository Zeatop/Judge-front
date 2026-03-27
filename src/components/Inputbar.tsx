import { useRef, useEffect, type KeyboardEvent } from "react";
import { GameSelector } from "./Gameselector";
import type { GameId } from "../api/client";
import "./InputBar.css";

interface Props {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
  selectedGame: GameId;
  onGameChange: (id: GameId) => void;
}

export function InputBar({ value, onChange, onSubmit, disabled, placeholder, selectedGame, onGameChange }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [value]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) onSubmit();
    }
  };

  const canSend = !disabled && value.trim().length > 0;

  return (
    <div className="input-bar">
      <div className="input-inner">
        <div className="input-row">
          {/* Dropdown jeu — à gauche, partage la bordure */}
          <GameSelector
            selected={selectedGame}
            onChange={onGameChange}
            disabled={disabled}
          />

          {/* Zone texte */}
          <textarea
            ref={textareaRef}
            className="input-textarea"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={placeholder ?? "Pose ta question…"}
            rows={1}
            aria-label="Question"
          />

          {/* Bouton envoi */}
          <button
            className={`send-btn ${canSend ? "ready" : ""}`}
            onClick={onSubmit}
            disabled={!canSend}
            aria-label="Envoyer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <p className="input-hint">Entrée pour envoyer · Shift+Entrée pour saut de ligne</p>
      </div>
    </div>
  );
}