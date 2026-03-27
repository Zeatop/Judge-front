import { useState, useCallback } from "react";
import type { GameId } from "./api/client";
import { askQuestion } from "./api/client";
import { GAMES } from "./types";
import type { Message } from "./types";
import { ChatWindow } from "./components/Chatwindow";
import { InputBar } from "./components/Inputbar";
import "./App.css";

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function App() {
  const [selectedGame, setSelectedGame] = useState<GameId>("mtg");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentGame = GAMES.find((g) => g.id === selectedGame)!;

  const handleGameChange = useCallback((id: GameId) => {
    setSelectedGame(id);
    setError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    const question = input.trim();
    if (!question || isLoading) return;

    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content: question,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setError(null);
    setIsLoading(true);

    try {
      const answer = await askQuestion(question, selectedGame);
      const assistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: answer,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, selectedGame]);

  return (
    <div className="app">
      {/* Header — nom à gauche, pleine largeur */}
      <header className="app-header">
        <h1 className="header-h1">Judge</h1>
        <span className="header-badge">AI</span>
      </header>

      <ChatWindow
        messages={messages}
        isLoading={isLoading}
        emptyPlaceholder={currentGame.placeholder}
      />

      {error && (
        <div className="app-error" role="alert">
          <div className="app-error-inner">
            <span>⚠</span> Impossible de contacter le serveur : {error}
          </div>
        </div>
      )}

      <InputBar
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        disabled={isLoading}
        placeholder={currentGame.placeholder}
        selectedGame={selectedGame}
        onGameChange={handleGameChange}
      />
    </div>
  );
}