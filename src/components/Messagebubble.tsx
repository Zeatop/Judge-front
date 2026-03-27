import type { Message } from "../types";
import "./MessageBubble.css";

interface Props {
  message: Message;
}

function formatContent(text: string) {
  // Bold **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    // Line breaks
    return part.split("\n").map((line, j, arr) => (
      <span key={`${i}-${j}`}>
        {line}
        {j < arr.length - 1 && <br />}
      </span>
    ));
  });
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`bubble-wrapper ${isUser ? "user" : "assistant"}`}>
      {!isUser && (
        <div className="avatar" aria-hidden>
          ⚖️
        </div>
      )}
      <div className={`bubble ${isUser ? "bubble-user" : "bubble-assistant"}`}>
        <p className="bubble-text">{formatContent(message.content)}</p>
        <time className="bubble-time">
          {message.timestamp.toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </time>
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="bubble-wrapper assistant">
      <div className="avatar" aria-hidden>
        ⚖️
      </div>
      <div className="bubble bubble-assistant typing">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}