import { useState, useCallback } from "react";
import type { GameId } from "./api/client";
import { askQuestion } from "./api/client";
import { GAMES } from "./types";
import type { Message } from "./types";
import { ChatWindow } from "./components/Chatwindow";
import { InputBar } from "./components/Inputbar";
import "./App.css";

function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2,7)}`; }

export default function App() {
  const [game, setGame]       = useState<GameId>("mtg");
  const [msgs, setMsgs]       = useState<Message[]>([]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const currentGame = GAMES.find(g => g.id === game)!;

  const submit = useCallback(async () => {
    const q = input.trim();
    if (!q || loading) return;
    const userMsg: Message = { id: uid(), role: "user", content: q, timestamp: new Date() };
    setMsgs(p => [...p, userMsg]);
    setInput(""); setError(null); setLoading(true);
    try {
      const answer = await askQuestion(q, game);
      const aiMsg: Message = { id: uid(), role: "assistant", content: answer, timestamp: new Date() };
      setMsgs(p => [...p, aiMsg]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [input, loading, game]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-logo">
          <h1 className="header-h1">Judge</h1>
          <span className="header-badge">AI</span>
        </div>
      </header>

      <ChatWindow
        messages={msgs}
        isLoading={loading}
        emptyPlaceholder={currentGame.placeholder}
        gameName={currentGame.label}
      />

      {error && (
        <div className="app-error">
          <div className="app-error-inner"><span>⚠</span> {error}</div>
        </div>
      )}

      <InputBar
        value={input}
        onChange={setInput}
        onSubmit={submit}
        disabled={loading}
        placeholder={currentGame.placeholder}
        selectedGame={game}
        onGameChange={id => { setGame(id); setError(null); }}
      />
    </div>
  );
}