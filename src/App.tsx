import { useState, useCallback } from "react";
import type { GameId } from "./api/client";
import { askQuestion } from "./api/client";
import { GAMES } from "./types";
import type { Message } from "./types";
import { ChatWindow } from "./components/Chatwindow";
import { InputBar } from "./components/Inputbar";
import { UserMenu } from "./components/Usermenu";
import { useAuth, LoginPage, AuthCallback } from "./auth";
import "./App.css";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Simple client-side router based on pathname */
function useRoute(): "login" | "callback" | "chat" {
  const path = window.location.pathname;
  if (path === "/auth/callback") return "callback";
  return "chat"; // login guard is handled by auth state
}

export default function App() {
  const { user, loading } = useAuth();
  const route = useRoute();

  const [game, setGame] = useState<GameId>("mtg");
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentGame = GAMES.find((g) => g.id === game)!;

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
        const { answer, cards } = await askQuestion(question, game);
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
    [isLoading, game]
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

  // ── Loading state ──
  if (loading) {
    return (
      <div className="app app-loading">
        <div className="app-loader" />
      </div>
    );
  }

  // ── OAuth callback route ──
  if (route === "callback") {
    return <AuthCallback />;
  }

  // ── Not authenticated → Login page ──
  if (!user) {
    return <LoginPage />;
  }

  // ── Authenticated → Chat ──
  return (
    <div className="app">
      <header className="app-header">
        <div className="header-logo">
          <h1 className="header-h1">Judge</h1>
          <span className="header-badge">AI</span>
        </div>
        <div className="header-spacer" />
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
      />
    </div>
  );
}