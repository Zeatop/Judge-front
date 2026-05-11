import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { GameModal } from "./Gamemodal";
import { ModelSelector } from "./Modelselector";
import { CardChip, type CardChipHandle } from "./CardChip";
import type { GameId, ModelInfo } from "../api/client";
import "./Inputbar.css";

// ── Segment model ──────────────────────────────────────────────────────────

let _uid = 0;
function newId() { return `seg-${Date.now()}-${++_uid}`; }

type TextSeg = { type: "text"; id: string; value: string };
type CardSeg = { type: "card"; id: string; name: string };
type Segment = TextSeg | CardSeg;
type FocusableInput = HTMLInputElement | HTMLTextAreaElement;

function parseSegments(text: string): Segment[] {
  if (!text) return [{ type: "text", id: newId(), value: "" }];
  const parts = text.split(/(\[\[[^\]]*\]\])/);
  const segs: Segment[] = parts
    .filter(p => p !== "")
    .map(p => {
      const m = p.match(/^\[\[([^\]]*)\]\]$/);
      return m
        ? ({ type: "card", id: newId(), name: m[1] } as CardSeg)
        : ({ type: "text", id: newId(), value: p } as TextSeg);
    });
  if (segs[0]?.type !== "text") segs.unshift({ type: "text", id: newId(), value: "" });
  if (segs[segs.length - 1]?.type !== "text") segs.push({ type: "text", id: newId(), value: "" });
  return segs;
}

function serializeSegments(segs: Segment[]): string {
  return segs.map(s => s.type === "text" ? s.value : `[[${s.name}]]`).join("");
}

// Focus the mapped DOM element after React has committed
function requestFocus(map: React.RefObject<Map<string, FocusableInput | CardChipHandle>>, id: string) {
  setTimeout(() => {
    const el = map.current.get(id);
    if (el && "focus" in el) el.focus();
  }, 0);
}

// ── ResizingInput ──────────────────────────────────────────────────────────

interface ResizingInputProps {
  value: string;
  placeholder?: string;
  disabled?: boolean;
  onChange: (v: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  inputRef?: (el: FocusableInput | null) => void;
  isLast: boolean;
}

function ResizingInput({ value, placeholder, disabled, onChange, onKeyDown, inputRef, isLast }: ResizingInputProps) {
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow the textarea to fit its content
  useEffect(() => {
    if (!isLast || !taRef.current) return;
    taRef.current.style.height = "auto";
    taRef.current.style.height = `${taRef.current.scrollHeight}px`;
  }, [value, isLast]);

  if (isLast) {
    return (
      <textarea
        ref={el => {
          (taRef as { current: HTMLTextAreaElement | null }).current = el;
          inputRef?.(el);
        }}
        className="resizing-textarea"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => onKeyDown(e as unknown as KeyboardEvent<HTMLInputElement>)}
        aria-label="Question"
      />
    );
  }

  return (
    <span className="resizing-wrap">
      <span className="resizing-sizer" aria-hidden="true">{value || " "}</span>
      <input
        ref={el => inputRef?.(el)}
        className="resizing-input"
        value={value}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
        onKeyDown={onKeyDown}
      />
    </span>
  );
}

