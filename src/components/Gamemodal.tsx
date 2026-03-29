import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { GAMES, addGame } from "../types";
import { uploadRules } from "../api/client";
import type { GameId } from "../api/client";
import "./GameModal.css";

const LANGUAGES = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "es", label: "Español" },
  { code: "it", label: "Italiano" },
  { code: "pt", label: "Português" },
  { code: "nl", label: "Nederlands" },
  { code: "ja", label: "日本語" },
];

type View = "select" | "add";

interface Props {
  selected: GameId;
  onChange: (id: GameId) => void;
  onClose: () => void;
}

export function GameModal({ selected, onChange, onClose }: Props) {
  const [view, setView] = useState<View>("select");
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // ── Add form state ───────────────────────────────────────────────
  const [gameName, setGameName] = useState("");
  const [lang, setLang] = useState("fr");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = GAMES.filter(g =>
    g.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (view === "select") {
      setTimeout(() => searchRef.current?.focus(), 60);
    }
  }, [view]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (view === "add") setView("select");
        else onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, view]);

  const select = (id: GameId) => {
    onChange(id);
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && f.type === "application/pdf") {
      setFile(f);
      setUploadError("");
    } else if (f) {
      setUploadError("Seuls les fichiers PDF sont acceptés.");
      setFile(null);
    }
  };

  const handleUpload = useCallback(async () => {
    if (!gameName.trim()) {
      setUploadError("Le nom du jeu est requis.");
      return;
    }
    if (!file) {
      setUploadError("Sélectionne un fichier PDF.");
      return;
    }

    setUploading(true);
    setUploadError("");
    setUploadSuccess("");

    try {
      const gameId = gameName.trim().replace(/\s+/g, "_");
      const result = await uploadRules(file, gameId, lang);
      addGame(result.game_id, gameName.trim());
      setUploadSuccess(
        `${result.chunks_indexed} chunks indexés pour "${gameName.trim()}"`
      );
      // Auto-select le nouveau jeu après 1.2s
      setTimeout(() => {
        onChange(result.game_id);
        onClose();
      }, 1200);
    } catch (err: any) {
      setUploadError(err.message || "Erreur lors de l'upload.");
    } finally {
      setUploading(false);
    }
  }, [gameName, file, lang, onChange, onClose]);

  return createPortal(
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label={view === "select" ? "Choisir un jeu" : "Ajouter un jeu"}
      >
        {/* ── Header ── */}
        <div className="modal-header">
          {view === "add" ? (
            <button
              className="modal-back"
              onClick={() => {
                setView("select");
                setUploadError("");
                setUploadSuccess("");
              }}
              aria-label="Retour"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M9 2L4 7l5 5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ) : null}
          <span className="modal-title">
            {view === "select" ? "Choisir un jeu" : "Ajouter un jeu"}
          </span>
          <button className="modal-close" onClick={onClose} aria-label="Fermer">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M1 1l10 10M11 1L1 11"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {view === "select" ? (
          <>
            {/* ── Search + Add button ── */}
            <div className="modal-search-wrap">
              <svg
                className="modal-search-ico"
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
              >
                <circle
                  cx="6.5"
                  cy="6.5"
                  r="4.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
                <path
                  d="M10.5 10.5l3 3"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
              <input
                ref={searchRef}
                className="modal-search"
                placeholder="Rechercher un jeu…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button
                className="modal-add-btn"
                onClick={() => setView("add")}
                aria-label="Ajouter un jeu"
                title="Ajouter un jeu"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M7 1v12M1 7h12"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            {/* ── List ── */}
            <div className="modal-list">
              {filtered.length === 0 ? (
                <p className="modal-none">Aucun résultat</p>
              ) : (
                filtered.map((g) => (
                  <button
                    key={g.id}
                    className={`modal-item ${selected === g.id ? "active" : ""}`}
                    onClick={() => select(g.id)}
                  >
                    <span>{g.label}</span>
                    {selected === g.id && (
                      <svg
                        className="modal-item-check"
                        width="13"
                        height="13"
                        viewBox="0 0 13 13"
                        fill="none"
                      >
                        <path
                          d="M1.5 6l3.5 3.5L11 3"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                ))
              )}
            </div>
          </>
        ) : (
          /* ── Add game form ── */
          <div className="modal-form">
            {/* Nom du jeu */}
            <div className="modal-field">
              <label className="modal-label" htmlFor="game-name">
                Nom du jeu
              </label>
              <input
                id="game-name"
                className="modal-input"
                type="text"
                placeholder="Ex: Risk, 7 Wonders…"
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                autoFocus
              />
            </div>

            {/* Langue */}
            <div className="modal-field">
              <label className="modal-label" htmlFor="game-lang">
                Langue des règles
              </label>
              <select
                id="game-lang"
                className="modal-select"
                value={lang}
                onChange={(e) => setLang(e.target.value)}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Upload PDF */}
            <div className="modal-field">
              <label className="modal-label">Règles (PDF)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                hidden
              />
              <button
                className={`modal-file-btn${file ? " has-file" : ""}`}
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M7 1v8M4 6l3 3 3-3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    transform="rotate(180 7 7)"
                  />
                  <path
                    d="M1 10v2a1 1 0 001 1h10a1 1 0 001-1v-2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                {file ? file.name : "Choisir un fichier…"}
              </button>
            </div>

            {/* Error / Success */}
            {uploadError && (
              <p className="modal-error">{uploadError}</p>
            )}
            {uploadSuccess && (
              <p className="modal-success">{uploadSuccess}</p>
            )}

            {/* Submit */}
            <button
              className="modal-submit"
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <span className="modal-spinner" />
              ) : (
                "Indexer les règles"
              )}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}