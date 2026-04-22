import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { GameModal } from "./Gamemodal";
import { ModelSelector } from "./Modelselector";
import type { GameId, ModelInfo } from "../api/client";
import "./Inputbar.css";

interface Props {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
  selectedGame: GameId;
  onGameChange: (id: GameId) => void;
  models: ModelInfo[];
  selectedModel: string;
  onModelChange: (id: string) => void;
}

export function InputBar({
  value, onChange, onSubmit, disabled, placeholder,
  selectedGame, onGameChange,
  models, selectedModel, onModelChange,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 130)}px`;
  }, [value]);

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) onSubmit();
    }
  };

  const canSend = !disabled && value.trim().length > 0;

  return (
    <>
      <div className="input-bar">
        <div className="input-inner">
          <div className="input-row">
            <button
              className="input-game-btn"
              onClick={() => !disabled && setModalOpen(true)}
              disabled={disabled}
              aria-label="Choisir un jeu"
              title="Choisir un jeu"
            >
              <img src="/boardGames-white.svg" alt="" width="18" height="18" />
            </button>

            <div className="input-shell">
              <textarea
                ref={ref}
                className="input-textarea"
                value={value}
                onChange={e => onChange(e.target.value)}
                onKeyDown={onKey}
                disabled={disabled}
                placeholder={placeholder ?? "Pose ta question…"}
                rows={1}
                aria-label="Question"
              />
              <button
                className={`input-send ${canSend ? "active" : ""}`}
                onClick={onSubmit}
                disabled={!canSend}
                aria-label="Envoyer"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </div>

          <div className="input-footer">
            {models.length > 0 ? (
              <ModelSelector
                models={models}
                selected={selectedModel}
                onChange={onModelChange}
                disabled={disabled}
              />
            ) : <span />}
            <p className="input-hint">
              Entrée pour envoyer · Shift+Entrée pour nouvelle ligne
            </p>
          </div>
        </div>
      </div>

      {modalOpen && (
        <GameModal
          selected={selectedGame}
          onChange={onGameChange}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}