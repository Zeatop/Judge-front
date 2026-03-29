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

  const sendQuestion = useCallback(async (question: string) => {
    if (!question.trim() || loading) return;
    const userMsg: Message = { id: uid(), role: "user", content: question, timestamp: new Date() };
    setMsgs(p => [...p, userMsg]);
    setInput(""); setError(null); setLoading(true);
    try {
      const { answer, cards } = await askQuestion(question, game);
      const aiMsg: Message = { id: uid(), role: "assistant", content: answer, timestamp: new Date(), cards };
      setMsgs(p => [...p, aiMsg]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [loading, game]);

  const submit = useCallback(() => sendQuestion(input.trim()), [input, sendQuestion]);

  const handleResend = useCallback((content: string) => {
    sendQuestion(content);
  }, [sendQuestion]);

  const handleEdit = useCallback((id: string, newContent: string) => {
    setMsgs(prev => {
      const idx = prev.findIndex(m => m.id === id);
      if (idx === -1) return prev;
      return prev.slice(0, idx);
    });
    sendQuestion(newContent);
  }, [sendQuestion]);

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
        onResend={handleResend}
        onEdit={handleEdit}
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