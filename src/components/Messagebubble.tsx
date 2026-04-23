import { useState } from "react";
import type { Message, CardInfo } from "../types";
import "./Messagebubble.css";

/* ── Card link avec preview au hover ── */
function CardLink({ card }: { card: CardInfo }) {
  const [hovered, setHovered] = useState(false);
  const [imgPos, setImgPos] = useState<"above" | "below">("above");

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setImgPos(rect.top > 320 ? "above" : "below");
    setHovered(true);
  };

  return (
    <span className="card-link-wrap" onMouseEnter={handleMouseEnter} onMouseLeave={() => setHovered(false)}>
      <a className="card-link" href={card.scryfall_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
        {card.name}
      </a>
      {hovered && card.image_url && (
        <span className={`card-preview card-preview-${imgPos}`}>
          <img src={card.image_url} alt={card.name} />
        </span>
      )}
    </span>
  );
}

/* ── Inline renderer : gras + noms de cartes sur un segment de texte ── */

/** Génère les variantes de nom à chercher pour chaque carte.
 *  Ex: "Torbran, Thane of Red Fell" → ["Torbran, Thane of Red Fell", "Torbran"]
 *  On matche d'abord le nom complet, puis le nom court (avant la virgule). */
function cardNameVariants(card: CardInfo): { name: string; card: CardInfo }[] {
  const variants: { name: string; card: CardInfo }[] = [
    { name: card.name, card },
  ];
  // Nom court : partie avant la première virgule (si ≥ 4 chars pour éviter les faux positifs)
  const comma = card.name.indexOf(",");
  if (comma > 3) {
    variants.push({ name: card.name.slice(0, comma), card });
  }
  return variants;
}

function renderInline(text: string, cards: CardInfo[]): React.ReactNode[] {
  if (cards.length === 0) {
    return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**"))
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      return <span key={i}>{part}</span>;
    });
  }

  // Construire la liste de variantes, noms longs d'abord
  const allVariants = cards.flatMap(cardNameVariants);
  // Trier par longueur décroissante pour matcher le nom complet avant le court
  allVariants.sort((a, b) => b.name.length - a.name.length);

  // Tokenisation : on cherche le prochain token (gras ou nom de carte)
  type Token =
    | { t: "text"; v: string }
    | { t: "bold"; v: string }
    | { t: "card"; card: CardInfo };

  const tokens: Token[] = [];
  let rem = text;

  while (rem.length > 0) {
    // Chercher gras
    const boldMatch = rem.match(/\*\*([^*]+)\*\*/);
    const boldIdx = boldMatch ? rem.indexOf(boldMatch[0]) : -1;

    // Chercher le nom de carte le plus proche (variantes incluses)
    let cardIdx = -1, cardCard: CardInfo | null = null, cardLen = 0;
    for (const variant of allVariants) {
      const idx = rem.toLowerCase().indexOf(variant.name.toLowerCase());
      if (idx !== -1 && (cardIdx === -1 || idx < cardIdx || (idx === cardIdx && variant.name.length > cardLen))) {
        cardIdx = idx; cardCard = variant.card; cardLen = variant.name.length;
      }
    }

    // Quel token arrive en premier ?
    const hasBold = boldIdx !== -1;
    const hasCard = cardIdx !== -1;

    if (!hasBold && !hasCard) { tokens.push({ t: "text", v: rem }); break; }

    const nextIdx = hasBold && hasCard
      ? Math.min(boldIdx, cardIdx)
      : hasBold ? boldIdx : cardIdx;

    if (nextIdx > 0) tokens.push({ t: "text", v: rem.slice(0, nextIdx) });

    if (hasBold && (!hasCard || boldIdx <= cardIdx)) {
      tokens.push({ t: "bold", v: boldMatch![1] });
      rem = rem.slice(boldIdx + boldMatch![0].length);
    } else {
      tokens.push({ t: "card", card: cardCard! });
      rem = rem.slice(cardIdx + cardLen);
    }
  }

  return tokens.map((tok, i) => {
    if (tok.t === "bold") return <strong key={i}>{tok.v}</strong>;
    if (tok.t === "card") return <CardLink key={i} card={tok.card} />;
    return <span key={i}>{tok.v}</span>;
  });
}

