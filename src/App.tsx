import { useState, useCallback, useEffect } from "react";
import type { GameId, ModelInfo } from "./api/client";
import { askQuestion, fetchChat, fetchModels } from "./api/client";
import { GAMES } from "./types";
import type { Message } from "./types";
import { ChatWindow } from "./components/Chatwindow";
import { InputBar } from "./components/Inputbar";
import { UserMenu } from "./components/Usermenu";
import { Sidebar } from "./components/Sidebar";
import { useAuth, LoginPage, AuthCallback } from "./auth";
import "./App.css";

const MODEL_STORAGE_KEY = "judge_ai_model";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function useRoute(): "callback" | "app" {
  const path = window.location.pathname;
  if (path === "/auth/callback") return "callback";
  return "app";
}

export default function App() {
  const { user, loading } = useAuth();
  const route = useRoute();

  const [game, setGame] = useState<GameId>("mtg");
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Chat state ──
  const [chatId, setChatId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Models ──
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [modelId, setModelId] = useState<string>(
    () => localStorage.getItem(MODEL_STORAGE_KEY) ?? ""
  );

  const currentGame = GAMES.find((g) => g.id === game)!;

  // ── Fetch available models once authenticated ──
  useEffect(() => {
    if (!user) return;
    fetchModels()
      .then((res) => {
        setModels(res.models);
        // Si aucun choix enregistré ou choix invalide, prendre le défaut backend
        setModelId((prev) => {
          if (prev && res.models.some((m) => m.id === prev)) return prev;
          return res.default;
        });
      })
      .catch((e) => console.error("Failed to load models", e));
  }, [user]);

  // ── Persist model choice ──
  useEffect(() => {
    if (modelId) localStorage.setItem(MODEL_STORAGE_KEY, modelId);
  }, [modelId]);

  // ── Send question ──
  const sendQuestion = useCallback(
    async (question: string) => {
      if (!question.trim() || isLoading) return;
      const userMsg: Message = {
        id: uid(),
        role: "user",
        content: question,
        timestamp: new Date(),
      };
      setMsgs((p) => [...p, userMsg]);
      setInput("");
      setError(null);
      setIsLoading(true);
      try {
        const { answer, cards, chat_id } = await askQuestion(
          question,
          game,
          chatId ?? undefined,
          modelId || undefined,
        );
        // Si un nouveau chat a été créé côté backend, on le stocke
        if (chat_id && !chatId) {
          setChatId(chat_id);
        }
        const aiMsg: Message = {
          id: uid(),
          role: "assistant",
          content: answer,
          timestamp: new Date(),
          cards,
        };
        setMsgs((p) => [...p, aiMsg]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur inconnue");
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, game, chatId, modelId]
  );

  const submit = useCallback(
    () => sendQuestion(input.trim()),
    [input, sendQuestion]
  );

  const handleResend = useCallback(
    (content: string) => sendQuestion(content),
    [sendQuestion]
  );

  const handleEdit = useCallback(
    (id: string, newContent: string) => {
      setMsgs((prev) => {
        const idx = prev.findIndex((m) => m.id === id);
        if (idx === -1) return prev;
        return prev.slice(0, idx);
      });
      sendQuestion(newContent);
    },
    [sendQuestion]
  );

  // ── Load existing chat from history ──
  const loadChat = useCallback(async (id: string) => {
    try {
      const data = await fetchChat(id);
      setChatId(id);
      setGame(data.chat.game_id as GameId);

      const loaded: Message[] = data.messages.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        timestamp: new Date(m.created_at),
        cards: m.cards as any,
      }));
      setMsgs(loaded);
      setError(null);
    } catch (e) {
      setError("Impossible de charger la conversation.");
    }
  }, []);

  // ── New chat ──
  const newChat = useCallback(() => {
    setChatId(null);
    setMsgs([]);
    setError(null);
    setInput("");
  }, []);

  // ── Loading state ──
  if (loading) {
    return (
      <div className="app app-loading">
        <div className="app-loader" />
      </div>
    );
  }

  if (route === "callback") {
    return <AuthCallback />;
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="app">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeChatId={chatId}
        onSelectChat={loadChat}
        onNewChat={() => {
          newChat();
          setSidebarOpen(false);
        }}
      />

      <header className="app-header">
        <button
          className="header-menu-btn"
          onClick={() => setSidebarOpen(true)}
          aria-label="Ouvrir l'historique"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="header-logo">
          <h1 className="header-h1">Judge</h1>
          <span className="header-badge">AI</span>
        </div>
        <div className="header-spacer" />
        <button className="header-new-btn" onClick={newChat} title="Nouveau chat">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        <UserMenu />
      </header>

      <ChatWindow
        messages={msgs}
        isLoading={isLoading}
        emptyPlaceholder={currentGame.placeholder}
        gameName={currentGame.label}
        onResend={handleResend}
        onEdit={handleEdit}
      />

      {error && (
        <div className="app-error">
          <div className="app-error-inner">
            <span>⚠</span> {error}
          </div>
        </div>
      )}

      <InputBar
        value={input}
        onChange={setInput}
        onSubmit={submit}
        disabled={isLoading}
        placeholder={currentGame.placeholder}
        selectedGame={game}
        onGameChange={(id) => {
          setGame(id);
          setError(null);
        }}
        models={models}
        selectedModel={modelId}
        onModelChange={setModelId}
      />
    </div>
  );
}