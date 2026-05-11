import { useState, useCallback, useEffect, useRef } from "react";
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
import { posthog } from "./lib/posthog";
import "./App.css";

const MODEL_STORAGE_KEY = "judge_ai_model";

/**
 * Clé localStorage pour la question qu'un guest a voulu envoyer juste avant
 * d'être bloqué par la limite de questions. Persistée pour survivre à la
 * redirection full-page d'OAuth ; consommée une fois le user connecté.
 */
const PENDING_Q_KEY = "judge_pending_question";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function useRoute(): "callback" | "app" {
  const path = window.location.pathname;
  if (path === "/auth/callback") return "callback";
  return "app";
}

export default function App() {
  const { user, loading, consumeMigratedChatId } = useAuth();
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

  // pendingQuestion hydratée depuis localStorage : si un guest a lancé
  // "se connecter" en ayant une question en attente, elle doit survivre
  // à la redirection OAuth.
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(
    () => localStorage.getItem(PENDING_Q_KEY)
  );
  useEffect(() => {
    if (pendingQuestion) localStorage.setItem(PENDING_Q_KEY, pendingQuestion);
    else localStorage.removeItem(PENDING_Q_KEY);
  }, [pendingQuestion]);

  // ── Models ──
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [modelId, setModelId] = useState<string>(
    () => localStorage.getItem(MODEL_STORAGE_KEY) ?? ""
  );

  // Track previous game/model to emit change events
  const prevGame = useRef<GameId>(game);
  const prevModel = useRef<string>(modelId);

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

  // ── Track game changes ──
  useEffect(() => {
    if (prevGame.current !== game) {
      posthog.capture("game_changed", {
        from_game: prevGame.current,
        to_game: game,
        is_guest: !user,
      });
      prevGame.current = game;
    }
  }, [game, user]);

  // ── Track model changes ──
  useEffect(() => {
    if (modelId && prevModel.current !== modelId) {
      posthog.capture("model_changed", {
        model_id: modelId,
        is_guest: !user,
      });
      prevModel.current = modelId;
    }
  }, [modelId, user]);

  // ── Load existing chat from history ──
  // Déclaré avant le useEffect qui l'utilise pour éviter les refs circulaires.
  const loadChat = useCallback(async (id: string) => {
    // Pas de try/catch ici : on laisse remonter les erreurs pour que les
    // appelants (sidebar, migration post-login) puissent réagir.
    const data = await fetchChat(id);
    setChatId(id);
    setGame(data.chat.game_id as GameId);

    const loaded: Message[] = data.messages.map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      timestamp: new Date(m.created_at),
      cards: m.cards as Message["cards"],
    }));
    setMsgs(loaded);
    setError(null);
  }, []);

  // ── Send question ──
  const sendQuestion = useCallback(
    async (question: string) => {
      if (!question.trim() || isLoading) return;

      // Invité : bloquer à la (GUEST_MAX_QUESTIONS + 1)ème question
      if (!user && guestQuestionCount >= GUEST_MAX_QUESTIONS) {
        posthog.capture("guest_limit_reached", {
          game_id: game,
          question_count: guestQuestionCount,
        });
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
        posthog.capture("question_asked", {
          game_id: game,
          model_id: modelId || null,
          chat_id: chat_id ?? chatId,
          is_guest: !user,
          cards_returned: cards.length,
        });
        // Incrémenter le compteur invité après une réponse réussie
        if (!user) {
          incrementGuestQuestionCount();
          setGuestQuestionCount(getGuestQuestionCount());
        }
      } catch (e) {
        posthog.capture("$exception", {
          $exception_message: e instanceof Error ? e.message : String(e),
          context: "question_asked",
          game_id: game,
        });
        setError(e instanceof Error ? e.message : "Erreur inconnue");
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, game, chatId, modelId, user, guestQuestionCount]
  );

  // ── Après connexion : restaurer le chat guest migré + renvoyer la Q en attente ──
  // Ce useEffect tourne à chaque changement de `user` (null → truthy après OAuth).
  useEffect(() => {
    if (!user) return;
    setShowLogin(false);
    resetGuestQuestionCount();
    setGuestQuestionCount(0);

    const migratedId = consumeMigratedChatId();

    const run = async () => {
      // 1. Restaurer la conversation guest (s'il y en avait une)
      if (migratedId) {
        try {
          await loadChat(migratedId);
        } catch (e) {
          // Chat introuvable (supprimé, migration partielle...) : on oublie
          console.warn("[App] Impossible de charger le chat migré:", e);
        }
      }

      // 2. Renvoyer la question qui était bloquée par la limite guest, s'il y en a une
      if (pendingQuestion) {
        const q = pendingQuestion;
        setPendingQuestion(null);
        // petit délai pour laisser React commit les setState de loadChat
        // (notamment setChatId), sinon sendQuestion partirait sans chat_id
        setTimeout(() => sendQuestion(q), 100);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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

  // ── Load chat from sidebar (avec gestion d'erreur pour l'UI) ──
  const loadChatFromSidebar = useCallback(
    async (id: string) => {
      try {
        await loadChat(id);
        posthog.capture("chat_loaded_from_history", { chat_id: id });
      } catch {
        setError("Impossible de charger la conversation.");
      }
    },
    [loadChat]
  );

  // ── New chat ──
  const newChat = useCallback(() => {
    if (chatId) {
      posthog.capture("new_chat_started", { previous_chat_id: chatId, game_id: game });
    }
    setChatId(null);
    setMsgs([]);
    setError(null);
    setInput("");
  }, [chatId, game]);

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
        onSelectChat={loadChatFromSidebar}
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
        gameId={game}
        gameName={currentGame.label}
        onResend={handleResend}
        onEdit={handleEdit}
        onSuggest={setInput}
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
