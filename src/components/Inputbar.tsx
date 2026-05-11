import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { GameModal } from "./Gamemodal";
import { ModelSelector } from "./Modelselector";
import type { GameId, ModelInfo } from "../api/client";
import "./Inputbar.css";

async function fetchCardSuggestions(query: string, signal: AbortSignal): Promise<string[]> {
  const res = await fetch(
    `https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(query)}`,
    { signal }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.data as string[]) ?? [];
}

function getActiveQuery(text: string, cursor: number): string | null {
  const before = text.slice(0, cursor);
  const match = before.match(/\[\[([^\]]*)$/);
  return match ? match[1] : null;
}

// Render the overlay: plain text + styled [[card]] chips
function renderOverlay(text: string): React.ReactNode[] {
  return text.split(/(\[\[[^\]]*\]\])/).map((part, i) => {
    const m = part.match(/^\[\[([^\]]*)\]\]$/);
    if (m) {
      return (
        <span key={i} className="ov-chip">
          <span className="ov-brack">[[</span>
          <span className="ov-name">{m[1]}</span>
          <span className="ov-brack">]]</span>
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

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
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [dropOpen, setDropOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ bottom: 0, left: 0, width: 0 });
  const [cursor, setCursor] = useState(0);

  const ref = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const isUserInput = useRef(false);
  const mtgMode = selectedGame === "mtg";

  // Auto-grow textarea
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  // Sync overlay scroll with textarea scroll
  const syncScroll = useCallback(() => {
    if (overlayRef.current && ref.current) {
      overlayRef.current.scrollTop = ref.current.scrollTop;
    }
  }, []);

  // Focus + cursor when value is set externally (not from user typing)
  const prevValue = useRef(value);
  useEffect(() => {
    if (value !== prevValue.current) {
      prevValue.current = value;
      if (!isUserInput.current) {
        setTimeout(() => {
          if (!ref.current) return;
          ref.current.focus();
          ref.current.setSelectionRange(value.length, value.length);
        }, 0);
      }
      isUserInput.current = false;
    }
  }, [value]);

  // Scryfall autocomplete
  useEffect(() => {
    if (!mtgMode) { setDropOpen(false); return; }
    const query = getActiveQuery(value, cursor);
    if (!query || query.length < 4) { setDropOpen(false); setSuggestions([]); return; }

    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const results = await fetchCardSuggestions(query, ctrl.signal);
        setSuggestions(results);
        if (results.length > 0 && shellRef.current) {
          const r = shellRef.current.getBoundingClientRect();
          setDropPos({ bottom: window.innerHeight - r.top + 4, left: r.left, width: r.width });
          setDropOpen(true);
        } else {
          setDropOpen(false);
        }
      } catch { /* aborted */ }
    }, 500);

    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [value, cursor, mtgMode]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropOpen) return;
    const fn = (e: MouseEvent) => {
      if (!shellRef.current?.contains(e.target as Node)) setDropOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [dropOpen]);

  const selectCard = useCallback((cardName: string) => {
    const before = value.slice(0, cursor);
    const after = value.slice(cursor);
    const newBefore = before.replace(/\[\[([^\]]*)$/, `[[${cardName}]]`);
    const newValue = newBefore + after;
    onChange(newValue);
    setDropOpen(false);
    setSuggestions([]);
    setTimeout(() => {
      if (!ref.current) return;
      ref.current.focus();
      ref.current.setSelectionRange(newBefore.length, newBefore.length);
    }, 0);
  }, [value, cursor, onChange]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    isUserInput.current = true;
    onChange(e.target.value);
    setCursor(e.target.selectionStart ?? e.target.value.length);
  };

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    setCursor((e.target as HTMLTextAreaElement).selectionStart ?? 0);
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) onSubmit();
      return;
    }
    if (e.key === "Escape") setDropOpen(false);
    setCursor(e.currentTarget.selectionStart ?? 0);
  };

  const canSend = !disabled && value.trim().length > 0;
  const hasChips = mtgMode && /\[\[/.test(value);

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

            <div ref={shellRef} className="input-shell">
              <div className="input-textarea-wrap">
                <textarea
                  ref={ref}
                  className={`input-textarea${hasChips ? " has-chips" : ""}`}
                  value={value}
                  onChange={handleChange}
                  onSelect={handleSelect}
                  onKeyDown={onKey}
                  onScroll={syncScroll}
                  disabled={disabled}
                  placeholder={placeholder ?? "Pose ta question…"}
                  rows={1}
                  aria-label="Question"
                />
                {hasChips && (
                  <div ref={overlayRef} className="input-overlay" aria-hidden="true">
                    {renderOverlay(value)}
                  </div>
                )}
              </div>

              <button
                className={`input-send ${canSend ? "active" : ""}`}
                onClick={onSubmit}
                disabled={!canSend}
                aria-label="Envoyer"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>

          <div className="input-footer">
            {models.length > 0 ? (
              <ModelSelector models={models} selected={selectedModel} onChange={onModelChange} disabled={disabled} />
            ) : <span />}
            <p className="input-hint">
              {mtgMode ? "Tape [[ pour référencer une carte · " : ""}Entrée · Shift+Entrée pour nouvelle ligne
            </p>
          </div>
        </div>
      </div>

      {dropOpen && createPortal(
        <ul
          className="card-ac-dropdown"
          style={{ position: "fixed", bottom: dropPos.bottom, left: dropPos.left, width: dropPos.width }}
        >
          {suggestions.map(s => (
            <li key={s}>
              <button
                className="card-ac-item"
                onMouseDown={e => { e.preventDefault(); selectCard(s); }}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>,
        document.body
      )}

      {modalOpen && (
        <GameModal selected={selectedGame} onChange={onGameChange} onClose={() => setModalOpen(false)} />
      )}
    </>
  );
}
