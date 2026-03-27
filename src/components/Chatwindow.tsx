import { useEffect, useRef } from "react";
import type { Message } from "../types";
import { MessageBubble, TypingIndicator } from "./Messagebubble";
import "./ChatWindow.css";

interface Props {
  messages: Message[];
  isLoading: boolean;
  emptyPlaceholder: string;
}

export function ChatWindow({ messages, isLoading, emptyPlaceholder }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="chat-window" role="log" aria-live="polite" aria-label="Conversation">
      {messages.length === 0 && !isLoading ? (
        <div className="chat-empty">
          <div className="chat-empty-icon">📖</div>
          <p className="chat-empty-text">{emptyPlaceholder}</p>
        </div>
      ) : (
        <div className="chat-messages">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {isLoading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}