/* ── Parser markdown ligne par ligne ── */
function renderMarkdown(text: string, cards: CardInfo[]): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Titres
    if (line.startsWith("### ")) {
      nodes.push(<h3 key={i} className="md-h3">{renderInline(line.slice(4), cards)}</h3>);
    } else if (line.startsWith("## ")) {
      nodes.push(<h2 key={i} className="md-h2">{renderInline(line.slice(3), cards)}</h2>);
    } else if (line.startsWith("# ")) {
      nodes.push(<h2 key={i} className="md-h2">{renderInline(line.slice(2), cards)}</h2>);
    }
    // Ligne vide
    else if (line.trim() === "") {
      nodes.push(<div key={i} className="md-spacer" />);
    }
    // Citation >
    else if (line.startsWith("> ")) {
      nodes.push(<blockquote key={i} className="md-blockquote">{renderInline(line.slice(2), cards)}</blockquote>);
    }
    // Liste -
    else if (line.match(/^[-*] /)) {
      // Collecter les items consécutifs
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[-*] /)) {
        items.push(lines[i].slice(2));
        i++;
      }
      nodes.push(
        <ul key={`ul-${i}`} className="md-ul">
          {items.map((item, j) => <li key={j}>{renderInline(item, cards)}</li>)}
        </ul>
      );
      continue;
    }
    // Paragraphe normal
    else {
      nodes.push(<p key={i} className="md-p">{renderInline(line, cards)}</p>);
    }
    i++;
  }

  return nodes;
}

/* ── MessageBubble ── */
interface BubbleProps {
  message: Message;
  onResend?: (content: string) => void;
  onEdit?: (id: string, content: string) => void;
}

export function MessageBubble({ message, onResend, onEdit }: BubbleProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(message.content);

  const copy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const confirmEdit = () => {
    if (editVal.trim() && onEdit) onEdit(message.id, editVal.trim());
    setEditing(false);
  };

  return (
    <div className={`bubble-wrapper ${isUser ? "user" : "assistant"}`}>
      {!isUser && <div className="avatar" aria-hidden><img src="/Judge.png" alt="Judge" width="32" height="32" /></div>}

      <div className="bubble-outer">
        {editing ? (
          <div className="bubble-edit-wrap">
            <textarea
              className="bubble-edit-textarea"
              value={editVal}
              onChange={e => setEditVal(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); confirmEdit(); }
                if (e.key === "Escape") setEditing(false);
              }}
              autoFocus
            />
            <div className="bubble-edit-actions">
              <button className="edit-cancel" onClick={() => { setEditing(false); setEditVal(message.content); }}>Annuler</button>
              <button className="edit-confirm" onClick={confirmEdit}>Envoyer</button>
            </div>
          </div>
        ) : (
          <div className={`bubble ${isUser ? "bubble-user" : "bubble-assistant"}`}>
            <div className="bubble-text">
              {isUser
                ? <p className="md-p">{renderInline(message.content, [])}</p>
                : renderMarkdown(message.content, message.cards ?? [])
              }
            </div>
            <time className="bubble-time">
              {message.timestamp.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </time>
          </div>
        )}

        {!editing && (
          <div className={`bubble-toolbar ${isUser ? "toolbar-user" : "toolbar-assistant"}`}>
            <button className="tb-btn" onClick={copy} title="Copier">
              {copied
                ? <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1.5 6l3.5 3.5L11 3" stroke="#00d2ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
              }
              <span>{copied ? "Copié !" : "Copier"}</span>
            </button>
            {isUser && onResend && (
              <button className="tb-btn" onClick={() => onResend(message.content)} title="Relancer">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>
                <span>Relancer</span>
              </button>
            )}
            {isUser && onEdit && (
              <button className="tb-btn" onClick={() => { setEditVal(message.content); setEditing(true); }} title="Éditer">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                <span>Éditer</span>
              </button>
            )}
            {!isUser && onResend && (
              <button className="tb-btn" onClick={() => onResend(message.content)} title="Relancer">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>
                <span>Relancer</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="bubble-wrapper assistant">
      <div className="avatar avatar-spinning" aria-hidden>
        <img src="/Judge.png" alt="Judge" width="32" height="32" />
      </div>
      <div className="bubble bubble-assistant typing">
        <span /><span /><span />
      </div>
    </div>
  );
}