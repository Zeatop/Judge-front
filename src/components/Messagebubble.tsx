import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import type { Message, CardInfo } from "../types";
import "./Messagebubble.css";

/* ── Helper : position du preview carte (portal fixe, échappe les stacking contexts) ── */
function useCardPreview() {
  const [preview, setPreview] = useState<{ src: string; alt: string; x: number; y: number; above: boolean } | null>(null);

  const show = (e: React.MouseEvent, src: string, alt: string) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const above = r.top > window.innerHeight / 2;
    setPreview({ src, alt, x: r.left + r.width / 2, y: above ? r.top - 8 : r.bottom + 8, above });
  };

  const hide = () => setPreview(null);

  const portal = preview
    ? createPortal(
        // Outer div : centrage uniquement (pas d'animation sur ce transform)
        <div
          style={{
            position: "fixed",
            zIndex: 9999,
            left: preview.x,
            ...(preview.above ? { bottom: window.innerHeight - preview.y } : { top: preview.y }),
            transform: "translateX(-50%)",
            pointerEvents: "none",
          }}
        >
          {/* Inner div : animation opacity + scale sans conflit de transform */}
          <div className="card-preview-inner">
            <img src={preview.src} alt={preview.alt} className="card-preview-img" />
          </div>
        </div>,
        document.body
      )
    : null;

  return { show, hide, portal };
}

/* ── Lien carte dans les messages utilisateur (fetch lazy au hover) ── */
function UserCardLink({ name }: { name: string }) {
  const { show, hide, portal } = useCardPreview();
  const [data, setData] = useState<{ imageUrl: string; scryfallUrl: string } | null>(null);
  const fetchedRef = useRef(false);

  const handleMouseEnter = async (e: React.MouseEvent) => {
    if (fetchedRef.current) {
      if (data?.imageUrl) show(e, data.imageUrl, name);
      return;
    }
    fetchedRef.current = true;
    try {
      const res = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`);
      if (!res.ok) return;
      const card = await res.json();
      const imageUrl = card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal ?? "";
      const scryfallUrl = card.scryfall_uri ?? "";
      setData({ imageUrl, scryfallUrl });
      if (imageUrl) show(e, imageUrl, name);
    } catch { /* network error */ }
  };

  const href = data?.scryfallUrl || `https://scryfall.com/search?q="${encodeURIComponent(name)}"`;

  return (
    <span className="card-link-wrap" onMouseEnter={handleMouseEnter} onMouseLeave={hide}>
      <a className="card-link" href={href} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
        {name}
      </a>
      {portal}
    </span>
  );
}

/* ── Rendu des [[carte]] dans les messages utilisateur ── */
function renderUserContent(text: string): React.ReactNode[] {
  return text.split(/(\[\[[^\]]*\]\])/).map((part, i) => {
    const m = part.match(/^\[\[([^\]]*)\]\]$/);
    return m
      ? <UserCardLink key={i} name={m[1]} />
      : <span key={i}>{part}</span>;
  });
}

/* ── Card link avec preview au hover ── */
function CardLink({ card }: { card: CardInfo }) {
  const { show, hide, portal } = useCardPreview();

  return (
    <span
      className="card-link-wrap"
      onMouseEnter={e => card.image_url && show(e, card.image_url, card.name)}
      onMouseLeave={hide}
    >
      <a className="card-link" href={card.scryfall_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
        {card.name}
      </a>
      {portal}
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
  const allVariants = cards.flatMap(cardNameVariants);
  allVariants.sort((a, b) => b.name.length - a.name.length);

  type Token =
    | { t: "text"; v: string }
    | { t: "bold"; v: string }
    | { t: "card"; card: CardInfo }
    | { t: "cardlink"; name: string };

  const tokens: Token[] = [];
  let rem = text;

  while (rem.length > 0) {
    const boldMatch = rem.match(/\*\*([^*]+)\*\*/);
    const boldIdx = boldMatch ? rem.indexOf(boldMatch[0]) : -1;

    const cardlinkMatch = rem.match(/\[\[([^\]]*)\]\]/);
    const cardlinkIdx = cardlinkMatch ? rem.indexOf(cardlinkMatch[0]) : -1;

    let cardIdx = -1, cardCard: CardInfo | null = null, cardLen = 0;
    for (const variant of allVariants) {
      const idx = rem.toLowerCase().indexOf(variant.name.toLowerCase());
      if (idx !== -1 && (cardIdx === -1 || idx < cardIdx || (idx === cardIdx && variant.name.length > cardLen))) {
        cardIdx = idx; cardCard = variant.card; cardLen = variant.name.length;
      }
    }

    const hasBold = boldIdx !== -1;
    const hasCard = cardIdx !== -1;
    const hasCardlink = cardlinkIdx !== -1;

    if (!hasBold && !hasCard && !hasCardlink) { tokens.push({ t: "text", v: rem }); break; }

    let nextIdx = Infinity;
    if (hasBold) nextIdx = Math.min(nextIdx, boldIdx);
    if (hasCard) nextIdx = Math.min(nextIdx, cardIdx);
    if (hasCardlink) nextIdx = Math.min(nextIdx, cardlinkIdx);

    if (nextIdx > 0) tokens.push({ t: "text", v: rem.slice(0, nextIdx) });

    if (hasCardlink && cardlinkIdx === nextIdx) {
      tokens.push({ t: "cardlink", name: cardlinkMatch![1] });
      rem = rem.slice(cardlinkIdx + cardlinkMatch![0].length);
    } else if (hasBold && boldIdx === nextIdx) {
      tokens.push({ t: "bold", v: boldMatch![1] });
      rem = rem.slice(boldIdx + boldMatch![0].length);
    } else {
      tokens.push({ t: "card", card: cardCard! });
      rem = rem.slice(cardIdx + cardLen);
    }
  }

  return tokens.map((tok, i) => {
    if (tok.t === "bold") {
      const v = tok.v;
      // [[name]] imbriqué dans **...**
      const cl = v.match(/^\[\[([^\]]*)\]\]$/);
      if (cl) return <strong key={i}><UserCardLink name={cl[1]} /></strong>;
      // nom de carte exact imbriqué dans **...**
      const matched = allVariants.find(av => av.name.toLowerCase() === v.toLowerCase());
      if (matched) return <strong key={i}><CardLink card={matched.card} /></strong>;
      return <strong key={i}>{v}</strong>;
    }
    if (tok.t === "card") return <CardLink key={i} card={tok.card} />;
    if (tok.t === "cardlink") return <UserCardLink key={i} name={tok.name} />;
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
                ? <p className="md-p">{renderUserContent(message.content)}</p>
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
    </div>
  );
}