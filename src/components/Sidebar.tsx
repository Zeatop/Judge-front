import { useState, useEffect, useRef, useCallback } from "react";
import {
  fetchChats,
  deleteChat,
  renameChat,
  type ChatSummary,
} from "../api/client";
import "./Sidebar.css";

interface Props {
  open: boolean;
  onClose: () => void;
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
}

export function Sidebar({
  open,
  onClose,
  activeChatId,
  onSelectChat,
  onNewChat,
}: Props) {
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const editRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchChats(100);
      setChats(data);
    } catch (e) {
      console.error("Failed to load chats", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  useEffect(() => {
    if (editingId && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [editingId]);

  const filtered = chats.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  // Grouper par date
  const groups = groupByDate(filtered);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteChat(id);
      setChats((prev) => prev.filter((c) => c.id !== id));
      if (activeChatId === id) onNewChat();
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const startEdit = (chat: ChatSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(chat.id);
    setEditVal(chat.title);
  };

  const confirmEdit = async () => {
    if (!editingId || !editVal.trim()) {
      setEditingId(null);
      return;
    }
    try {
      const updated = await renameChat(editingId, editVal.trim());
      setChats((prev) =>
        prev.map((c) => (c.id === editingId ? updated : c))
      );
    } catch (err) {
      console.error("Rename failed", err);
    }
    setEditingId(null);
  };

  return (
    <>
      {/* Overlay mobile */}
      {open && <div className="sb-overlay" onClick={onClose} />}

      <aside className={`sb ${open ? "sb-open" : ""}`}>
        {/* Header */}
        <div className="sb-header">
          <span className="sb-header-title">Historique</span>
          <button className="sb-header-btn" onClick={onNewChat} title="Nouveau chat">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
          <button className="sb-header-btn sb-close-btn" onClick={onClose} title="Fermer">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M11 3L3 11M3 3l8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="sb-search-wrap">
          <svg className="sb-search-ico" width="13" height="13" viewBox="0 0 16 16" fill="none">
            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            className="sb-search"
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* List */}
        <div className="sb-list">
          {loading && chats.length === 0 ? (
            <p className="sb-empty">Chargement…</p>
          ) : filtered.length === 0 ? (
            <p className="sb-empty">
              {search ? "Aucun résultat" : "Aucune conversation"}
            </p>
          ) : (
            groups.map(([label, items]) => (
              <div key={label} className="sb-group">
                <p className="sb-group-label">{label}</p>
                {items.map((chat) => (
                  <div
                    key={chat.id}
                    className={`sb-item ${activeChatId === chat.id ? "active" : ""}`}
                    onClick={() => {
                      onSelectChat(chat.id);
                      onClose();
                    }}
                  >
                    {editingId === chat.id ? (
                      <input
                        ref={editRef}
                        className="sb-item-edit"
                        value={editVal}
                        onChange={(e) => setEditVal(e.target.value)}
                        onBlur={confirmEdit}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") confirmEdit();
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="sb-item-title">{chat.title}</span>
                    )}
                    <div className="sb-item-actions">
                      <button
                        className="sb-item-btn"
                        onClick={(e) => startEdit(chat, e)}
                        title="Renommer"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        className="sb-item-btn sb-item-btn-del"
                        onClick={(e) => handleDelete(chat.id, e)}
                        title="Supprimer"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  );
}

// ── Group chats by relative date ────────────────────────────────────

function groupByDate(chats: ChatSummary[]): [string, ChatSummary[]][] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const groups: Record<string, ChatSummary[]> = {};

  for (const chat of chats) {
    const d = new Date(chat.updated_at);
    let label: string;
    if (d >= today) label = "Aujourd'hui";
    else if (d >= yesterday) label = "Hier";
    else if (d >= weekAgo) label = "Cette semaine";
    else label = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

    if (!groups[label]) groups[label] = [];
    groups[label].push(chat);
  }

  return Object.entries(groups);
}