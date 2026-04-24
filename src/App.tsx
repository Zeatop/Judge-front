import { useState, useCallback, useEffect } from "react";
import type { GameId, ModelInfo } from "./api/client";
import {
  askQuestion, fetchChat, fetchModels,
  getGuestQuestionCount, incrementGuestQuestionCount, resetGuestQuestionCount,
} from "./api/client";
import { GAMES } from "./types";
import type { Message } from "./types";
import { ChatWindow } from "./components/Chatwindow";
import { InputBar } from "./components/Inputbar";
import { UserMenu } from "./components/Usermenu";
import { GuestButton } from "./components/Guestbutton";
import { Sidebar } from "./components/Sidebar";
import { useAuth, AuthCallback } from "./auth";
import { LoginPage } from "./auth/Loginpage";
import { createPortal } from "react-dom";
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

  // ── Login modal (mode invité) ──
  const [showLogin, setShowLogin] = useState(false);

  // ── Limite invité : max 2 questions avant de demander la connexion ──
  // Persisté en localStorage pour résister au refresh de page.
  const GUEST_MAX_QUESTIONS = 2;
  const [guestQuestionCount, setGuestQuestionCount] = useState(
    () => getGuestQuestionCount()
  );
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);

  // ── Models ──
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [modelId, setModelId] = useState<string>(
    () => localStorage.getItem(MODEL_STORAGE_KEY) ?? ""
  );

  const currentGame = GAMES.find((g) => g.id === game)!;

  // ── Fetch models (disponibles pour tous, pas besoin d'auth) ──
  useEffect(() => {
    fetchModels()
      .then((res) => {
        setModels(res.models);
        setModelId((prev) => {
          if (prev && res.models.some((m) => m.id === prev)) return prev;
          return res.default;
        });
      })
      .catch((e) => console.error("Failed to load models", e));
  }, []);

  // ── Persist model choice ──
  useEffect(() => {
    if (modelId) localStorage.setItem(MODEL_STORAGE_KEY, modelId);
  }, [modelId]);

  // ── Après connexion : fermer la modal et envoyer la question en attente ──
  useEffect(() => {
    if (!user) return;
    setShowLogin(false);
    // Réinitialiser le compteur guest
    resetGuestQuestionCount();
    setGuestQuestionCount(0);
    if (pendingQuestion) {
      const q = pendingQuestion;
      setPendingQuestion(null);
      setTimeout(() => sendQuestion(q), 100);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ── Send question ──
  const sendQuestion = useCallback(
    async (question: string) => {
      if (!question.trim() || isLoading) return;

      // Invité : bloquer à la (GUEST_MAX_QUESTIONS + 1)ème question
      if (!user && guestQuestionCount >= GUEST_MAX_QUESTIONS) {
        setPendingQuestion(question);
        setInput("");
        setShowLogin(true);
        return;
      }
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
        // session_id est injecté automatiquement dans askQuestion si pas de token
        const { answer, cards, chat_id } = await askQuestion(
          question,
          game,
          chatId ?? undefined,
          modelId || undefined,
        );
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
        // Incrémenter le compteur invité après une réponse réussie
        if (!user) {
          incrementGuestQuestionCount();
          setGuestQuestionCount(getGuestQuestionCount());
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur inconnue");
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, game, chatId, modelId, user, guestQuestionCount]
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

  if (route === "callback") return <AuthCallback />;

  // Limite invité atteinte → pleine page, le chat n'est plus dans le DOM
  if (!user && pendingQuestion) {
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
        isAuthenticated={!!user}
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
        {user
          ? <UserMenu />
          : <GuestButton onLogin={() => setShowLogin(true)} />
        }
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

      {/* Modal de connexion pour les invités */}
      {showLogin && createPortal(
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9990,
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowLogin(false); }}
        >
          <LoginPage onClose={() => setShowLogin(false)} />
        </div>,
        document.body
      )}
    </div>
  );
}