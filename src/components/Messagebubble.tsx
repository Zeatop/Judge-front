import { useState } from "react";
import type { Message } from "../types";
import "./Messagebubble.css";

function formatContent(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part.split("\n").map((line, j, arr) => (
      <span key={`${i}-${j}`}>{line}{j < arr.length - 1 && <br />}</span>
    ));
  });
}

interface BubbleProps {
  message: Message;
  onResend?: (content: string) => void;
  onEdit?: (id: string, content: string) => void;
}

export function MessageBubble({ message, onResend, onEdit }: BubbleProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(message.content);

  const copy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const confirmEdit = () => {
    if (editVal.trim() && onEdit) onEdit(message.id, editVal.trim());
    setEditing(false);
  };

  return (
    <div className={`bubble-wrapper ${isUser ? "user" : "assistant"}`}>
      {!isUser && <div className="avatar" aria-hidden>⚖</div>}

      <div className="bubble-outer">
        {/* Bulle principale ou zone d'édition */}
        {editing ? (
          <div className="bubble-edit-wrap">
            <textarea
              className="bubble-edit-textarea"
              value={editVal}
              onChange={e => setEditVal(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); confirmEdit(); }
                if (e.key === "Escape") setEditing(false);
              }}
              autoFocus
            />
            <div className="bubble-edit-actions">
              <button className="edit-cancel" onClick={() => { setEditing(false); setEditVal(message.content); }}>Annuler</button>
              <button className="edit-confirm" onClick={confirmEdit}>Envoyer</button>
            </div>
          </div>
        ) : (
          <div className={`bubble ${isUser ? "bubble-user" : "bubble-assistant"}`}>
            <p className="bubble-text">{formatContent(message.content)}</p>
            <time className="bubble-time">
              {message.timestamp.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </time>
          </div>
        )}

        {/* Toolbar hover */}
        {!editing && (
          <div className={`bubble-toolbar ${isUser ? "toolbar-user" : "toolbar-assistant"}`}>
            <button className="tb-btn" onClick={copy} title="Copier">
              {copied
                ? <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1.5 6l3.5 3.5L11 3" stroke="#00d2ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
              }
              <span>{copied ? "Copié !" : "Copier"}</span>
            </button>

            {isUser && onResend && (
              <button className="tb-btn" onClick={() => onResend(message.content)} title="Relancer">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/>
                </svg>
                <span>Relancer</span>
              </button>
            )}

            {isUser && onEdit && (
              <button className="tb-btn" onClick={() => { setEditVal(message.content); setEditing(true); }} title="Éditer">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                <span>Éditer</span>
              </button>
            )}

            {!isUser && onResend && (
              <button className="tb-btn" onClick={() => onResend(message.content)} title="Relancer">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/>
                </svg>
                <span>Relancer</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="bubble-wrapper assistant">
      <div className="avatar" aria-hidden>⚖</div>
      <div className="bubble bubble-assistant typing">
        <span /><span /><span />
      </div>
    </div>
  );
}