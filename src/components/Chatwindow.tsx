import { useEffect, useRef } from "react";
import type { Message } from "../types";
import { MessageBubble, TypingIndicator } from "./Messagebubble";
import { EmptyState } from "./EmptyState";
import "./Chatwindow.css";

interface Props {
  messages: Message[];
  isLoading: boolean;
  gameId: string;
  gameName: string;
  onResend: (content: string) => void;
  onEdit: (id: string, content: string) => void;
  onSuggest: (question: string) => void;
}

export function ChatWindow({ messages, isLoading, gameId, gameName, onResend, onEdit, onSuggest }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="chat-window" role="log" aria-live="polite">
      {messages.length === 0 && !isLoading ? (
        <EmptyState gameId={gameId} gameName={gameName} onSuggest={onSuggest} />
      ) : (
        <div className="chat-messages">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onResend={onResend}
              onEdit={onEdit}
            />
          ))}
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