// ── InputBar ───────────────────────────────────────────────────────────────

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
  const [segments, setSegments] = useState<Segment[]>(() => parseSegments(value));
  const [allSelected, setAllSelected] = useState(false);

  const focusMap = useRef<Map<string, FocusableInput | CardChipHandle>>(new Map());

  const mtgMode = selectedGame === "mtg";
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  // Sync external value changes (onSuggest, reset after send)
  const prevValue = useRef(value);
  useEffect(() => {
    if (value !== prevValue.current) {
      prevValue.current = value;
      setSegments(parseSegments(value));
    }
  }, [value]);

  // Notify parent when segments change
  useEffect(() => {
    const s = serializeSegments(segments);
    if (s !== prevValue.current) {
      prevValue.current = s;
      onChangeRef.current(s);
    }
  }, [segments]);

  // Deselect on click outside the rich input
  useEffect(() => {
    if (!allSelected) return;
    const fn = () => setAllSelected(false);
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [allSelected]);

  // ── Text segment handlers ──

  const handleTextChange = useCallback((id: string, newVal: string) => {
    setSegments(prev => prev.map(s => s.id === id && s.type === "text" ? { ...s, value: newVal } : s));
  }, []);

  const selectAll = useCallback(() => setAllSelected(true), []);

  const clearAll = useCallback(() => {
    const id = newId();
    setSegments([{ type: "text", id, value: "" }]);
    setAllSelected(false);
    requestFocus(focusMap, id);
  }, []);

  const handleTextKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>, seg: TextSeg, idx: number) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      setAllSelected(false);
      if (!disabled && serializeSegments(segments).trim()) onSubmitRef.current();
      return;
    }

    // Ctrl+A / Cmd+A → select all
    if (e.key === "a" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setAllSelected(true);
      return;
    }

    // When everything is selected
    if (allSelected) {
      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        clearAll();
        return;
      }
      if (e.key === "c" && (e.ctrlKey || e.metaKey)) {
        navigator.clipboard.writeText(serializeSegments(segments));
        setAllSelected(false);
        return;
      }
      if (e.key === "x" && (e.ctrlKey || e.metaKey)) {
        navigator.clipboard.writeText(serializeSegments(segments));
        clearAll();
        return;
      }
      if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1) {
        const id = newId();
        setSegments([{ type: "text", id, value: e.key }]);
        setAllSelected(false);
        setTimeout(() => {
          const el = focusMap.current.get(id) as FocusableInput | undefined;
          if (el) { el.focus(); el.setSelectionRange(1, 1); }
        }, 0);
        return;
      }
      setAllSelected(false);
      return;
    }

    // Backspace at start of text segment when prev is a chip → focus the chip
    if (e.key === "Backspace" && seg.value === "" && idx > 0) {
      const prev = segments[idx - 1];
      if (prev.type === "card") {
        e.preventDefault();
        requestFocus(focusMap, prev.id);
        return;
      }
    }

    // ArrowRight at end of text → skip over next chip to the text segment after it
    if (e.key === "ArrowRight") {
      const el = e.currentTarget;
      if (el.selectionStart === seg.value.length && el.selectionEnd === seg.value.length) {
        const next = segments[idx + 1];
        if (next?.type === "card") {
          const afterChip = segments[idx + 2];
          if (afterChip?.type === "text") {
            e.preventDefault();
            const target = focusMap.current.get(afterChip.id) as FocusableInput | undefined;
            if (target && "setSelectionRange" in target) {
              target.focus();
              target.setSelectionRange(0, 0);
            }
          }
        }
      }
    }

    // ArrowLeft at start of text → skip over prev chip to the text segment before it
    if (e.key === "ArrowLeft") {
      const el = e.currentTarget;
      if (el.selectionStart === 0 && el.selectionEnd === 0) {
        const prev = segments[idx - 1];
        if (prev?.type === "card") {
          const beforeChip = segments[idx - 2];
          if (beforeChip?.type === "text") {
            e.preventDefault();
            const target = focusMap.current.get(beforeChip.id) as FocusableInput | undefined;
            if (target && "setSelectionRange" in target) {
              target.focus();
              target.setSelectionRange(target.value.length, target.value.length);
            }
          }
        }
      }
    }

    if (!mtgMode) return;

    // Detect [[ at cursor position
    if (e.key === "[") {
      const cursorPos = e.currentTarget.selectionStart ?? seg.value.length;
      if (seg.value.slice(0, cursorPos).endsWith("[")) {
        e.preventDefault();
        const before = seg.value.slice(0, cursorPos - 1);
        const after = seg.value.slice(cursorPos);
        const newCard: CardSeg = { type: "card", id: newId(), name: "" };
        const afterText: TextSeg = { type: "text", id: newId(), value: after };
        setSegments(prev => [
          ...prev.slice(0, idx),
          { ...seg, value: before },
          newCard,
          afterText,
          ...prev.slice(idx + 1),
        ]);
        requestFocus(focusMap, newCard.id);
      }
    }
  }, [segments, allSelected, disabled, mtgMode, clearAll]);

  // ── Card chip handlers ──

  const handleChipChange = useCallback((id: string, name: string) => {
    setSegments(prev => prev.map(s => s.id === id && s.type === "card" ? { ...s, name } : s));
  }, []);

  const handleChipConfirm = useCallback((id: string, name: string) => {
    setSegments(prev => {
      const updated = prev.map(s => s.id === id && s.type === "card" ? { ...s, name } : s);
      const chipIdx = updated.findIndex(s => s.id === id);
      const next = updated[chipIdx + 1];
      if (next?.type === "text") requestFocus(focusMap, next.id);
      return updated;
    });
  }, []);

  const handleChipDelete = useCallback((id: string) => {
    setSegments(prev => {
      const idx = prev.findIndex(s => s.id === id);
      if (idx === -1) return prev;
      const before = prev[idx - 1] as TextSeg | undefined;
      const after = prev[idx + 1] as TextSeg | undefined;

      let result: Segment[];
      if (before?.type === "text" && after?.type === "text") {
        const merged: TextSeg = { type: "text", id: before.id, value: before.value + after.value };
        result = [...prev.slice(0, idx - 1), merged, ...prev.slice(idx + 2)];
      } else {
        result = prev.filter(s => s.id !== id);
      }

      if (before) requestFocus(focusMap, before.id);
      return result;
    });
  }, []);

  const serialized = serializeSegments(segments);
  const canSend = !disabled && serialized.trim().length > 0;

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

            <div
              className="input-shell"
              onClick={e => {
                if (e.target === e.currentTarget) {
                  const last = [...segments].reverse().find(s => s.type === "text");
                  if (last) requestFocus(focusMap, last.id);
                }
              }}
            >
              <div className={`input-rich${allSelected ? " all-selected" : ""}`} role="textbox" aria-multiline="true" aria-label="Question">
                {segments.map((seg, idx) =>
                  seg.type === "text" ? (
                    <ResizingInput
                      key={seg.id}
                      value={seg.value}
                      placeholder={idx === 0 ? (placeholder ?? "Pose ta question…") : undefined}
                      disabled={disabled}
                      isLast={idx === segments.length - 1}
                      onChange={v => handleTextChange(seg.id, v)}
                      onKeyDown={e => handleTextKeyDown(e, seg, idx)}
                      inputRef={el => {
                        if (el) focusMap.current.set(seg.id, el);
                        else focusMap.current.delete(seg.id);
                      }}
                    />
                  ) : (
                    <CardChip
                      key={seg.id}
                      ref={handle => {
                        if (handle) focusMap.current.set(seg.id, handle);
                        else focusMap.current.delete(seg.id);
                      }}
                      name={seg.name}
                      onChange={name => handleChipChange(seg.id, name)}
                      onConfirm={name => handleChipConfirm(seg.id, name)}
                      onDelete={() => handleChipDelete(seg.id)}
                      onSelectAll={selectAll}
                    />
                  )
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
              <ModelSelector
                models={models}
                selected={selectedModel}
                onChange={onModelChange}
                disabled={disabled}
              />
            ) : <span />}
            <p className="input-hint">
              {mtgMode ? "Tape [[ pour référencer une carte · " : ""}Entrée pour envoyer
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
